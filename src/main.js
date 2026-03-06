const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { scanPorts, killProcess, killPort, getProcessDetail } = require('./port-scanner');

let mainWindow;

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
