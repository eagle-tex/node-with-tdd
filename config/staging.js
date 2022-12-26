module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './staging.sqlite',
    logging: false
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000, // random port between 10000 & 12000
    tls: { rejectUnauthorized: false }
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile',
  attachmentDir: 'attachment'
};

// config for sqlite
// database: {
//   database: 'hoaxify',
//   username: 'my-db-user',
//   password: 'db-p4ss',
//   dialect: 'sqlite',
//   storage: './staging.sqlite',
//   logging: false
// },

// config for postgres
// database: {
//   database: 'hoaxify',
//   username: 'postgres',
//   password: 'db-admin',
//   dialect: 'postgres',
//   host:'localhost',
//   logging: false
// },
