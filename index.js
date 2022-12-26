const app = require('./src/app');
const sequelize = require('./src/config/database');

const FileService = require('./src/file/FileService');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

const port = process.env.PORT || 3000;

sequelize.sync();

TokenService.scheduleCleanup();
FileService.removeUnusedAttachments();

app.listen(port, () => {
  logger.info(
    `App running on PORT ${port} in version: ${process.env.npm_package_version}`
  );
});
