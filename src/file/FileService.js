const fs = require('fs');
const path = require('path');
const config = require('config');
const FileType = require('file-type');
const Sequelize = require('sequelize');

const { randomString } = require('../shared/generator');
const FileAttachment = require('./FileAttachment');

const { uploadDir, profileDir, attachmentDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }

  if (!fs.existsSync(attachmentFolder)) {
    fs.mkdirSync(attachmentFolder);
  }
};

const saveProfileImage = async (base64File) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filePath, base64File, 'base64');

  return filename;
};

const deleteProfileImage = async (filename) => {
  const filePath = path.join(profileFolder, filename);
  await fs.promises.unlink(filePath);
};

const isLessThan2MB = (buffer) => {
  return buffer.length < 2 * 1024 * 1024;
};

const isSupportedFileType = async (buffer) => {
  const type = await FileType.fromBuffer(buffer);

  return !type
    ? false
    : type.mime === 'image/png' || type.mime === 'image/jpeg';
};

const saveAttachment = async (file) => {
  const type = await FileType.fromBuffer(file.buffer);
  let filename = randomString(32);
  let fileType; // undefined
  if (type) {
    fileType = type.mime;
    filename += `.${type.ext}`;
  }

  await fs.promises.writeFile(
    path.join(attachmentFolder, filename),
    file.buffer
  );

  const savedAttachment = await FileAttachment.create({
    filename,
    uploadDate: new Date(),
    fileType: fileType
  });

  return {
    id: savedAttachment.id
  };
};

const associateFileToHoax = async (attachmentId, hoaxId) => {
  const attachment = await FileAttachment.findOne({
    where: { id: attachmentId }
  });
  if (!attachment) {
    return;
  }

  if (attachment.hoaxId) {
    return;
  }

  attachment.hoaxId = hoaxId;
  await attachment.save();
};

const removeUnusedAttachments = async () => {
  const oneDayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attachments = await FileAttachment.findAll({
    where: {
      uploadDate: {
        [Sequelize.Op.lt]: oneDayOld
      },
      hoaxId: {
        [Sequelize.Op.is]: null
      }
    }
  });

  for (let attachment of attachments) {
    const { filename } = attachment.get({ plain: true });
    await fs.promises.unlink(path.join(attachmentFolder, filename));
    await attachment.destroy();
  }
};

module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  isLessThan2MB,
  isSupportedFileType,
  saveAttachment,
  associateFileToHoax,
  removeUnusedAttachments
};
