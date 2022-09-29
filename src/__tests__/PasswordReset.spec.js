const request = require('supertest');

const app = require('../app');

describe('Password Reset', () => {
  it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await request(app)
      .post('/api/1.0/password-reset')
      .send({ email: 'user1@mail.com' });

    expect(response.status).toBe(404);
  });
});
