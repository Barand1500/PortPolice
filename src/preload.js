const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portPolice', {
  scanPorts: () => ipcRenderer.invoke('scan-ports'),
  killProcess: (pid, port) => ipcRenderer.invoke('kill-process', pid, port),
  getProcessDetail: (pid) => ipcRenderer.invoke('get-process-detail', pid),
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
