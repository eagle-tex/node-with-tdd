'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const hash = await bcrypt.hash('P4ssword', 10);
    const users = [];
    for (let i = 0; i < 25; i++) {
      users.push({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`,
        inactive: false,
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await queryInterface.bulkInsert('users', users, {});
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
