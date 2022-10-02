const fs = require('fs');
const path = require('path');
const config = require('config');
const { randomString } = require('../shared/generator');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

const saveProfileImage = (base64File) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  // fs.writeFileSync(filePath, base64File, { encoding: 'base64' });
  return new Promise((resolve) => {
    fs.writeFile(filePath, base64File, 'base64', (error) => {
      if (!error) {
        resolve(filename);
      } else {
        // nothing to do for now
      }
    });
  });
};

module.exports = { createFolders, saveProfileImage };
