'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('fileAttachments', 'hoaxId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'hoaxes',
        key: 'id'
      },
      onDelete: 'cascade'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('fileAttachments', 'hoaxId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'hoaxes',
        key: 'id'
      }
    });
  }
};
