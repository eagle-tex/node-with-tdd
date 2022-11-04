const request = require('supertest');
const app = require('../src/app');
const Hoax = require('../src/hoax/Hoax');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

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
});
