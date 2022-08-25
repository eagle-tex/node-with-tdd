const express = require('express');

const app = express();

app.post('/api/1.0/users', (_req, res) => {
  return res.send({ message: 'User created' });
});

module.exports = app;
