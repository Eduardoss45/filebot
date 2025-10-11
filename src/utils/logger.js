const log4js = require('log4js');
const path = require('path');
const { app } = require('electron');

let mainWindow;

function setMainWindow(win) {
  mainWindow = win;
}

const logPath = path.join(app.getPath('userData'), 'logs');

// This is the module for our custom appender
const rendererAppenderModule = {
  configure: (config, layouts) => {
    return (loggingEvent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // loggingEvent.data is an array of the arguments passed to logger.info
        // We'll just send the first one for simplicity.
        mainWindow.webContents.send('log-message', loggingEvent.data[0]);
      }
    };
  },
};

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: path.join(logPath, 'app.log') },
    // Define the custom appender that sends logs to the renderer
    toRenderer: { type: rendererAppenderModule },
  },
  categories: {
    // Use all three appenders
    default: { appenders: ['console', 'file', 'toRenderer'], level: 'info' }
  }
});

const logger = log4js.getLogger();

module.exports = {
    logger,
    setMainWindow,
};
