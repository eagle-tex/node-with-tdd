const jwt = require('jsonwebtoken');

const SECRET = 'this-is-our-secret';

const createToken = (user) => {
  return jwt.sign({ id: user.id }, SECRET);
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { createToken, verifyToken };
