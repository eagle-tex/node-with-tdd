const request = require('supertest');

const app = require('../app');
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');

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
    'returns 404 with validation error having "$message" when requeset does not have valid e-mail and language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, {
        language: language
      });

      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );
});
