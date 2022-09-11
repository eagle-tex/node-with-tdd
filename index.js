const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');

const port = process.env.PORT || 3000;

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount
    });
  }
};

// { force: true } forces sequelize to sync the db with the latest updates.
// WARN:NEVER USE THIS IN PRODUCTION - leads to data loss (database erasure)
sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

app.listen(port, () => {
  console.log(`App running on PORT ${port}`);
});
