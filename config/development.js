module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'lee.miller26@ethereal.email',
      pass: 'qKaHUKyD2g2AffJbh9'
    }
  },
  uploadDir: 'uploads-dev',
  profileDir: 'profile',
  attachmentDir: 'attachment'
};
