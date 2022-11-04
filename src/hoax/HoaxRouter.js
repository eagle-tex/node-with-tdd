const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const AuthenticationException = require('../auth/AuthenticationException');
const HoaxService = require('./HoaxService');
const ValidationException = require('../error/ValidationException');

router.post(
  '/api/1.0/hoaxes',
  check('content')
    .isLength({ min: 10, max: 5000 })
    .withMessage('hoax_content_size'),
  async (req, res, next) => {
    if (!req.authenticatedUser) {
      next(new AuthenticationException('unauthorized_hoax_submit'));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    await HoaxService.save(req.body, req.authenticatedUser);
    return res.send({ message: req.t('hoax_submit_success') });
  }
);

router.get('/api/1.0/hoaxes', (_req, res) => {
  res.send();
});

module.exports = router;
