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

const auth = async (options = {}) => {
  let token; // undefined
  const agent = request(app);
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/users/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send();
};

describe('User Delete', () => {
  it('returns 403 Forbidden when request sent unauthorized', async () => {
    const response = await deleteUser();

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_user_delete}
    ${'fr'}  | ${fr.unauthorized_user_delete}
  `(
    'returns error body with "$message" for unauthorized delete request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });

      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 Forbidden when delete request is sent with correct credentials of another user', async () => {
    await addUser();
    const userToBedeleted = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com'
    });

    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });

    const response = await deleteUser(userToBedeleted.id, {
      token: token
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });

    expect(response.status).toBe(403);
  });

  it('returns 200 OK when valid delete request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });
    const response = await deleteUser(savedUser.id, {
      token: token
    });

    expect(response.status).toBe(200);
  });

  it('deletes user from database when request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });
    await deleteUser(savedUser.id, {
      token: token
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });

    expect(inDBUser).toBeNull();
  });
});