const FileService = require('../src/file/FileService');
const FileAttachment = require('../src/file/FileAttachment');
const Hoax = require('../src/hoax/Hoax');
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
  // console.log({ now: Date.now() });
  const testFile = path.join('.', '__tests__', 'resources', 'test-png.png');
  const targetPath = path.join(attachmentFolder, filename);

  beforeEach(async () => {
    await FileAttachment.destroy({ truncate: true });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    // console.log({
    //   where: '+++++ BEFORE_EACH +++++',
    //   BEFORE_EACH_testFileExists: fs.existsSync(testFile),
    //   BEFORE_EACH_targetPathExists: fs.existsSync(targetPath)
    // });
  });

  it('removes the 24 hours old file with attachment entry if not used in a hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    // console.log({
    //   where: '----- JUST AFTER FAKE TIMERS -----',
    //   testFileExists: fs.existsSync(testFile),
    //   targetPathExists: fs.existsSync(targetPath)
    // });

    // const uploadDate = new Date(Date.now() - (24 * 60 * 60 * 1000 + 1 * 1000));
    const uploadDate = new Date(Date.now() - 5 * 1000);
    console.log({
      where: '----- UPLOAD DATE - 5 SECONDS -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate
    });
    await FileService.removeUnusedAttachments();

    const attachmentInDB = await FileAttachment.findOne();
    console.log({
      where: '----- BEFORE ADVANCE TIMERS -----',
      attachmentsInDB: attachmentInDB.get({ plain: true })
    });

    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 0 * 5 * 1000);
    console.log({
      where: '----- AFTER ADVANCE TIMERS -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

    jest.useRealTimers();
    console.log({
      where: '----- WITH REAL TIMERS -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

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
    console.log({
      where: '----- JUST AFTER FAKE TIMERS -----',
      testFileExists: fs.existsSync(testFile),
      targetPathExists: fs.existsSync(targetPath)
    });

    // const uploadDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const uploadDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
    console.log({
      where: '----- UPLOAD DATE + 1 HOUR -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate
    });
    await FileService.removeUnusedAttachments();

    const attachmentInDB = await FileAttachment.findOne();
    console.log({
      where: '----- BEFORE ADVANCE TIMERS -----',
      attachmentsInDB: attachmentInDB.get({ plain: true })
    });

    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5 * 1000);
    console.log({
      where: '----- AFTER ADVANCE TIMERS -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

    jest.useRealTimers();
    console.log({
      where: '----- WITH REAL TIMERS -----',
      uploadDateAsDate: uploadDate,
      nowAsDate: new Date(Date.now())
    });

    const attachmentAfterRemove = await FileAttachment.findOne({
      where: { id: attachment.id }
    });
    console.log({
      attachmentAfterRemove: attachmentAfterRemove.get({ plain: true })
    });

    await new Promise((resolve) => setTimeout(() => resolve(), 1000));
    // expect.assertions(2);
    expect(attachmentAfterRemove).not.toBeNull();
    expect(fs.existsSync(targetPath)).toBe(true);
  });
});
