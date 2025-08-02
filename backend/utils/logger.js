const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Ensure logs directory exists
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = {
  logRequest: (req, res, duration) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)\n`;
    
    // Write to daily log file
    const logFileName = `api-${moment().format('YYYY-MM-DD')}.log`;
    const logFilePath = path.join(logDirectory, logFileName);
    
    fs.appendFile(logFilePath, logMessage, (err) => {
      if (err) {
        console.error('Error writing to log file:', err);
      }
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(logMessage.trim());
    }
  }
};

module.exports = logger;
