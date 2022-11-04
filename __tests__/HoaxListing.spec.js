const request = require('supertest');
const app = require('../src/app');

describe('Listing All Hoaxes', () => {
  const getHoaxes = () => {
    const agent = request(app).get('/api/1.0/hoaxes');

    return agent;
  };

  it('returns 200 OK when there are no hoaxes in database', async () => {
    const response = await getHoaxes();
    expect(response.status).toBe(200);
  });
});
