const app = require('./src/app');
const sequelize = require('./src/config/database');

const port = process.env.PORT || 3000;

sequelize.sync();

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
