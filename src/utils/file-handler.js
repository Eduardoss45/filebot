const fse = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const { logger } = require('./logger');
const db = require('./database'); // Import database module

const calcularHashArquivo = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fse.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

const verificarEExcluirDuplicata = async (filePath, destinoInicial, folderId) => {
  try {
    const [statsNovo, statsExistente] = await Promise.all([
      fse.stat(filePath).catch(() => null),
      fse.stat(destinoInicial).catch(() => null),
    ]);

    if (!statsNovo || !statsExistente || statsNovo.size !== statsExistente.size) return false;

    const [hashNovo, hashExistente] = await Promise.all([
      calcularHashArquivo(filePath),
      calcularHashArquivo(destinoInicial),
    ]);

    if (hashNovo && hashNovo === hashExistente) {
      logger.info(`🗑️ Arquivo duplicado encontrado! Excluindo ${filePath}...`);
      await fse.unlink(filePath);
      await db.addHistory({
          folderId,
          fileName: path.basename(filePath),
          sourcePath: filePath,
          destinationPath: destinoInicial,
          status: 'DUPLICATE_DELETED',
          details: 'Arquivo duplicado idêntico foi removido da origem.'
      });
      return true;
    }
  } catch (err) {
    logger.error(`🚨 Erro ao comparar arquivos: ${err}`);
  }
  return false;
}

const moverArquivo = async (filePath, to, folderId) => {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath);
  const fileBaseName = path.basename(filePath, fileExt);

  let destinoInicial = path.join(to, fileName);
  let status = 'MOVED';
  let details = '';

  try {
    // If a file with the same name already exists in the destination,
    // check if it's a duplicate. If so, delete the source file.
    if (await fse.pathExists(destinoInicial)) {
      if (await verificarEExcluirDuplicata(filePath, destinoInicial, folderId)) return; // Stop if duplicate was deleted
    }

    // If the destination path already exists, find a new name by appending a number.
    let newPath = destinoInicial;
    let count = 1;
    while (await fse.pathExists(newPath)) {
      newPath = path.join(to, `${fileBaseName} (${count})${fileExt}`);
      count++;
    }

    // If the file was renamed, update the status and details.
    if (newPath !== destinoInicial) {
        status = 'RENAMED_AND_MOVED';
        details = `Arquivo renomeado para ${path.basename(newPath)} para evitar conflito.`;
    }

    // Move the file to the new path.
    await fse.move(filePath, newPath);
    logger.info(`🚀 Movendo ${fileName} para ${newPath}`);

    // Add a record of the move to the history database.
    await db.addHistory({
        folderId,
        fileName: path.basename(newPath),
        sourcePath: filePath,
        destinationPath: newPath,
        status,
        details
    });

  } catch (err) {
    logger.error(`🚨 Erro ao mover ${fileName}: ${err}`);
    // If an error occurs, log it to the history database.
    await db.addHistory({
        folderId,
        fileName,
        sourcePath: filePath,
        destinationPath: to,
        status: 'ERROR',
        details: err.message
    });
  }
};

module.exports = {
  moverArquivo,
};