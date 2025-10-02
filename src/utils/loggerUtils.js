const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '../logs/app.log');
const LOG_DIR = path.dirname(LOG_FILE_PATH);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logMessage = (message, level = 'info') => {
  const logger = {
    info: msg => console.log(`INFO: ${msg}`),
    warn: msg => console.warn(`WARN: ${msg}`),
    error: msg => console.error(`ERROR: ${msg}`),
  };

  if (typeof logger[level] === 'function') {
    logger[level](message);

    const logEntry = `${new Date().toISOString()} - ${level.toUpperCase()}: ${message}\n`;
    fs.appendFileSync(LOG_FILE_PATH, logEntry, 'utf8');
  } else {
    logger.info(`Registrando como info: ${message}`);
  }
};

module.exports = { logMessage };