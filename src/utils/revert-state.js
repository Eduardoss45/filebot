const revertingFiles = new Set();

const addRevertingFile = filePath => {
  console.log(`Adicionando à lista de reversão: ${filePath}`);
  revertingFiles.add(filePath);
};

const removeRevertingFile = filePath => {
  console.log(`Removendo da lista de reversão: ${filePath}`);
  return revertingFiles.delete(filePath);
};

const isReverting = filePath => {
  const isListed = revertingFiles.has(filePath);
  console.log(`Verificando se está na lista de reversão: ${filePath} -> ${isListed}`);
  return isListed;
};

module.exports = {
  addRevertingFile,
  removeRevertingFile,
  isReverting,
};
