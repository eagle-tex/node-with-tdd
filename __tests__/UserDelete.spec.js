const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');
const Token = require('../src/auth/Token');
const Hoax = require('../src/hoax/Hoax');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  // NOTE: because we included `userId` field as a foreignKey in User-Token
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false
};

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

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

    const token = await auth({ auth: credentials });

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
    const token = await auth({ auth: credentials });
    const response = await deleteUser(savedUser.id, {
      token: token
    });

    expect(response.status).toBe(200);
  });

  it('deletes user from database when request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, {
      token: token
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });

    expect(inDBUser).toBeNull();
  });

  it('deletes token from database when delete user request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, {
      token: token
    });

    const tokenInDB = await Token.findOne({ where: { token: token } });

    expect(tokenInDB).toBeNull();
  });

  it('deletes all tokens from database when delete user request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token1 = await auth({ auth: credentials });
    const token2 = await auth({ auth: credentials });
    await deleteUser(savedUser.id, {
      token: token1
    });

    const tokenInDB = await Token.findOne({ where: { token: token2 } });

    expect(tokenInDB).toBeNull();
  });

  it('deletes hoax from database when delete user request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });

    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hoax content' });

    await deleteUser(savedUser.id, {
      token: token
    });

    const hoaxes = await Hoax.findAll();

    expect(hoaxes.length).toBe(0);
  });
});
