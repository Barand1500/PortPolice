const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { scanPorts, killProcess, killPort, getProcessDetail } = require('./port-scanner');

let mainWindow;
const runningProjects = new Map(); // key: id, value: { process, folder, port, command, startTime }

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a1a',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC Handlers ───

ipcMain.handle('scan-ports', async () => {
  try {
    return { success: true, data: await scanPorts() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kill-process', async (event, pid, port) => {
  try {
    const safePid = parseInt(pid);
    const safePort = parseInt(port);
    if (isNaN(safePid) || safePid <= 0) {
      return { success: false, error: 'Invalid PID' };
    }

    // If port is provided, use port-based kill (kills ALL processes on that port)
    if (safePort && safePort > 0) {
      const result = await killPort(safePort, safePid);
      return { 
        success: true, 
        data: result,
        portFreed: result.portFreed,
        killedPids: result.killed,
        failedPids: result.failed
      };
    }

    // Fallback: simple PID kill
    const result = await killProcess(safePid);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-process-detail', async (event, pid) => {
  try {
    const safePid = parseInt(pid);
    if (isNaN(safePid) || safePid <= 0) {
      return { success: false, error: 'Invalid PID' };
    }
    const detail = await getProcessDetail(safePid);
    return { success: true, data: detail };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// ─── Quick Launch IPC ───

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Folder'
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('launch-project', async (event, { folder, port, command }) => {
  try {
    if (!folder || !command) {
      return { success: false, error: 'Folder and command are required' };
    }

    // Validate folder path (basic traversal prevention)
    const resolvedFolder = path.resolve(folder);

    // Parse command to validate the base command
    const parts = command.split(/\s+/);
    const cmd = parts[0];

    // Whitelist allowed commands
    const allowedCommands = ['npm', 'npx', 'yarn', 'pnpm', 'node', 'python', 'py', 'pip'];
    if (!allowedCommands.includes(cmd.toLowerCase())) {
      return { success: false, error: `Command "${cmd}" is not allowed. Allowed: ${allowedCommands.join(', ')}` };
    }

    // Check if package.json exists for npm/yarn/pnpm projects (warning only)
    const fs = require('fs');
    let hasPackageJson = true;
    if (['npm', 'yarn', 'pnpm'].includes(cmd.toLowerCase())) {
      const pkgPath = path.join(resolvedFolder, 'package.json');
      hasPackageJson = fs.existsSync(pkgPath);
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const env = { ...process.env };
    const safePort = port ? parseInt(port) : null;

    // Build the actual command with port injection
    let finalCommand = command;
    if (safePort) {
      env.PORT = String(safePort);
      // Inject port flag based on command type for frameworks that ignore PORT env
      if (command.includes('vite') || command === 'npm run dev' || command === 'yarn dev' || command === 'pnpm dev') {
        // Vite-based: add --port flag
        if (!command.includes('--port')) {
          finalCommand = `${command} -- --port ${safePort}`;
        }
      } else if (command.includes('next')) {
        // Next.js: add -p flag
        if (!command.includes('-p ')) {
          finalCommand = `${command} -p ${safePort}`;
        }
      }
    }

    // On Windows, use cmd.exe /c to properly run npm/npx/yarn commands
    // This ensures .cmd extensions are resolved and the process stays alive
    const child = spawn('cmd.exe', ['/c', finalCommand], {
      cwd: resolvedFolder,
      env,
      shell: false,
      windowsHide: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true
    });

    // Collect output logs for debugging
    let outputLog = '';
    let errorLog = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      outputLog += text;
      // Keep only last 2000 chars
      if (outputLog.length > 2000) outputLog = outputLog.slice(-2000);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorLog += text;
      if (errorLog.length > 2000) errorLog = errorLog.slice(-2000);
    });

    const projectInfo = {
      id,
      pid: child.pid,
      folder: resolvedFolder,
      folderName: path.basename(resolvedFolder),
      port: safePort,
      command: finalCommand,
      startTime: new Date().toLocaleTimeString(),
      status: 'running',
      hasPackageJson
    };

    child.on('exit', (code) => {
      const proj = runningProjects.get(id);
      if (proj) {
        proj.status = 'stopped';
        proj.exitCode = code;
        proj.outputLog = outputLog;
        proj.errorLog = errorLog;
      }
      // Notify renderer with exit details
      if (mainWindow && !mainWindow.isDestroyed()) {
        const errMsg = code !== 0 ? (errorLog.trim().split('\n').pop() || `Exit code: ${code}`) : null;
        mainWindow.webContents.send('project-stopped', id, code, errMsg);
      }
    });

    child.on('error', (err) => {
      const proj = runningProjects.get(id);
      if (proj) {
        proj.status = 'error';
        proj.error = err.message;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('project-error', id, err.message);
      }
    });

    runningProjects.set(id, { ...projectInfo, process: child, outputLog: '', errorLog: '' });

    return { success: true, data: projectInfo };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-project', async (event, id) => {
  const proj = runningProjects.get(id);
  if (!proj || !proj.process) {
    return { success: false, error: 'Project not found' };
  }
  try {
    // Kill the process tree on Windows
    const { execFile } = require('child_process');
    execFile('taskkill', ['/PID', String(proj.process.pid), '/T', '/F'], { windowsHide: true }, () => {});
    proj.status = 'stopped';
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-running-projects', () => {
  const list = [];
  for (const [id, proj] of runningProjects) {
    list.push({
      id,
      pid: proj.pid,
      folder: proj.folder,
      folderName: proj.folderName,
      port: proj.port,
      command: proj.command,
      startTime: proj.startTime,
      status: proj.status
    });
  }
  return list;
});

// Clean up all child processes on app quit
app.on('before-quit', () => {
  for (const [, proj] of runningProjects) {
    if (proj.process && proj.status === 'running') {
      try {
        const { execFile } = require('child_process');
        execFile('taskkill', ['/PID', String(proj.process.pid), '/T', '/F'], { windowsHide: true }, () => {});
      } catch {}
    }
  }
});
