const Sequelize = require('sequelize');

// let's create our own instance of Sequelize
// param1: app name             param2: database name
// param3: database password    param4: object
const sequelize = new Sequelize('hoaxify', 'my-db-user', 'db-p4ss', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

module.exports = sequelize;
