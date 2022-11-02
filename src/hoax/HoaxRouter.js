const express = require('express');
const router = express.Router();

router.post('/api/1.0/hoaxes', (_req, res) => {
  res.status(401).send();
});

module.exports = router;
