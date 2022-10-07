const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');

const port = process.env.PORT || 3000;

sequelize.sync();

TokenService.scheduleCleanup();

app.listen(port, () => {
  console.log(`App running on PORT ${port}`);
});
