const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const FileAttachment = require('../src/file/FileAttachment');
const sequelize = require('../src/config/database');
const fs = require('fs');
const config = require('config');

const { uploadDir, attachmentDir } = config;

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  return await FileAttachment.destroy({ truncate: true });
});

const uploadFile = (file = 'test-png.png') => {
  return request(app)
    .post('/api/1.0/hoaxes/attachments')
    .attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Upload File for Hoax', () => {
  it('returns 200 OK after successful upload', async () => {
    const response = await uploadFile();

    expect(response.status).toBe(200);
  });

  it('saves dynamicFilename, uploadDate as attachment object in database', async () => {
    const beforeSubmit = Date.now();
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];

    expect(attachment.filename).not.toBe('test-png.png');
    expect(attachment.uploadDate.getTime()).toBeGreaterThan(beforeSubmit);
  });

  it('saves file to attachment folder', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    const filePath = path.join(
      '.',
      uploadDir,
      attachmentDir,
      attachment.filename
    );

    expect(fs.existsSync(filePath)).toBe(true);
  });

  it.each`
    file              | fileType
    ${'test-png.png'} | ${'image/png'}
    ${'test-png'}     | ${'image/png'}
    ${'test-gif.gif'} | ${'image/gif'}
    ${'test-jpg.jpg'} | ${'image/jpeg'}
    ${'test-pdf.pdf'} | ${'application/pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    `saves fileType as $fileType in attachment object when $file is uploaded`,
    async ({ fileType, file }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];

      expect(attachment.fileType).toBe(fileType);
    }
  );

  it.each`
    file              | fileExtension
    ${'test-png.png'} | ${'png'}
    ${'test-png'}     | ${'png'}
    ${'test-gif.gif'} | ${'gif'}
    ${'test-jpg.jpg'} | ${'jpg'}
    ${'test-pdf.pdf'} | ${'pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    `saves filename with extension $fileExtension in attachment object and stored object when $file is uploaded`,
    async ({ fileExtension, file }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      if (file === 'test-txt.txt') {
        expect(attachment.filename.endsWith('txt')).toBe(false);
      } else {
        expect(attachment.filename.endsWith(fileExtension)).toBe(true);
      }

      const filePath = path.join(
        '.',
        uploadDir,
        attachmentDir,
        attachment.filename
      );

      expect(fs.existsSync(filePath)).toBe(true);
    }
  );

  it('returns 400 Bad Request when uploaded file size is bigger than 5MB', async () => {
    const fiveMB = 5 * 1024 * 1024;
    // create a file named 'random-file' that is over 5MB (5MB + 1Bite)
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');
    const response = await uploadFile('random-file');

    expect(response.status).toBe(400);
    // delete file after this test
    fs.unlinkSync(filePath);
  });

  it('returns 200 OK when uploaded file size is under 5MB', async () => {
    const almostFiveMB = 5 * 1024 * 1024 - 1;
    // create a file named 'random-file' that is exactly 5MB
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(almostFiveMB));
    const response = await uploadFile('random-file');

    expect(response.status).toBe(200);
    // delete file after this test
    fs.unlinkSync(filePath);
  });
});
