const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  saveFile: (filePath, data) => ipcRenderer.send('save-file', { filePath, data }),
  readBackup: (filePath) => ipcRenderer.sendSync('read-backup', filePath),
  onOpenBackup: (callback) => ipcRenderer.on('open-backup', (event, filePath) => callback(filePath)),
  onExportAll: (callback) => ipcRenderer.on('export-all-data', (event, filePath) => callback(filePath))
});
