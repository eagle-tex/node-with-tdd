const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
// const en = require('../../locales/en/translation.json');
// const fr = require('../../locales/fr/translation.json');

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
});
