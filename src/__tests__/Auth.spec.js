const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const addUser = async () => {
  const user = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P4ssword',
    inactive: false
  };
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  await User.create(user);
};

const postAuthentication = async (credentials) => {
  return await request(app).post('/api/1.0/auth').send(credentials);
};

describe('Authentication', () => {
  it('returns 200 OK when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    expect(response.status).toBe(200);
  });
});
