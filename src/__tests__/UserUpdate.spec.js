const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
// const bcrypt = require('bcrypt');
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

describe('User Update', () => {
  it('returns 403 Forbidden when request sent without basic authorization', async () => {
    const response = await request(app).put('/api/1.0/users/5').send();

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_user_update}
    ${'fr'}  | ${fr.unauthorized_user_update}
  `(
    'returns error body with "$message" for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await request(app)
        .put('/api/1.0/users/5')
        .set('Accept-Language', language)
        .send();

      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
});
