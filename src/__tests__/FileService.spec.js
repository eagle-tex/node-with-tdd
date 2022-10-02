const FileService = require('../file/FileService');
const fs = require('fs');

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();
    const folderName = 'upload';

    expect(fs.existsSync(folderName)).toBe(true);
  });
});
