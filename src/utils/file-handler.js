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
      await db.addHistory({
        folderId,
        fileName: path.basename(sourcePath),
        sourcePath,
        destinationPath,
        status: 'DUPLICATE_DELETED',
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

    await db.addHistory({
      folderId,
      fileName: path.basename(finalPath),
      sourcePath,
      destinationPath: finalPath,
      status,
      details,
    });
  } catch (err) {
    logger.error(`🚨 Erro ao mover ${fileName}: ${err}`);
    await db.addHistory({
      folderId,
      fileName,
      sourcePath,
      destinationPath: destinationDir,
      status: 'ERROR',
      details: err.message,
    });
  }
};

module.exports = {
  moveFile,
};
