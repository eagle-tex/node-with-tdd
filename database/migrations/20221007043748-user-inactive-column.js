'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'users',
        'inactive',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'users',
        'activationToken',
        {
          type: Sequelize.STRING
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  },

  async down(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('users', 'inactive', { transaction });
      await queryInterface.removeColumn('users', 'activationToken', {
        transaction
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  }
};
