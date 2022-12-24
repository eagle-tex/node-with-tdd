const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const en = require('../locales/en/translation.json');
const fr = require('../locales/fr/translation.json');
const FileAttachment = require('../src/file/FileAttachment');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/database');

const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, _session, callback) {
      let mailBody = null;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    }
  });

  server.listen(config.mail.port, 'localhost'); // await ?

  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }

  // NOTE: drop the fileAttachments table before running this test suite
  // we do this only ONCE because the current suite does not depend on
  // the fileAttachments table, therefore we need to drop the table
  // from the database state received from the previous test suite `HoaxSubmit`
  await FileAttachment.destroy({ truncate: true });

  // to make all tests use the same timeout,
  // we set the timeout to 20 seconds at the end of beforeAll
  jest.setTimeout(20000);
});

// we use return to wait for the asynchronous function (User.destroy())
// to resolve before continuing
beforeEach(async () => {
  simulateSmtpFailure = false;
  // NOTE: because we included `userId` field as a foreignKey in User-Token
  // relationship, the `{ truncate: true }` option would not be valid anymore
  // the database will not allow a `{ truncate: true }`.
  // we replace that with a `{ truncate: { cascade: true }}`
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  // set timeout back to 5 seconds, at module end
  jest.setTimeout(5000);
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

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post('/api/1.0/user/password');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send({ email: email });
};

const PASSWORD_RESET_TOKEN = 'valid-test-token';

const putPasswordUpdate = (body = {}, options = {}) => {
  const agent = request(app).put('/api/1.0/user/password');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(body);
};

describe('Password Reset', () => {
  it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();

    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'en'}  | ${en.email_not_in_use}
    ${'fr'}  | ${fr.email_not_in_use}
  `(
    'returns error body with "$message" for unknown e-mail for password reset request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', {
        language: language
      });

      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'en'}  | ${en.email_invalid}
    ${'fr'}  | ${fr.email_invalid}
  `(
    'returns 404 with validation error having "$message" when request does not have valid e-mail and language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, {
        language: language
      });

      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200 OK when a password resest request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);

    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'en'}  | ${en.password_reset_request_success}
    ${'fr'}  | ${fr.password_reset_request_success}
  `(
    'returns success response body with "$message" for known e-mail for password reset request when language is set as $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });

      expect(response.body.message).toBe(message);
    }
  );

  it('creates passwordResetToken when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });

    expect(userInDB.passwordResetToken).toBeTruthy();
  });

  it('sends a password reset e-mail with passwordResetToken', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB.passwordResetToken;

    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('returns 502 Bad Gateway when sending e-mail fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    await postPasswordReset(user.email);
    const response = await postPasswordReset(user.email);

    expect(response.status).toBe(502);
  });

  it.each`
    language | message
    ${'en'}  | ${en.email_failure}
    ${'fr'}  | ${fr.email_failure}
  `(
    'returns "$message" after e-mail failure when language is set as $language',
    async ({ language, message }) => {
      simulateSmtpFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });

      expect(response.body.message).toBe(message);
    }
  );
});

describe('Password Update', () => {
  it('returns 403 when password update request does not have the valid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: 'P4ssword',
      passwordResetToken: 'abcd'
    });

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_password_reset}
    ${'fr'}  | ${fr.unauthorized_password_reset}
  `(
    'returns error body with "$message" when language is set to $language after trying to update password with invalid token',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        {
          password: 'P4ssword',
          passwordResetToken: 'abcd'
        },
        { language }
      );

      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 when password update request with invalid password pattern and the reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'abcd'
    });

    expect(response.status).toBe(403);
  });

  it('returns 400 when trying to update with invalid password and the reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'valid-test-token';
    await user.save();

    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'valid-test-token'
    });

    expect(response.status).toBe(400);
  });

  it.each`
    language | value              | message
    ${'en'}  | ${null}            | ${en.password_null}
    ${'en'}  | ${'P4ssw'}         | ${en.password_size}
    ${'en'}  | ${'alllowercase'}  | ${en.password_pattern}
    ${'en'}  | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'en'}  | ${'1234567890'}    | ${en.password_pattern}
    ${'en'}  | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'en'}  | ${'lower4nd5667'}  | ${en.password_pattern}
    ${'en'}  | ${'UPPER44444'}    | ${en.password_pattern}
    ${'fr'}  | ${null}            | ${fr.password_null}
    ${'fr'}  | ${'P4ssw'}         | ${fr.password_size}
    ${'fr'}  | ${'alllowercase'}  | ${fr.password_pattern}
    ${'fr'}  | ${'ALLUPPERCASE'}  | ${fr.password_pattern}
    ${'fr'}  | ${'1234567890'}    | ${fr.password_pattern}
    ${'fr'}  | ${'lowerandUPPER'} | ${fr.password_pattern}
    ${'fr'}  | ${'lower4nd5667'}  | ${fr.password_pattern}
    ${'fr'}  | ${'UPPER44444'}    | ${fr.password_pattern}
  `(
    'returns password validation error "$message" when language is set to $language and password is "$value"',
    async ({ language, value, message }) => {
      const user = await addUser();
      user.passwordResetToken = PASSWORD_RESET_TOKEN;
      await user.save();

      const response = await putPasswordUpdate(
        {
          password: value,
          passwordResetToken: PASSWORD_RESET_TOKEN
        },
        { language }
      );

      expect(response.body.validationErrors.password).toBe(message);
    }
  );

  it('returns 200 OK when valid password is sent with valid reset token', async () => {
    const user = await addUser();
    user.passwordResetToken = PASSWORD_RESET_TOKEN;
    await user.save();

    const response = await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: PASSWORD_RESET_TOKEN
    });

    expect(response.status).toBe(200);
  });

  it('updates the password in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = PASSWORD_RESET_TOKEN;
    await user.save();

    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: PASSWORD_RESET_TOKEN
    });

    const userInDB = await User.findOne({ where: { email: user.email } });

    expect(userInDB.password).not.toEqual(user.password);
  });

  it('clears the reset token in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = PASSWORD_RESET_TOKEN;
    await user.save();

    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: PASSWORD_RESET_TOKEN
    });

    const userInDB = await User.findOne({ where: { email: user.email } });

    expect(userInDB.passwordResetToken).toBeFalsy();
  });

  it('activates and clears activation token after valid password request if the account is inactive', async () => {
    const user = await addUser();
    user.passwordResetToken = PASSWORD_RESET_TOKEN;
    user.activationToken = 'activation-token';
    user.inactive = true;
    await user.save();

    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: PASSWORD_RESET_TOKEN
    });

    const userInDB = await User.findOne({ where: { email: user.email } });

    expect(userInDB.activationToken).toBeFalsy();
    expect(userInDB.inactive).toBe(false);
  });

  it('clears all tokens of user after valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = PASSWORD_RESET_TOKEN;
    await user.save();

    await Token.create({
      token: 'token1',
      userId: user.id,
      lastUsedAt: Date.now()
    });

    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: PASSWORD_RESET_TOKEN
    });

    const tokens = await Token.findAll({ where: { userId: user.id } });

    expect(tokens.length).toBe(0);
  });
});
