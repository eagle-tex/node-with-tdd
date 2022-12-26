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
      user: 'katrina.becker@ethereal.email',
      pass: 'VxH2axJdh1th2gRfkn'
    }
  },
  uploadDir: 'uploads-dev',
  profileDir: 'profile',
  attachmentDir: 'attachment'
};
