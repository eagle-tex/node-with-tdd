const FileService = require('../file/FileService');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir } = config;

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();

    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('creates profile folder under upload folder', () => {
    FileService.createFolders();
    // const testFolder = path.join(__dirname, '..', '..', 'upload', 'profile');
    // console.log({ testFolder });

    const profileFolder = path.join('.', uploadDir, profileDir);
    console.log({ profileFolder });

    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
