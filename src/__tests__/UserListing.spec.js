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

const getUsers = () => {
  return request(app).get('/api/1.0/users');
};

const addUsers = async (count) => {
  for (let i = 0; i < count; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 OK when there are no user in database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });

  it('returns 10 users in page content when there all 11 users in database', async () => {
    await addUsers(11);
    const response = await getUsers();

    expect(response.body.content.length).toBe(10);
  });
});
