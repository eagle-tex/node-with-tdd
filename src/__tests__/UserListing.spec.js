const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('Listing Users', () => {
  it('returns 200 OK when there are no user in database', async () => {
    const response = await request(app).get('/api/1.0/users');
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await request(app).get('/api/1.0/users');
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });

  it('returns 10 users in page content when there all 11 users in database', async () => {
    for (let i = 0; i < 11; i++) {
      await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`
      });
    }

    const response = await request(app).get('/api/1.0/users');

    expect(response.body.content.length).toBe(10);
  });
});
