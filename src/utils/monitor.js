const chokidar = require('chokidar');
const { logger } = require('./logger');
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
  const fileExtension = path.extname(file);

  switch (criteria) {
    case "extension":
      // Normalize extensions to ensure they start with a dot, making matching more robust.
      const extensions = value.split(',').map(ext => {
        const trimmedExt = ext.trim();
        return trimmedExt.startsWith('.') ? trimmedExt : `.${trimmedExt}`;
      });
      
      // Detailed logging for debugging the extension matching.
      logger.info(`[Debug] Verificando arquivo: ${file}`);
      logger.info(`[Debug] Extensão do arquivo: "${fileExtension}"`);
      logger.info(`[Debug] Regra de extensões: ${JSON.stringify(extensions)}`);
      
      const isMatch = extensions.includes(fileExtension);
      logger.info(`[Debug] Correspondeu? ${isMatch}`);
      
      return isMatch;
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
  // Check if the maximum number of watchers has been reached.
  if (activeWatchers.size >= MAX_WATCHERS) {
    logger.warn('Número máximo de pastas monitoradas atingido.');
    return { success: false, message: 'Número máximo de pastas monitoradas atingido.' };
  }

  // Check if a watcher for this folder is already active.
  if (activeWatchers.has(folder.id)) {
    logger.warn(`O monitoramento para a pasta ${folder.from} já está ativo.`);
    return { success: false, message: `O monitoramento para a pasta ${folder.from} já está ativo.` };
  }

  // Create a new chokidar watcher for the folder.
  const watcher = chokidar.watch(folder.from, {
    persistent: true,
    ignored: folder.ignore || [],
  });

  // When a new file is added to the folder, process it.
  watcher.on('add', async (filePath) => {
    logger.info(`Item detectado: ${filePath}`);
    try {
      const stats = await require('fs').promises.stat(filePath);
      // Ensure we only process files, not directories.
      if (stats.isFile()) {
        if (deveMoverArquivo(filePath, stats, folder.rule)) {
          logger.info(`✅ Arquivo "${path.basename(filePath)}" corresponde à regra. Movendo...`);
          await moverArquivo(filePath, folder.to, folder.id);
        } else {
          logger.info(`❌ Arquivo "${path.basename(filePath)}" não corresponde à regra.`);
        }
      } else {
        logger.info(`⏭️ Ignorando diretório: "${path.basename(filePath)}"`);
      }
    } catch (err) {
      // Ignore errors for files that might have been deleted between detection and processing.
      if (err.code !== 'ENOENT') {
        logger.error(`🚨 Erro ao processar o item ${filePath}: ${err}`);
      }
    }
  });

  // Log any errors that occur with the watcher.
  watcher.on('error', (error) => {
    logger.error(`Erro no watcher para a pasta ${folder.from}: ${error}`);
  });

  // Add the watcher to the map of active watchers and log that monitoring has started.
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
