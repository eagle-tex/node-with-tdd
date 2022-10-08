const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

const port = process.env.PORT || 3000;

sequelize.sync();

TokenService.scheduleCleanup();

logger.error('error');
logger.warn('warn');
logger.info('info');
logger.verbose('verbose');
logger.debug('debug');
logger.silly('silly');

app.listen(port, () => {
  logger.info(
    `App running on PORT ${port} in version: ${process.env.npm_package_version}`
  );
});
