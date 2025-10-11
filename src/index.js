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

  // Automatically restart monitoring for folders that were active on last close.
  try {
    const foldersToMonitor = await db.getFolders();
    const activeFolders = foldersToMonitor.filter(f => f.monitoring);
    if (activeFolders.length > 0) {
      logger.info(`Restaurando monitoramento para ${activeFolders.length} pasta(s)...`);
      activeFolders.forEach(folder => {
        monitor.startMonitoring(folder);
      });
    }
  } catch (error) {
    logger.error('Erro ao restaurar o estado de monitoramento:', error);
  }

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
  if (filePaths.length > 0) {
    await db.addRecentPath(filePaths[0]);
    return filePaths[0];
  }
  return null;
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
    // Always update the database to ensure the state is correct, even if no watcher was active.
    await db.updateFolder(folderId, { monitoring: false });

    if (!result.success) {
        // Log that no watcher was found, but don't treat it as a client-side error.
        logger.warn(`Tentativa de parar monitoramento para ID ${folderId}, mas nenhum watcher estava ativo. O estado foi corrigido no banco de dados.`);
    }
    // Return success because the desired state (stopped) is now correctly reflected in the database.
    return { success: true, message: `Monitoramento para ID ${folderId} foi interrompido.` };
});

ipcMain.handle('get-history', () => db.getHistory());
ipcMain.handle('get-recent-paths', () => db.getRecentPaths());

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

ipcMain.handle('export-folder-config', async (event, folderId) => {
    const folder = await db.getFolderById(folderId);
    if (!folder) {
        return { success: false, message: 'Pasta não encontrada.' };
    }

    const { filePath } = await dialog.showSaveDialog({
        title: 'Salvar Configuração da Pasta',
        defaultPath: `filebot-folder-${folder.name}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
        try {
            await require('fs').promises.writeFile(filePath, JSON.stringify(folder, null, 2));
            return { success: true, path: filePath };
        } catch (error) {
            logger.error('Erro ao exportar configuração da pasta:', error);
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'Exportação cancelada.' };
});

ipcMain.handle('import-folder-config', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Importar Configuração de Pasta',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        try {
            const content = await require('fs').promises.readFile(filePaths[0], 'utf-8');
            const folderConfig = JSON.parse(content);
            
            // Generate a new ID and ensure monitoring is off by default
            const newFolder = { ...folderConfig, id: uuidv4(), monitoring: false };
            
            await db.addFolder(newFolder);
            return { success: true, folder: newFolder };
        } catch (error) {
            logger.error('Erro ao importar configuração da pasta:', error);
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'Importação cancelada.' };
});