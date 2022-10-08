const profiles = require('../config');

const dbConfigs = {};

Object.keys(profiles).forEach((profile) => {
  dbConfigs[profile] = { ...profiles[profile].database };
});

console.log(dbConfigs);

module.exports = dbConfigs;

// running the command `node config` from the `./database/` folder
// produces the following output
// {
//   development: {
//     database: 'hoaxify',
//     username: 'my-db-user',
//     password: 'db-p4ss',
//     dialect: 'sqlite',
//     storage: './database.sqlite',
//     logging: false
//   },
//   staging: {
//     database: 'hoaxify',
//     username: 'my-db-user',
//     password: 'db-p4ss',
//     dialect: 'sqlite',
//     storage: './staging.sqlite',
//     logging: false
//   },
//   test: {
//     database: 'hoaxify',
//     username: 'my-db-user',
//     password: 'db-p4ss',
//     dialect: 'sqlite',
//     storage: ':memory:',
//     logging: false
//   }
// }
