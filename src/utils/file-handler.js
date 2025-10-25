const fse = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const { logger } = require('./logger');
const db = require('./database');

const calculateFileHash = filePath => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fse.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
};

const checkAndDeleteDuplicate = async (sourcePath, destinationPath, folderId) => {
  try {
    const [newStats, existingStats] = await Promise.all([
      fse.stat(sourcePath).catch(() => null),
      fse.stat(destinationPath).catch(() => null),
    ]);

    if (!newStats || !existingStats) {
      logger.warn(`⚠️ Um dos arquivos não existe mais: ${sourcePath} ou ${destinationPath}`);
      return false;
    }

    if (newStats.size !== existingStats.size) return false;

    const [newHash, existingHash] = await Promise.all([
      calculateFileHash(sourcePath),
      calculateFileHash(destinationPath),
    ]);

    if (newHash && newHash === existingHash) {
      logger.info(`🗑️ Arquivo duplicado encontrado! Excluindo ${sourcePath}...`);
      await fse.unlink(sourcePath);
      await db.addActionHistory({
        folderId,
        action_type: 'DELETE_DUPLICATE',
        source_path: sourcePath,
        destination_path: destinationPath,
        details: 'Arquivo duplicado idêntico foi removido da origem.',
      });
      return true;
    }
  } catch (err) {
    logger.error(`🚨 Erro ao comparar arquivos: ${err}`);
  }
  return false;
};

const moveFile = async (sourcePath, destinationDir, folderId) => {
  const fileName = path.basename(sourcePath);
  const fileExt = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, fileExt);

  let initialDestination = path.join(destinationDir, fileName);
  let status = 'MOVED';
  let details = '';

  try {
    await fse.ensureDir(destinationDir);
    if (await fse.pathExists(initialDestination)) {
      const isDuplicate = await checkAndDeleteDuplicate(sourcePath, initialDestination, folderId);
      if (isDuplicate) return;
    }

    let finalPath = initialDestination;
    let count = 1;
    while (await fse.pathExists(finalPath)) {
      finalPath = path.join(destinationDir, `${baseName} (${count})${fileExt}`);
      count++;
    }

    if (finalPath !== initialDestination) {
      status = 'RENAMED_AND_MOVED';
      details = `Arquivo renomeado para ${path.basename(finalPath)} para evitar conflito.`;
    }

    await fse.move(sourcePath, finalPath);
    logger.info(`🚀 Movendo ${fileName} para ${finalPath}`);

    await db.addActionHistory({
      folderId,
      action_type: status === 'MOVED' ? 'MOVE' : 'RENAME_AND_MOVE',
      source_path: sourcePath,
      destination_path: finalPath,
      details,
    });
  } catch (err) {
    logger.error(`🚨 Erro ao mover ${fileName}: ${err}`);
    await db.addActionHistory({
      folderId,
      action_type: 'ERROR',
      source_path: sourcePath,
      destination_path: destinationDir,
      status: 'ERROR',
      details: err.message,
    });
  }
};

const { addRevertingFile, removeRevertingFile } = require('./revert-state');

const revertAction = async actionId => {
  const action = await db.knex('action_history').where({ id: actionId }).first();

  if (!action) {
    return { success: false, message: 'Ação não encontrada no histórico.' };
  }

  if (action.status === 'REVERTED') {
    return { success: false, message: 'Esta ação já foi revertida.' };
  }

  const { action_type, source_path, destination_path } = action;

  if (action_type !== 'MOVE' && action_type !== 'RENAME_AND_MOVE') {
    return {
      success: false,
      message: `Ação do tipo "${action_type}" não pode ser revertida.`,
    };
  }

  const fileExistsAtDestination = await fse.pathExists(destination_path);
  if (!fileExistsAtDestination) {
    return {
      success: false,
      message: `Não é possível reverter: o arquivo não foi encontrado em "${destination_path}". Ele pode ter sido movido ou renomeado manualmente.`,
    };
  }

  const sourcePathIsClear = !(await fse.pathExists(source_path));
  if (!sourcePathIsClear) {
    return {
      success: false,
      message: `Não é possível reverter: o caminho original "${source_path}" já está ocupado por outro arquivo ou pasta.`,
    };
  }

  addRevertingFile(source_path); // Adiciona à lista de exceções

  try {
    await fse.move(destination_path, source_path);
    await db.knex('action_history').where({ id: actionId }).update({ status: 'REVERTED' });
    logger.info(`✅ Ação ${actionId} revertida com sucesso.`);
    return { success: true, message: `Ação ${actionId} revertida com sucesso.` };
  } catch (error) {
    logger.error(`🚨 Erro ao reverter ação ${actionId}:`, error);
    return { success: false, message: `Ocorreu um erro inesperado ao tentar reverter: ${error.message}` };
  } finally {
    removeRevertingFile(source_path); // Garante que seja removido da lista
  }
};

module.exports = {
  moveFile,
  revertAction,
};
