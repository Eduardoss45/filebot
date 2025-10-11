const chokidar = require('chokidar');
const logger = require('./logger');
const { moverArquivo } = require('./file-handler');
const path = require('path');

const activeWatchers = new Map();
const MAX_WATCHERS = 5;

const formatDate = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const deveMoverArquivo = (file, stats, rule) => {
  const { criteria, value } = rule;
  switch (criteria) {
    case "extension":
      return value.includes(path.extname(file));
    case "creationDate":
      return formatDate(stats.birthtime) === value;
    case "modificationDate":
      return formatDate(stats.mtime) === value;
    case "pattern":
      const regExr = new RegExp(value);
      return regExr.test(path.basename(file));
    default:
      return false;
  }
};

const startMonitoring = (folder) => {
  if (activeWatchers.size >= MAX_WATCHERS) {
    logger.warn('Número máximo de pastas monitoradas atingido.');
    return { success: false, message: 'Número máximo de pastas monitoradas atingido.' };
  }

  if (activeWatchers.has(folder.id)) {
    logger.warn(`O monitoramento para a pasta ${folder.from} já está ativo.`);
    return { success: false, message: `O monitoramento para a pasta ${folder.from} já está ativo.` };
  }

  const watcher = chokidar.watch(folder.from, {
    persistent: true,
    ignored: folder.ignore || [],
  });

  watcher.on('add', async (filePath) => {
    try {
      const stats = await require('fs').promises.stat(filePath);
      if (deveMoverArquivo(filePath, stats, folder.rule)) {
        await moverArquivo(filePath, folder.to, folder.id); // Pass folder.id
      }
    } catch (err) {
      logger.error(`🚨 Erro ao processar o arquivo ${filePath}: ${err}`);
    }
  });

  watcher.on('error', (error) => {
    logger.error(`Erro no watcher para a pasta ${folder.from}: ${error}`);
  });

  activeWatchers.set(folder.id, watcher);
  logger.info(`Iniciando monitoramento para a pasta: ${folder.from}`);
  return { success: true, message: `Monitoramento iniciado para a pasta: ${folder.from}` };
};

const stopMonitoring = (folderId) => {
  const watcher = activeWatchers.get(folderId);
  if (watcher) {
    watcher.close();
    activeWatchers.delete(folderId);
    logger.info(`Monitoramento da pasta com ID ${folderId} foi interrompido.`);
    return { success: true, message: `Monitoramento da pasta com ID ${folderId} foi interrompido.` };
  } else {
    logger.warn(`Nenhum watcher ativo encontrado para a pasta com ID ${folderId}.`);
    return { success: false, message: `Nenhum watcher ativo encontrado para a pasta com ID ${folderId}.` };
  }
};

module.exports = {
  startMonitoring,
  stopMonitoring,
};
