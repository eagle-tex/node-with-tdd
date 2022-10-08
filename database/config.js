module.exports = {
  development: {
    username: 'my-db-user',
    password: 'db-p4ss',
    database: 'hoaxify',
    host: 'localhost',
    dialect: 'sqlite',
    storage: './database.sqlite'
  },
  staging: {
    username: 'my-db-user',
    password: 'db-p4ss',
    database: 'hoaxify',
    host: 'localhost',
    dialect: 'sqlite',
    storage: './staging.sqlite'
  }
};
