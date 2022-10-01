const User = require('./User');
const bcrypt = require('bcrypt');
const Sequelize = require('sequelize');

const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('../user/InvalidTokenException');
const NotFoundException = require('../error/NotFoundException');
const { randomString } = require('../shared/generator');

const save = async (body) => {
  // destructure body (req.body) and get the specific fields we need
  // username, email, password fields are retained, other fields are NOT
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: randomString(16)
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

const getUsers = async (page, size, authenticatedUser) => {
  const id = authenticatedUser ? authenticatedUser.id : 0;

  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: id
      }
    },
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
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id } });
  user.username = updatedBody.username;
  await user.save();
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);

  if (!user) {
    throw new NotFoundException('email_not_in_use');
  }

  user.passwordResetToken = randomString(16);
  await user.save();

  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (err) {
    throw new EmailException();
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken
};
