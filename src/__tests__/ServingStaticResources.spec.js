const request = require('supertest');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

describe('Profile Images', () => {
  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');

    expect(response.status).toBe(404);
  });

  it('returns 200 OK when file exists', async () => {
    const filePath = path.join(__dirname, 'resources', 'test-png.png');
    const storedFileName = 'test-file';
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    const response = await request(app).get(`/images/${storedFileName}`);

    expect(response.status).toBe(200);
  });
});
