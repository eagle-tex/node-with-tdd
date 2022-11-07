module.exports = {
  database: {
    database: 'hoaxify',
    username: 'postgres',
    password: 'db-admin',
    dialect: 'postgres',
    host: 'localhost',
    logging: false
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000, // random port between 10000 & 12000
    tls: { rejectUnauthorized: false }
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile'
};
