const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');

router.post('/api/1.0/auth', async (req, res, next) => {
  const { email, password } = req.body;
  const user = await UserService.findByEmail(email);
  if (!user) {
    return next(new AuthenticationException());
  }

  // bcrypt(clear_password, hashed_password_in_user_table)
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return next(new AuthenticationException());
  }

  res.send({
    id: user.id,
    username: user.username
  });
});

module.exports = router;
