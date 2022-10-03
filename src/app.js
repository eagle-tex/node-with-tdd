const express = require('express');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

const UserRouter = require('./user/UserRouter');
const errorHandler = require('./error/ErrorHandler');
const AuthenticationRouter = require('./auth/AuthenticationRouter');
const tokenAuthentication = require('./middleware/tokenAuthentication');
const FileService = require('./file/FileService');
const config = require('config');
const path = require('path');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

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

FileService.createFolders();

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use('/images', express.static(profileFolder));

app.use(tokenAuthentication);

app.use(UserRouter);

app.use(AuthenticationRouter);

app.use(errorHandler);

module.exports = app;
