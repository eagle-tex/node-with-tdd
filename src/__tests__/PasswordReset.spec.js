const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../app');
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');
const User = require('../user/User');
const sequelize = require('../config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // NOTE: because we included `userId` field as a foreignKey in User-Token
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;

  return await User.create(user); // return the created user object
};

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post('/api/1.0/password-reset');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send({ email: email });
};

describe('Password Reset', () => {
  it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();

    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'en'}  | ${en.email_not_in_use}
    ${'fr'}  | ${fr.email_not_in_use}
  `(
    'returns error body with "$message" for unknown e-mail for password reset request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', {
        language: language
      });

      expect(response.body.path).toBe('/api/1.0/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'en'}  | ${en.email_invalid}
    ${'fr'}  | ${fr.email_invalid}
  `(
    'returns 404 with validation error having "$message" when request does not have valid e-mail and language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, {
        language: language
      });

      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200 OK when a password resest request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);

    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'en'}  | ${en.password_reset_request_success}
    ${'fr'}  | ${fr.password_reset_request_success}
  `(
    'returns success response body with "$message" for known e-mail for password reset request when language is set as $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });

      expect(response.body.message).toBe(message);
    }
  );
});
