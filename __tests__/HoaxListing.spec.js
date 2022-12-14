const request = require('supertest');
const app = require('../src/app');
const FileAttachment = require('../src/file/FileAttachment');
const Hoax = require('../src/hoax/Hoax');
const User = require('../src/user/User');
const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');

beforeEach(async () => {
  // NOTE: because we included `userId` field as a foreignKey in User-Hoax
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});

const addFileAttachment = async (hoaxId) => {
  await FileAttachment.create({
    filename: `test-file-for-hoax-${hoaxId}`,
    fileType: 'image/png',
    hoaxId
  });
};

describe('Listing All Hoaxes', () => {
  const getHoaxes = () => {
    const agent = request(app).get('/api/1.0/hoaxes');
    return agent;
  };

  const addHoaxes = async (count) => {
    const hoaxIds = [];
    for (let i = 0; i < count; i++) {
      const user = await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`
      });

      const hoax = await Hoax.create({
        content: `hoax content ${i + 1}`,
        timestamp: Date.now(),
        userId: user.id
      });
      hoaxIds.push(hoax.id);
    }

    return hoaxIds;
  };

  it('returns 200 OK when there are no hoaxes in database', async () => {
    const response = await getHoaxes();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getHoaxes();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });

  it('returns 10 hoaxes in page content when there all 11 hoaxes in database', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();

    expect(response.body.content.length).toBe(10);
  });

  it('returns only id, content, timestamp and user object having id, username, email and image in content array for each hoax', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);

    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
  });

  it('returns fileAttachment having filename, filetype if hoax has any', async () => {
    const hoaxIds = await addHoaxes(1);
    await addFileAttachment(hoaxIds[0]);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);

    expect(hoaxKeys).toEqual([
      'id',
      'content',
      'timestamp',
      'user',
      'fileAttachment'
    ]);

    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'fileType']);
  });

  it('returns 2 as totalPages when there are 11 hoaxes', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();

    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page hoaxes and page indicator when page is set as 1 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: 1 });

    expect(response.body.content[0].content).toBe('hoax content 1');
    expect(response.body.page).toBe(1);
  });

  it('returns first page hoaxes when page is below 0 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ page: -5 });

    expect(response.body.page).toBe(0);
  });

  it('returns 5 hoaxes and corresponding size indicator when size is set to 5 in request parameter', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 5 });

    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 1000', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 1000 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 0', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 0 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as 0 and size as 10 when non numeric query params provided for both', async () => {
    await addHoaxes(11);
    const response = await getHoaxes().query({ size: 'size', page: 'page' });

    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes ordered from new to old', async () => {
    await addHoaxes(11);
    const response = await getHoaxes();
    const firstHoax = response.body.content[0];
    const lastHoax = response.body.content[9];

    expect(firstHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});

describe('Listing Hoaxes of a User', () => {
  const getHoaxes = (id) => {
    const agent = request(app).get(`/api/1.0/users/${id}/hoaxes`);
    return agent;
  };

  const addUser = async (name = 'user1') => {
    return await User.create({
      username: name,
      email: `${name}@mail.com`
    });
  };

  const addHoaxes = async (count, userId) => {
    const hoaxIds = [];
    for (let i = 0; i < count; i++) {
      const hoax = await Hoax.create({
        content: `hoax content ${i + 1}`,
        timestamp: Date.now(),
        userId: userId
      });
      hoaxIds.push(hoax.id);
    }

    return hoaxIds;
  };

  it('returns 200 OK when there are no hoaxes in database', async () => {
    const user = await addUser();
    const response = await getHoaxes(user.id);
    expect(response.status).toBe(200);
  });

  it('returns 404 Not Found when user does not exist', async () => {
    const response = await getHoaxes(5);
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'en'}  | ${en.user_not_found}
    ${'fr'}  | ${fr.user_not_found}
  `(
    `returns error object with "$message" for unknown user when language is $language`,
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await getHoaxes(5).set('Accept-Language', language);
      const error = response.body;

      expect(error.message).toBe(message);
      expect(error.path).toBe('/api/1.0/users/5/hoaxes');
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
    }
  );

  it('returns page object as response body', async () => {
    const user = await addUser();
    const response = await getHoaxes(user.id);
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0
    });
  });

  it('returns 10 hoaxes in page content when there all 11 hoaxes in database', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);

    expect(response.body.content.length).toBe(10);
  });

  it('returns 5 hoaxes belonging to user in page content when there are 11 hoaxes total for two users', async () => {
    const user = await addUser();
    await addHoaxes(5, user.id);
    const user2 = await addUser('user2');
    await addHoaxes(6, user2.id);

    const response = await getHoaxes(user.id);
    expect(response.body.content.length).toBe(5);
  });

  it('returns only id, content, timestamp and user object having id, username, email and image in content array for each hoax', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);

    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
  });

  it('returns fileAttachment having filename, filetype if hoax has any', async () => {
    const user = await addUser();
    const hoaxIds = await addHoaxes(1, user.id);
    await addFileAttachment(hoaxIds[0]);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);

    expect(hoaxKeys).toEqual([
      'id',
      'content',
      'timestamp',
      'user',
      'fileAttachment'
    ]);

    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'fileType']);
  });

  it('returns 2 as totalPages when there are 11 hoaxes', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);

    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page hoaxes and page indicator when page is set as 1 in request parameter', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: 1 });

    expect(response.body.content[0].content).toBe('hoax content 1');
    expect(response.body.page).toBe(1);
  });

  it('returns first page hoaxes when page is below 0 in request parameter', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: -5 });

    expect(response.body.page).toBe(0);
  });

  it('returns 5 hoaxes and corresponding size indicator when size is set to 5 in request parameter', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 5 });

    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 1000', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 1000 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 hoaxes and corresponding size indicator when size is set as 0', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 0 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as 0 and size as 10 when non numeric query params provided for both', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({
      size: 'size',
      page: 'page'
    });

    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes ordered from new to old', async () => {
    const user = await addUser();
    await addHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    const firstHoax = response.body.content[0];
    const lastHoax = response.body.content[9];

    expect(firstHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});
