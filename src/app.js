const express = require('express');

const app = express();

app.post('/api/1.0/users', (_req, res) => {
  return res.status(500).send();
});

module.exports = app;
