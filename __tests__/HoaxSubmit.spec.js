const bcrypt = require('bcrypt');
const request = require('supertest');
const path = require('path');

const app = require('../src/app');
const FileAttachment = require('../src/file/FileAttachment');
const Hoax = require('../src/hoax/Hoax');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  // NOTE: because we included `userId` field as a foreignKey in User-Token
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false
};

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;

  return await User.create(user); // return the created user object
};

const postHoax = async (body = null, options = {}) => {
  let agent = request(app);

  let token; // undefined
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).post('/api/1.0/hoaxes');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send(body);
};

const uploadFile = (file = 'test-png.png', options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
};

describe.skip('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_submit}
    ${'fr'}  | ${fr.unauthorized_hoax_submit}
  `(
    `returns error body with "$message" when unauthorized request sent with language $language`,
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await postHoax(null, { language });
      const error = response.body;

      expect(error.path).toBe('/api/1.0/hoaxes');
      expect(error.message).toBe(message);
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
    }
  );

  it('returns 200 OK when valid hoax submitted with authorized user', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'Hoax content' },
      { auth: credentials }
    );

    expect(response.status).toBe(200);
  });

  it('saves the hoax to database when authorized user sends valid request', async () => {
    await addUser();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();

    expect(hoaxes.length).toBe(1);
  });

  it('saves the hoax content and timestamp to database', async () => {
    await addUser();
    const beforeSubmit = Date.now();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];

    expect(savedHoax.content).toBe('Hoax content');
    expect(savedHoax.timestamp).toBeGreaterThan(beforeSubmit);
    expect(savedHoax.timestamp).toBeLessThan(Date.now());
  });

  it.each`
    language | message
    ${'en'}  | ${en.hoax_submit_success}
    ${'fr'}  | ${fr.hoax_submit_success}
  `(
    `returns "$message" to success submit when language is $language`,
    async ({ language, message }) => {
      await addUser();
      const response = await postHoax(
        { content: 'Hoax content' },
        { auth: credentials, language }
      );

      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'en'}  | ${en.validation_failure}
    ${'fr'}  | ${fr.validation_failure}
  `(
    `returns 400 Bad Request and "$message" when hoax content is less than 10 characters and language is $language`,
    async ({ language, message }) => {
      await addUser();
      const response = await postHoax(
        { content: '123456789' },
        { auth: credentials, language }
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns validation error body when an invalid hoax is posted by authorized user', async () => {
    await addUser();
    const nowInMillis = Date.now();
    const response = await postHoax(
      { content: '123456789' },
      { auth: credentials }
    );
    const error = response.body;

    expect(error.path).toBe('/api/1.0/hoaxes');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual([
      'path',
      'timestamp',
      'message',
      'validationErrors'
    ]);
  });

  it.each`
    language | content             | descriptionOfContent | message
    ${'en'}  | ${null}             | ${'null'}            | ${en.hoax_content_size}
    ${'en'}  | ${'a'.repeat(9)}    | ${'short'}           | ${en.hoax_content_size}
    ${'en'}  | ${'a'.repeat(5001)} | ${'very long'}       | ${en.hoax_content_size}
    ${'fr'}  | ${null}             | ${'null'}            | ${fr.hoax_content_size}
    ${'fr'}  | ${'a'.repeat(9)}    | ${'short'}           | ${fr.hoax_content_size}
    ${'fr'}  | ${'a'.repeat(5001)} | ${'very long'}       | ${fr.hoax_content_size}
  `(
    `returns "$message" when the content is $descriptionOfContent and language is $language`,
    async ({ language, content, message }) => {
      await addUser();
      const response = await postHoax(
        { content: content },
        { auth: credentials, language }
      );

      expect(response.body.validationErrors.content).toBe(message);
    }
  );

  it('stores hoax owner id in database', async () => {
    const user = await addUser();
    await postHoax({ content: 'Hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];

    expect(hoax.userId).toBe(user.id);
  });

  it('associates hoax with attachment in database', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      { content: 'Hoax content', fileAttachment: uploadedFileId },
      { auth: credentials }
    );
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];

    const attachmentInDB = await FileAttachment.findOne({
      where: { id: uploadedFileId }
    });

    expect(attachmentInDB.hoaxId).toBe(hoax.id);
  });

  it('returns 200 OK even if the attachment does not exist', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'Hoax content', fileAttachment: 1000 },
      { auth: credentials }
    );

    expect(response.status).toBe(200);
  });

  it('keeps the old associated hoax when new hoax submitted with old attachment id', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      { content: 'Hoax content', fileAttachment: uploadedFileId },
      { auth: credentials }
    );
    const attachment = await FileAttachment.findOne({
      where: { id: uploadedFileId }
    });
    await postHoax(
      { content: 'Another hoax content', fileAttachment: uploadedFileId },
      { auth: credentials }
    );
    const attachmentAfterSecondPost = await FileAttachment.findOne({
      where: { id: uploadedFileId }
    });

    expect(attachment.hoaxId).toBe(attachmentAfterSecondPost.hoaxId);
  });
});
