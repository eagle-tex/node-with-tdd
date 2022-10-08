const { createLogger, transports } = require('winston');

const logger = createLogger({
  transports: [
    new transports.Console({ level: 'silly' }),
    new transports.File({ filename: 'app.log', level: 'error' })
  ],
  level: 'debug'
});

module.exports = logger;
