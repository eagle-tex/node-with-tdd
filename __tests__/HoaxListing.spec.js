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

  it('returns page object as response body', async () => {
    const response = await getHoaxes();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });
});
