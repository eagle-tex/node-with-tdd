const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const nodemailerStub = require('nodemailer-stub');

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
  await User.create(user);

  const transporter = nodemailer.createTransport(nodemailerStub.stubTransport);
  // await is IMPORTANT on next line: it "forces" to wait for email to be sent
  await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `Token is ${user.activationToken}`
  });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };
