const express = require('express');
const UserRouter = require('./user/UserRouter');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en', // fallback language
    lng: 'en', // language used
    ns: ['translation'], // ns := namespace (actual translation file). we can have multiple ns
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json'
    },
    detection: {
      lookupHeader: 'accept-language'
    }
  });

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use(UserRouter);

app.use((err, req, res, _next) => {
  const { status, message, errors } = err;
  let validationErrors = null;

  if (errors) {
    validationErrors = {};
    errors.forEach((error) => {
      return (validationErrors[error.param] = req.t(error.msg));
    });
  }

  res.status(status).send({ message: req.t(message), validationErrors });
});

module.exports = app;
