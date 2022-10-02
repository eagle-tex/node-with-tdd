const fs = require('fs');

const createFolders = () => {
  fs.mkdirSync('upload');
};

module.exports = { createFolders };
