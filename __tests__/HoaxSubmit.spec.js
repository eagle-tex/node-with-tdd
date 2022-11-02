const request = require('supertest');
const app = require('../src/app');

const postHoax = (body) => {
  return request(app).post('/api/1.0/hoaxes').send(body);
};

describe('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });
});
