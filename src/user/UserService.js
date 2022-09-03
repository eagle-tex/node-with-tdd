const User = require('./User');
const bcrypt = require('bcrypt');

const save = async (body) => {
  // destructure body (req.body) and get the specific fields we need
  // username, email, password fields are retained, other fields are NOT
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash };
  await User.create(user);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };
