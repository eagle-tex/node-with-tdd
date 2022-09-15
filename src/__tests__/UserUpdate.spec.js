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

const putUser = (id = 5, body = null, options = {}) => {
  const agent = request(app).put(`/api/1.0/users/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (options.auth) {
    // create a Base64 encoded version of our credentials
    // which looks like `Basic dxN...`
    const { email, password } = options.auth;

    // NOTE: manual creation of basic auth
    // const merged = `${email}:{password}`;
    // const base64 = Buffer.from(merged).toString('base64');
    // agent.set('Authorization', `Basic ${base64}`);

    agent.auth(email, password);
  }

  return agent.send(body);
};

describe('User Update', () => {
  it('returns 403 Forbidden when request sent without basic authorization', async () => {
    const response = await putUser();

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
      const response = await putUser(5, null, { language });

      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 Forbidden when request sent with incorrect e-mail in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1000@mail.com', password: 'P4ssword' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 Forbidden when request sent with incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1@mail.com', password: 'password' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 Forbidden when update request is sent with correct credentials of another user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com'
    });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });

    expect(response.status).toBe(403);
  });
});
