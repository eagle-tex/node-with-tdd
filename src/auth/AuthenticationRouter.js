const express = require('express');
const router = express.Router();

const UserService = require('../user/UserService');

router.post('/api/1.0/auth', async (req, res) => {
  const { email } = req.body;
  const user = await UserService.findByEmail(email);
  if (!user) {
    return res.status(401).send();
  }

  res.send({
    id: user.id,
    username: user.username
  });
});

module.exports = router;
