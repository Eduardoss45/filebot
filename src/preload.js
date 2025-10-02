const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Funções existentes
  obterFormatos: () => ipcRenderer.invoke("obter-formatos"),
  obterPastas: () => ipcRenderer.invoke("obter-pastas"),
  selecionarPasta: () => ipcRenderer.invoke("selecionar-pasta"),
  salvarPasta: (nome, caminho) =>
    ipcRenderer.invoke("salvar-pasta", nome, caminho),

  // Novas funções do backend
  organizarAutomaticamente: (args) =>
    ipcRenderer.invoke("organizar-automaticamente", args),
  reverterMovimentacao: (args) =>
    ipcRenderer.invoke("reverter-movimentacao", args),
});