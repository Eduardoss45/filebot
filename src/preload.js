const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selecionarPasta: () => ipcRenderer.invoke("selecionar-pasta"),
  getFolders: () => ipcRenderer.invoke("get-folders"),
  addFolder: (folder) => ipcRenderer.invoke("add-folder", folder),
  removeFolder: (folderId) => ipcRenderer.invoke("remove-folder", folderId),
  updateFolder: (folder) => ipcRenderer.invoke("update-folder", folder),
  startMonitoring: (folder) => ipcRenderer.invoke("start-monitoring", folder),
  stopMonitoring: (folderId) => ipcRenderer.invoke("stop-monitoring", folderId),
  getHistory: () => ipcRenderer.invoke('get-history'),
  getRules: () => ipcRenderer.invoke("get-rules"),
  saveRule: (rule) => ipcRenderer.invoke("save-rule", rule),
  onLogMessage: (callback) => ipcRenderer.on('log-message', (_event, value) => callback(value)),
  getRecentPaths: () => ipcRenderer.invoke('get-recent-paths'),
  importFolderConfig: () => ipcRenderer.invoke('import-folder-config'),
  exportFolderConfig: (folderId) => ipcRenderer.invoke('export-folder-config', folderId),
});
