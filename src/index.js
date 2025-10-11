const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const started = require("electron-squirrel-startup");
const { v4: uuidv4 } = require('uuid');

const { logger, setMainWindow } = require('./utils/logger');
const db = require('./utils/database');
const monitor = require('./utils/monitor');

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "frontend", "index.html"));
  setMainWindow(mainWindow);
  mainWindow.webContents.openDevTools();
};

app.whenReady().then(async () => {
  try {
    await db.initializeDatabase();
    logger.info('Banco de dados inicializado com sucesso.');
  } catch (error) {
    logger.error('Falha ao inicializar o banco de dados. O aplicativo será encerrado.', error);
    app.quit();
    return;
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle("selecionar-pasta", async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle('get-folders', () => db.getFolders());

ipcMain.handle('add-folder', async (event, folder) => {
  const newFolder = { id: uuidv4(), ...folder, monitoring: false };
  await db.addFolder(newFolder);
  return newFolder;
});

ipcMain.handle('remove-folder', async (event, folderId) => {
  await monitor.stopMonitoring(folderId); // Ensure monitoring is stopped before deleting
  return db.removeFolder(folderId);
});

ipcMain.handle('update-folder', async (event, { id, updates }) => {
    return db.updateFolder(id, updates);
});

ipcMain.handle('start-monitoring', async (event, folderId) => {
    const folder = await db.getFolderById(folderId);
    if (!folder) {
        return { success: false, message: 'Pasta não encontrada.' };
    }
    const result = monitor.startMonitoring(folder);
    if (result.success) {
        await db.updateFolder(folderId, { monitoring: true });
    }
    return result;
});

ipcMain.handle('stop-monitoring', async (event, folderId) => {
    const result = monitor.stopMonitoring(folderId);
    if (result.success) {
        await db.updateFolder(folderId, { monitoring: false });
    }
    return result;
});

ipcMain.handle('get-history', () => db.getHistory());

ipcMain.handle('backup-database', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Salvar Backup do Banco de Dados',
        defaultPath: `filebot-backup-${Date.now()}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
        return db.backupDatabase(filePath);
    }
    return { success: false, message: 'Backup cancelado.' };
});

ipcMain.handle('restore-database', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Restaurar Backup do Banco de Dados',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        return db.restoreDatabase(filePaths[0]);
    }
    return { success: false, message: 'Restauração cancelada.' };
});