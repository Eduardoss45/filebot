const chokidar = require('chokidar');
const { logger } = require('./logger');
const { moveFile } = require('./file-handler');
const path = require('path');
const fs = require('fs');

const activeWatchers = new Map();
const MAX_WATCHERS = 5;

const formatDate = date => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}/${d.getFullYear()}`;
};

const mustMoveFile = (file, stats, rule) => {
  const { criteria, value } = rule;
  const fileExtension = path.extname(file);

  switch (criteria) {
    case 'extension':
      const extensions = value.split(',').map(ext => {
        const trimmedExt = ext.trim();
        return trimmedExt.startsWith('.') ? trimmedExt : `.${trimmedExt}`;
      });

      logger.info(`[Debug] Verificando arquivo: ${file}`);
      logger.info(`[Debug] Extensão do arquivo: "${fileExtension}"`);
      logger.info(`[Debug] Regra de extensões: ${JSON.stringify(extensions)}`);

      const isMatch = extensions.includes(fileExtension);
      logger.info(`[Debug] Correspondeu? ${isMatch}`);

      return isMatch;
    case 'creationDate':
      return formatDate(stats.birthtime) === value;
    case 'modificationDate':
      return formatDate(stats.mtime) === value;
    case 'pattern':
      const regex = new RegExp(value);
      return regex.test(path.basename(file));
    default:
      return false;
  }
};

const startMonitoring = folder => {
  if (activeWatchers.size >= MAX_WATCHERS) {
    logger.warn('Número máximo de pastas monitoradas atingido.');
    return { success: false, message: 'Número máximo de pastas monitoradas atingido.' };
  }

  if (activeWatchers.has(folder.id)) {
    logger.warn(`O monitoramento para a pasta ${folder.from} já está ativo.`);
    return {
      success: false,
      message: `O monitoramento para a pasta ${folder.from} já está ativo.`,
    };
  }

  const watcher = chokidar.watch(folder.from, {
    persistent: true,
    ignored: folder.ignore || [],
  });

  watcher.on('add', async filePath => {
    logger.info(`Item detectado: ${filePath}`);
    try {
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const ignorePatterns = folder.ignore || [];
        const shouldIgnore = ignorePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(filePath);
        });

        if (shouldIgnore) {
          logger.info(`🟡 Ignorando arquivo conforme regra: "${path.basename(filePath)}"`);
          return;
        }

        if (mustMoveFile(filePath, stats, folder.rule)) {
          logger.info(`✅ Arquivo "${path.basename(filePath)}" corresponde à regra. Movendo...`);
          await moveFile(filePath, folder.to, folder.id);
        } else {
          logger.info(`❌ Arquivo "${path.basename(filePath)}" não corresponde à regra.`);
        }
      } else {
        logger.info(`⏭️ Ignorando diretório: "${path.basename(filePath)}"`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`🚨 Erro ao processar o item ${filePath}: ${err}`);
      }
    }
  });

  watcher.on('error', error => {
    logger.error(`Erro no watcher para a pasta ${folder.from}: ${error}`);
  });

  activeWatchers.set(folder.id, watcher);
  logger.info(`Iniciando monitoramento para a pasta: ${folder.from}`);
  return { success: true, message: `Monitoramento iniciado para a pasta: ${folder.from}` };
};

const stopMonitoring = folderId => {
  const watcher = activeWatchers.get(folderId);
  if (watcher) {
    watcher.close();
    activeWatchers.delete(folderId);
    logger.info(`Monitoramento da pasta com ID ${folderId} foi interrompido.`);
    return {
      success: true,
      message: `Monitoramento da pasta com ID ${folderId} foi interrompido.`,
    };
  } else {
    logger.warn(`Nenhum watcher ativo encontrado para a pasta com ID ${folderId}.`);
    return {
      success: false,
      message: `Nenhum watcher ativo encontrado para a pasta com ID ${folderId}.`,
    };
  }
};

module.exports = {
  startMonitoring,
  stopMonitoring,
};
