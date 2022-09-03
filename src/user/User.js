const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
      // NOTE: constraint below not necessary anymore but you can try to put it back in
      // unique: true
    },
    password: {
      type: Sequelize.STRING
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'user'
  }
);

module.exports = User;
