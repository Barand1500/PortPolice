const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  scanPorts, killProcess, killPort, getProcessDetail,
  checkSinglePort, scanPortRange, scanRemoteHost,
  getSystemStats, getNetworkTraffic,
  getKnownPortInfo, KNOWN_PORTS, SUSPICIOUS_PORTS,
  addPortForwarding, removePortForwarding, listPortForwarding
} = require('./port-scanner');

let mainWindow;
let splashWindow;
const runningProjects = new Map();

// Watchlist & Threshold storage
const WATCHLIST_FILE = path.join(app.getPath('userData'), 'watchlist.json');
const THRESHOLD_FILE = path.join(app.getPath('userData'), 'thresholds.json');
let previousPorts = [];

function loadJsonFile(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {}
  return fallback;
}
function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, '..', 'ui', 'splash.html'));
  splashWindow.center();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    frame: false,
    transparent: false,
    show: false,
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

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      mainWindow.show();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
    }, 1800);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC Handlers ───

ipcMain.handle('scan-ports', async () => {
  try {
    const data = await scanPorts();
    // Port change detection
    const changes = detectPortChanges(previousPorts, data);
    previousPorts = data;
    return { success: true, data, changes };
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

// ─── New Feature IPC Handlers ───

// Quick port check
ipcMain.handle('check-single-port', async (event, port) => {
  try {
    const result = await checkSinglePort(port);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Port range scan
ipcMain.handle('scan-port-range', async (event, startPort, endPort) => {
  try {
    const data = await scanPortRange(startPort, endPort);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Remote host scan
ipcMain.handle('scan-remote-host', async (event, host, startPort, endPort) => {
  try {
    const data = await scanRemoteHost(host, startPort, endPort);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// System stats
ipcMain.handle('get-system-stats', async () => {
  try {
    const data = await getSystemStats();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Network traffic
ipcMain.handle('get-network-traffic', async () => {
  try {
    const data = await getNetworkTraffic();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Known port info
ipcMain.handle('get-known-port-info', async (event, port) => {
  try {
    const data = getKnownPortInfo(port);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Port forwarding
ipcMain.handle('add-port-forwarding', async (event, listenPort, connectAddress, connectPort) => {
  try {
    const result = await addPortForwarding(listenPort, connectAddress, connectPort);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('remove-port-forwarding', async (event, listenPort) => {
  try {
    const result = await removePortForwarding(listenPort);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('list-port-forwarding', async () => {
  try {
    const data = await listPortForwarding();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Watchlist
ipcMain.handle('get-watchlist', () => {
  return loadJsonFile(WATCHLIST_FILE, []);
});

ipcMain.handle('add-to-watchlist', (event, portEntry) => {
  const list = loadJsonFile(WATCHLIST_FILE, []);
  const exists = list.some(w => w.port === portEntry.port && w.proto === portEntry.proto);
  if (!exists) {
    list.push({ ...portEntry, addedAt: Date.now() });
    saveJsonFile(WATCHLIST_FILE, list);
  }
  return list;
});

ipcMain.handle('remove-from-watchlist', (event, port, proto) => {
  let list = loadJsonFile(WATCHLIST_FILE, []);
  list = list.filter(w => !(w.port === port && w.proto === proto));
  saveJsonFile(WATCHLIST_FILE, list);
  return list;
});

// Thresholds
ipcMain.handle('get-thresholds', () => {
  return loadJsonFile(THRESHOLD_FILE, { cpu: 90, memory: 90 });
});

ipcMain.handle('set-thresholds', (event, thresholds) => {
  saveJsonFile(THRESHOLD_FILE, thresholds);
  return thresholds;
});

// Export data
ipcMain.handle('export-data', async (event, data, format) => {
  try {
    const ext = format === 'json' ? 'json' : 'csv';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Export as ${ext.toUpperCase()}`,
      defaultPath: `portpolice-export-${Date.now()}.${ext}`,
      filters: [{ name: `${ext.toUpperCase()} Files`, extensions: [ext] }]
    });
    if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' };

    let content;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      const headers = ['Protocol', 'Port', 'Address', 'Foreign Address', 'PID', 'Process', 'Status', 'Category'];
      const rows = data.map(p => [
        p.proto, p.port, p.localAddress, p.foreignAddress, p.pid, p.processName, p.state, p.appCategory || ''
      ]);
      content = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    }

    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Port change detection
function detectPortChanges(oldPorts, newPorts) {
  if (!oldPorts || oldPorts.length === 0) return { opened: [], closed: [] };

  const oldSet = new Map(oldPorts.map(p => [`${p.proto}-${p.port}-${p.pid}`, p]));
  const newSet = new Map(newPorts.map(p => [`${p.proto}-${p.port}-${p.pid}`, p]));

  const opened = [];
  const closed = [];

  for (const [key, p] of newSet) {
    if (!oldSet.has(key)) opened.push(p);
  }
  for (const [key, p] of oldSet) {
    if (!newSet.has(key)) closed.push(p);
  }

  return { opened, closed };
}

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
