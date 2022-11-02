const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../src/app');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');

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

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;

  return await User.create(user); // return the created user object
};

const postHoax = async (body = null, options = {}) => {
  let agent = request(app);

  let token; // undefined
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).post('/api/1.0/hoaxes');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send(body);
};

describe('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_submit}
    ${'fr'}  | ${fr.unauthorized_hoax_submit}
  `(
    `returns error body with "$message" when unauthorized request sent with language $language`,
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await postHoax(null, { language });
      const error = response.body;

      expect(error.path).toBe('/api/1.0/hoaxes');
      expect(error.message).toBe(message);
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
    }
  );

  it('returns 200 OK when valid hoax submitted with authorized user', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'Hoax content' },
      { auth: { email: 'user1@mail.com', password: 'P4ssword' } }
    );

    expect(response.status).toBe(200);
  });
});
