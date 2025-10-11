const Store = require('electron-store');

const schema = {
  folders: {
    type: 'array',
    default: []
  },
  recentFolders: {
    type: 'array',
    default: []
  }
};

const store = new Store({ schema });

module.exports = store;
