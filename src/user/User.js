const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Token = require('../auth/Token');
const Hoax = require('../hoax/Hoax');

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
    },
    activationToken: {
      type: Sequelize.STRING
    },
    passwordResetToken: {
      type: Sequelize.STRING
    },
    image: {
      type: Sequelize.STRING
    }
  },
  {
    sequelize,
    modelName: 'user'
  }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });
User.hasMany(Hoax, { foreignKey: 'userId' });

module.exports = User;
