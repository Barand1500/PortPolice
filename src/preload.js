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
  onProjectStopped: (cb) => ipcRenderer.on('project-stopped', (e, id, code, errMsg) => cb(id, code, errMsg)),
  onProjectError: (cb) => ipcRenderer.on('project-error', (e, id, msg) => cb(id, msg)),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // New features
  checkSinglePort: (port) => ipcRenderer.invoke('check-single-port', port),
  scanPortRange: (start, end) => ipcRenderer.invoke('scan-port-range', start, end),
  scanRemoteHost: (host, start, end) => ipcRenderer.invoke('scan-remote-host', host, start, end),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getNetworkTraffic: () => ipcRenderer.invoke('get-network-traffic'),
  getKnownPortInfo: (port) => ipcRenderer.invoke('get-known-port-info', port),

  // Port Forwarding
  addPortForwarding: (lp, addr, cp) => ipcRenderer.invoke('add-port-forwarding', lp, addr, cp),
  removePortForwarding: (lp) => ipcRenderer.invoke('remove-port-forwarding', lp),
  listPortForwarding: () => ipcRenderer.invoke('list-port-forwarding'),

  // Watchlist
  getWatchlist: () => ipcRenderer.invoke('get-watchlist'),
  addToWatchlist: (entry) => ipcRenderer.invoke('add-to-watchlist', entry),
  removeFromWatchlist: (port, proto) => ipcRenderer.invoke('remove-from-watchlist', port, proto),

  // Thresholds
  getThresholds: () => ipcRenderer.invoke('get-thresholds'),
  setThresholds: (t) => ipcRenderer.invoke('set-thresholds', t),

  // Export
  exportData: (data, format) => ipcRenderer.invoke('export-data', data, format),
});
