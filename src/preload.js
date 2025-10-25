const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selecionarPasta: () => ipcRenderer.invoke('selecionar-pasta'),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  addFolder: folder => ipcRenderer.invoke('add-folder', folder),
  removeFolder: folderId => ipcRenderer.invoke('remove-folder', folderId),
  updateFolder: folder => ipcRenderer.invoke('update-folder', folder),
  startMonitoring: folder => ipcRenderer.invoke('start-monitoring', folder),
  stopMonitoring: folderId => ipcRenderer.invoke('stop-monitoring', folderId),
  getActionHistory: () => ipcRenderer.invoke('get-action-history'),
  revertAction: actionId => ipcRenderer.invoke('revert-action', actionId),
  getActionById: actionId => ipcRenderer.invoke('get-action-by-id', actionId),
  getRules: () => ipcRenderer.invoke('get-rules'),
  saveRule: rule => ipcRenderer.invoke('save-rule', rule),
  onLogMessage: callback => ipcRenderer.on('log-message', (_event, value) => callback(value)),
  getRecentPaths: () => ipcRenderer.invoke('get-recent-paths'),
  importFolderConfig: () => ipcRenderer.invoke('import-folder-config'),
  exportFolderConfig: folderId => ipcRenderer.invoke('export-folder-config', folderId),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  onHistoryUpdated: callback => ipcRenderer.on('history-updated', (_, entry) => callback(entry)),
});
