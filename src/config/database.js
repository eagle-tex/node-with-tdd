const Sequelize = require('sequelize');
const config = require('config');
// require('pg').defaults.parseInt8 = true; // only for postgresql

const dbConfig = config.get('database');

// let's create our own instance of Sequelize
// param1: app name             param2: database name
// param3: database password    param4: object
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
    logging: dbConfig.logging
  }
);

module.exports = sequelize;
