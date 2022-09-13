const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('../user/InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  // destructure body (req.body) and get the specific fields we need
  // username, email, password fields are retained, other fields are NOT
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(16)
  };

  // create a transaction
  const transaction = await sequelize.transaction();
  // pass the transaction as a second argument (object) to the User.create function
  await User.create(user, { transaction });

  try {
    await EmailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (err) {
    // if transaction fails, roll it back
    await transaction.rollback();
    // throw the error nonetheless
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page, size) => {
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size
  });

  return {
    content: usersWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(usersWithCount.count / size)
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: { id, inactive: false },
    attributes: ['id', 'username', 'email']
  });
  if (!user) {
    throw new UserNotFoundException();
  }
  return user;
};

module.exports = { save, findByEmail, activate, getUsers, getUser };
