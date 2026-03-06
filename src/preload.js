const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portPolice', {
  scanPorts: () => ipcRenderer.invoke('scan-ports'),
  killProcess: (pid, port) => ipcRenderer.invoke('kill-process', pid, port),
  getProcessDetail: (pid) => ipcRenderer.invoke('get-process-detail', pid),
  
  // Quick Launch
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  launchProject: (data) => ipcRenderer.invoke('launch-project', data),
  stopProject: (id) => ipcRenderer.invoke('stop-project', id),
  getRunningProjects: () => ipcRenderer.invoke('get-running-projects'),
  onProjectStopped: (cb) => ipcRenderer.on('project-stopped', (e, id, code) => cb(id, code)),
  onProjectError: (cb) => ipcRenderer.on('project-error', (e, id, msg) => cb(id, msg)),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
