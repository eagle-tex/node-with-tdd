const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // NOTE: because we included `userId` field as a foreignKey in User-Token
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;

  return await User.create(user); // return the created user object
};

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);

  let token; // undefined
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(`/api/1.0/users/${id}`);

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

const readFileAsBase64 = () => {
  // const filePath = path.join('.', '__tests__', 'resources', 'test-png.png'); // not working
  const filePath = path.join(__dirname, 'resources', 'test-png.png');

  return fs.readFileSync(filePath, { encoding: 'base64' });
};

describe('User Update', () => {
  it('returns 403 Forbidden when request sent without basic authorization', async () => {
    const response = await putUser();

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_user_update}
    ${'fr'}  | ${fr.unauthorized_user_update}
  `(
    'returns error body with "$message" for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language });

      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 Forbidden when request sent with incorrect e-mail in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1000@mail.com', password: 'P4ssword' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 Forbidden when request sent with incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1@mail.com', password: 'password' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 Forbidden when update request is sent with correct credentials of another user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com'
    });

    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 403 Forbidden when update request is sent by inactive user with his correct credentials', async () => {
    const inactiveUser = await addUser({ ...activeUser, inactive: true });
    const response = await putUser(inactiveUser.id, null, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' }
    });

    expect(response.status).toBe(403);
  });

  it('returns 200 OK when valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    expect(response.status).toBe(200);
  });

  it('updates user in database when valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });

    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });

    expect(response.status).toBe(403);
  });

  it('saves the user image when update contains image as base64', async () => {
    const fileInBase64 = readFileAsBase64();

    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });

    expect(inDBUser.image).toBeTruthy();
  });

  it('returns success body having only id, username, email and image', async () => {
    const fileInBase64 = readFileAsBase64();

    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image'
    ]);
  });

  it('saves the user image to upload folder and stores filename in user when update has image', async () => {
    const fileInBase64 = readFileAsBase64();

    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    const profileImagePath = path.join(profileDirectory, inDBUser.image);

    expect(fs.existsSync(profileImagePath)).toBe(true);
  });

  it('removes the old image after user uploads new one', async () => {
    const fileInBase64 = readFileAsBase64();

    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const firstImage = response.body.image;

    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const profileImagePath = path.join(profileDirectory, firstImage);

    expect(fs.existsSync(profileImagePath)).toBe(false);
  });

  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.username_null}
    ${'en'}  | ${'usr'}          | ${en.username_size}
    ${'en'}  | ${'a'.repeat(33)} | ${en.username_size}
    ${'fr'}  | ${null}           | ${fr.username_null}
    ${'fr'}  | ${'usr'}          | ${fr.username_size}
    ${'fr'}  | ${'a'.repeat(33)} | ${fr.username_size}
  `(
    'returns Bad Request with "$message" when username is updated with "$value" and language is set as $language',
    async ({ language, value, message }) => {
      const savedUser = await addUser();
      const invalidUpdate = { username: value };
      const response = await putUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language
      });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );

  it('returns 200 OK when image size is exactly 2 MB', async () => {
    const fileWithSize2MB = 'a'.repeat(2 * 1024 * 1024);
    const base64 = Buffer.from(fileWithSize2MB).toString('base64');
    const savedUser = await addUser();
    const validUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    expect(response.status).toBe(200);
  });

  it('returns 400 when image size exceeds 2 MB', async () => {
    const fileExceeding2MB = 'a'.repeat(2 * 1024 * 1024) + 'a';
    const base64 = Buffer.from(fileExceeding2MB).toString('base64');
    const savedUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(savedUser.id, invalidUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    expect(response.status).toBe(400);
  });

  it('keeps the old image after user only updates username', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' }
    });

    const firstImage = response.body.image;

    await putUser(
      savedUser.id,
      { username: 'user1-updated2' },
      {
        auth: { email: savedUser.email, password: 'P4ssword' }
      }
    );

    const profileImagePath = path.join(profileDirectory, firstImage);

    expect(fs.existsSync(profileImagePath)).toBe(true);

    const userInDB = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDB.image).toBe(firstImage);
  });

  it.each`
    language | message
    ${'en'}  | ${en.profile_image_size}
    ${'fr'}  | ${fr.profile_image_size}
  `(
    'returns "$message" when file size exceeds 2 MB when language is $language',
    async ({ language, message }) => {
      const fileExceeding2MB = 'a'.repeat(2 * 1024 * 1024) + 'a';
      const base64 = Buffer.from(fileExceeding2MB).toString('base64');
      const savedUser = await addUser();
      const invalidUpdate = { username: 'updated-user', image: base64 };
      const response = await putUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language
      });

      expect(response.body.validationErrors.image).toBe(message);
    }
  );
});
