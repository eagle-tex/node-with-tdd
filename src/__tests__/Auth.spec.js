const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
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

const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return await agent.send(credentials);
};

const postLogout = async () => {
  return request(app).post('/api/1.0/logout').send();
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

  it('returns user id, username and token on login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
  });

  it('returns 401 when user does not exist', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    expect(response.status).toBe(401);
  });

  it('returns proper error body when authentication fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'en'}  | ${en.authentication_failure}
    ${'fr'}  | ${fr.authentication_failure}
  `(
    `returns "$message" when authentication fails and language is set as $language`,
    async ({ language, message }) => {
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'P4ssword'
        },
        { language }
      );

      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Inc0rrect-password'
    });

    expect(response.status).toBe(401);
  });

  it('returns 403 when logging in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    expect(response.status).toBe(403);
  });

  it('returns proper error body when user inactive user authentication fails', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'en'}  | ${en.inactive_authentication_failure}
    ${'fr'}  | ${fr.inactive_authentication_failure}
  `(
    `returns "$message" when authentication fails for inactive account and language is set as $language`,
    async ({ language, message }) => {
      await addUser({ ...activeUser, inactive: true });
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'P4ssword'
        },
        { language }
      );

      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when e-mail is not valid', async () => {
    const response = await postAuthentication({
      // no email field
      password: 'P4ssword'
    });

    expect(response.status).toBe(401);
  });

  it('returns 401 when password is not valid', async () => {
    const response = await postAuthentication({
      // no password field
      email: 'user1@mail.com'
    });

    expect(response.status).toBe(401);
  });

  it('returns token in response body when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword'
    });

    expect(response.body.token).toBeTruthy();
    // NOTE: (alternative way)
    // expect(response.body.token).not.toBeUndefined()
  });
});

describe('Logout', () => {
  it('returns 200 OK on unauthorized request sent for logout', async () => {
    const response = await postLogout();

    expect(response.status).toBe(200);
  });
});
