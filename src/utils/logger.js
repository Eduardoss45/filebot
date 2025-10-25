const log4js = require('log4js');
const path = require('path');
const { app } = require('electron');

let mainWindow;

function setMainWindow(win) {
  mainWindow = win;
}

const logPath = path.join(app.getPath('userData'), 'logs');

const rendererAppenderModule = {
  configure: (config, layouts) => {
    return loggingEvent => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-message', loggingEvent.data[0]);
      }
    };
  },
};

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: path.join(logPath, 'app.log') },

    toRenderer: { type: rendererAppenderModule },
  },
  categories: {
    default: { appenders: ['console', 'file', 'toRenderer'], level: 'info' },
  },
});

const logger = log4js.getLogger();

module.exports = {
  logger,
  setMainWindow,
};
