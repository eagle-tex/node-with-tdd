const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment = require('../src/file/FileAttachment');

beforeEach(async () => {
  // NOTE: because of the `onDelete: 'cascade'` added in the r/ship between
  //   Hoax and FileAttachment, it is not necessary to clear the fileAttachments
  //   table before clearing the users table
  // await FileAttachment.destroy({ truncate: true }); // DELETE this line

  // NOTE: because we included `userId` field as a foreignKey in User-Token
  //   relationship, the `{ truncate: true }` option would not be valid anymore
  //   the database will not allow a `{ truncate: true }`.
  //   we replace that with a `{ truncate: { cascade: true }}`
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

const addHoax = async (userId) => {
  return Hoax.create({
    content: `Hoax for user ${userId}`,
    timestamp: Date.now(),
    userId
  });
};

const addFileAttachment = async (hoaxId) => {
  return await FileAttachment.create({
    filename: 'random-file',
    uploadDate: new Date(),
    hoaxId
  });
};

const auth = async (options = {}) => {
  let token; // undefined
  const agent = request(app);
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  return token;
};

const deleteHoax = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/hoaxes/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send();
};

describe('Delete Hoax', () => {
  it('returns 403 when request is unauthorized', async () => {
    const response = await deleteHoax();

    expect(response.status).toBe(403);
  });

  it('returns 403 when token is invalid', async () => {
    const response = await deleteHoax(5, { token: 'abcde' });

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_delete}
    ${'fr'}  | ${fr.unauthorized_hoax_delete}
  `(
    'returns error body with "$message" for unauthorized delete request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteHoax(5, { language });

      expect(response.body.path).toBe('/api/1.0/hoaxes/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it("returns 403 when user tries to delete another user's hoax", async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const user2 = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com'
    });
    const token = await auth({
      auth: { email: user2.email, password: 'P4ssword' }
    });

    const response = await deleteHoax(hoax.id, { token });

    expect(response.status).toBe(403);
  });

  it('returns 200 OK when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });

    const response = await deleteHoax(hoax.id, { token });

    expect(response.status).toBe(200);
  });

  it('removes the hoax from database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });

    await deleteHoax(hoax.id, { token });
    const hoaxInDB = await Hoax.findOne({ where: { id: hoax.id } });

    expect(hoaxInDB).toBeNull();
  });

  it('removes the fileAttachment from database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const attachment = await addFileAttachment(hoax.id);
    const token = await auth({ auth: credentials });

    await deleteHoax(hoax.id, { token });
    const attachmentInDB = await FileAttachment.findOne({
      where: { id: attachment.id }
    });

    expect(attachmentInDB).toBeNull();
  });
});
