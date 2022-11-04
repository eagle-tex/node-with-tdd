const request = require('supertest');
// const bcrypt = require('bcrypt');
const app = require('../src/app');
const Hoax = require('../src/hoax/Hoax');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
// const en = require('../locales/en/translation.json');
// const fr = require('../locales/fr/translation.json');

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

// const auth = async (options = {}) => {
//   let token; // undefined
//   const agent = request(app);
//   if (options.auth) {
//     const response = await agent.post('/api/1.0/auth').send(options.auth);
//     token = response.body.token;
//   }

//   return token;
// };

// const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

describe('Listing All Hoaxes', () => {
  const getHoaxes = () => {
    const agent = request(app).get('/api/1.0/hoaxes');
    return agent;
  };

  const addHoaxes = async (count) => {
    for (let i = 0; i < count; i++) {
      const user = await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`
      });

      await Hoax.create({
        content: `hoax content ${i + 1}`,
        timestamp: Date.now(),
        userId: user.id
      });
    }
  };

  it('returns 200 OK when there are no hoaxes in database', async () => {
    const response = await getHoaxes();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getHoaxes();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });

  it('returns 10 hoaxes in page content when there all 11 hoaxes in database', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();

    expect(response.body.content.length).toBe(10);
  });

  it('returns only id, content, timestamp and user object having id, username, email and image in content array for each hoax', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);

    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
  });

  it('returns 2 as totalPages when there are 11 hoaxes', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();

    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page hoaxes and page indicator when page is set as 1 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: 1 });
    // alternative way of querying 'page 1'
    // const response = await request(app).get('/api/1.0/users?page=1');

    expect(response.body.content[0].content).toBe('hoax content 11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page hoaxes when page is below 0 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: -5 });

    expect(response.body.page).toBe(0);
  });

  it('returns 5 hoaxes and corresponding size indicator when size is set to 5 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 5 });

    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 1000', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 1000 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 0', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 0 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as 0 and size as 10 when non numeric query params provided for both', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 'size', page: 'page' });

    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });
});
