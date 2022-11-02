const request = require('supertest');
const app = require('../src/app');

const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');

const postHoax = (body, options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(body);
};

describe('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_submit}
    ${'fr'}  | ${fr.unauthorized_hoax_submit}
  `(
    `returns error body with "$message" when unauthorized request sent with language $language`,
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await postHoax(null, { language });
      const error = response.body;

      expect(error.path).toBe('/api/1.0/hoaxes');
      expect(error.message).toBe(message);
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
    }
  );
});
