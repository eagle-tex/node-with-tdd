const app = require('./src/app');
const sequelize = require('./src/config/database');

const port = process.env.PORT || 3000;

// { force: true } forces sequelize to sync the db with the latest updates.
// WARN:NEVER USE THIS IN PRODUCTION - leads to data loss (database erasure)
sequelize.sync({ force: true });

app.listen(port, () => {
  console.log(`App running on PORT ${port}`);
});
