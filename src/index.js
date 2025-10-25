const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const started = require('electron-squirrel-startup');
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-rules', async (event, rules) => {
  await db.saveRules(rules);
});

ipcMain.handle('get-rules', async () => {
  return db.getRules();
});

ipcMain.handle('selecionar-pasta', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (filePaths.length > 0) {
    await db.addRecentPath(filePaths[0]);
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('get-folders', () => db.getFolders());

ipcMain.handle('add-folder', async (event, folder) => {
  try {
    const existingFolders = await db.getFolders();

    const normalizePath = path => path.trim().replace(/\\/g, '/');
    const parseOrRaw = str => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    const duplicate = existingFolders.some(f => {
      const fRule = parseOrRaw(f.rule || '{}');
      const fFrom = parseOrRaw(f.from || f.from);
      const fTo = parseOrRaw(f.to || f.to);

      return (
        normalizePath(fFrom) === normalizePath(folder.from) &&
        normalizePath(fTo) === normalizePath(folder.to) &&
        fRule.criteria === folder.rule.criteria &&
        fRule.value === folder.rule.value
      );
    });

    if (duplicate) {
      return { success: false, message: 'Já existe uma regra idêntica.' };
    }

    const newFolder = { id: uuidv4(), ...folder, monitoring: false };
    await db.addFolder(newFolder);

    return { success: true, folder: newFolder };
  } catch (error) {
    console.error('Erro ao adicionar pasta:', error);
    return { success: false, message: error.message || 'Erro desconhecido.' };
  }
});

ipcMain.handle('remove-folder', async (event, folderId) => {
  await monitor.stopMonitoring(folderId);
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

  await db.updateFolder(folderId, { monitoring: false });

  if (!result.success) {
    logger.warn(
      `Tentativa de parar monitoramento para ID ${folderId}, mas nenhum watcher estava ativo. O estado foi corrigido no banco de dados.`
    );
  }

  return { success: true, message: `Monitoramento para ID ${folderId} foi interrompido.` };
});

ipcMain.handle('get-history', () => db.getHistory());
ipcMain.handle('get-recent-paths', () => db.getRecentPaths());

ipcMain.handle('backup-database', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Salvar Backup do Banco de Dados',
    defaultPath: `filebot-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
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
    properties: ['openFile'],
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
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
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

function notifyHistoryUpdate(entry) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send('history-updated', entry);
  }
}

ipcMain.handle('import-folder-config', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Importar Configuração de Pasta',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (!filePaths || filePaths.length === 0) {
    return { success: false, message: 'Importação cancelada.' };
  }

  try {
    const content = await require('fs').promises.readFile(filePaths[0], 'utf-8');
    const folderConfig = JSON.parse(content);

    const existingFolders = await db.getFolders();

    const normalizePath = path => path.trim().replace(/\\/g, '/');
    const parseOrRaw = str => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    };

    const duplicate = existingFolders.some(f => {
      const fRule = parseOrRaw(f.rule || '{}');
      const fFrom = parseOrRaw(f.from || f.from);
      const fTo = parseOrRaw(f.to || f.to);

      return (
        normalizePath(fFrom) === normalizePath(folderConfig.from) &&
        normalizePath(fTo) === normalizePath(folderConfig.to) &&
        fRule.criteria === folderConfig.rule.criteria &&
        fRule.value === folderConfig.rule.value
      );
    });

    if (duplicate) {
      return { success: false, message: `A configuração "${folderConfig.name}" já existe.` };
    }

    const newFolder = { ...folderConfig, id: uuidv4(), monitoring: false };
    await db.addFolder(newFolder);

    return { success: true, folder: newFolder };
  } catch (error) {
    logger.error('Erro ao importar configuração da pasta:', error);
    return { success: false, message: error.message };
  }
});
