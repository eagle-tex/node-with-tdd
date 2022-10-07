'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'inactive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('users', 'inactive');
  }
};
