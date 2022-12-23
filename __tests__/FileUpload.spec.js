const path = require('path');
const request = require('supertest');

const app = require('../src/app');

describe('Upload File for Hoax', () => {
  it('returns 200 OK after successful upload', async () => {
    const response = await request(app)
      .post('/api/1.0/hoaxes/attachments')
      .attach('file', path.join('.', '__tests__', 'resources', 'test-png.png'));

    expect(response.status).toBe(200);
  });
});
