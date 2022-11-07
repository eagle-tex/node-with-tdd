const Sequelize = require('sequelize');
const sequelize = require('../../src/config/database');

const Model = Sequelize.Model;

class Hoax extends Model {}

Hoax.init(
  {
    content: {
      type: Sequelize.STRING
    },
    timestamp: {
      type: Sequelize.BIGINT
    }
  },
  {
    sequelize,
    modelName: 'hoax',
    timestamps: false
  }
);

module.exports = Hoax;
