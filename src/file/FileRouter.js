const express = require('express');
const router = express.Router();
const FileService = require('./FileService');
const multer = require('multer');

const FIVE_MB = 5 * 1024 * 1024;

const upload = multer({ limits: { fileSize: FIVE_MB } }).single('file');

router.post('/api/1.0/hoaxes/attachments', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send();
    }

    await FileService.saveAttachment(req.file);
    res.send();
  });
});

module.exports = router;
