const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');

// we use return to wait for the asynchronous function (sequelize.sync())
// to resolve before continuing
beforeAll(() => {
  return sequelize.sync();
});

// we use return to wait for the asynchronous function (User.destroy())
// to resolve before continuing
beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const postValidUser = () => {
    return request(app).post('/api/1.0/users').send({
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword'
    });
  };

  it('returns 200 OK when signup request is valid', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postValidUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves the user to database', async () => {
    await postValidUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postValidUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postValidUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await request(app).post('/api/1.0/users').send({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword'
    });
    expect(response.status).toBe(400);
  });
});
