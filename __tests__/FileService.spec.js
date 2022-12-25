const FileService = require('../src/file/FileService');
const FileAttachment = require('../src/file/FileAttachment');
// const Hoax = require('../src/hoax/Hoax');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir, attachmentDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();

    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('creates profile folder under upload folder', () => {
    FileService.createFolders();

    expect(fs.existsSync(profileFolder)).toBe(true);
  });

  it('creates attachments folder under upload folder', () => {
    FileService.createFolders();

    expect(fs.existsSync(attachmentFolder)).toBe(true);
  });
});

describe('Scheduled Unused File Cleanup', () => {
  const filename = 'test-file-' + Date.now();
  const testFile = path.join('.', '__tests__', 'resources', 'test-png.png');
  const targetPath = path.join(attachmentFolder, filename);

  beforeEach(async () => {
    await FileAttachment.destroy({ truncate: true });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  });

  it('removes the 24 hours old file with attachment entry if not used in a hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() - 5 * 1000); // 5 seconds before now

    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate
    });
    await FileService.removeUnusedAttachments();

    // fakely advance by 24h to trigger the execution of removeUnusedAttachments
    jest.advanceTimersByTime(24 * 60 * 60 * 1000); // advance by 24h
    jest.useRealTimers(); // come back to real time (now)

    await new Promise((resolve) => setTimeout(() => resolve(), 1000));
    const attachmentAfterRemove = await FileAttachment.findOne({
      where: { id: attachment.id }
    });

    expect(attachmentAfterRemove).toBeNull();
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it('keeps the files younger than 24 hours and their database entry even if not associated with a hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1h after now
    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate
    });
    await FileService.removeUnusedAttachments();

    // fakely advance by 24h to trigger the execution of removeUnusedAttachments
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5 * 1000);
    jest.useRealTimers(); // come back to real time (now)

    // NOTE: I don't think if the following line is necessary in this test
    // await new Promise((resolve) => setTimeout(() => resolve(), 1000));
    const attachmentAfterRemove = await FileAttachment.findOne({
      where: { id: attachment.id }
    });

    expect(attachmentAfterRemove).not.toBeNull();
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  // fit('keeps the files younger than 24 hours and their database entry even if not associated with a hoax', async () => {
  //   jest.useFakeTimers();
  //   fs.copyFileSync(testFile, targetPath);
  //   const uploadDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
  //   const attachment = await FileAttachment.create({
  //     filename: filename,
  //     uploadDate: uploadDate
  //   });
  //   await FileService.removeUnusedAttachments();

  //   jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5 * 1000);

  //   jest.useRealTimers();

  //   const attachmentAfterRemove = await FileAttachment.findOne({
  //     where: { id: attachment.id }
  //   });

  //   await new Promise((resolve) => setTimeout(() => resolve(), 1000));
  //   expect(attachmentAfterRemove).not.toBeNull();
  //   expect(fs.existsSync(targetPath)).toBe(true);
  // });
});
