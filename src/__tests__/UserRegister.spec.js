const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../../locales/en/translation.json');
const fr = require('../../locales/fr/translation.json');
const config = require('config');

let lastMail = null;
let server = null;
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

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword'
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  }, 15000);

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  }, 15000);

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  }, 15000);

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword'
    });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword'
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns errors for both when username and email are null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword'
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(
      expect.arrayContaining(['username', 'email'])
    );
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'usr'}           | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'P4ssw'}         | ${en.password_size}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'1234567890'}    | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${en.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${en.password_pattern}
  `(
    'returns "$expectedMessage" when $field is $value',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword'
      };
      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${en.email_in_use} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(en.email_in_use);
  });

  it('returns errors for both username is null and email is already in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword'
    });

    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(
      expect.arrayContaining(['username', 'email'])
    );
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even if request body contains inactive: false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an account activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];

    expect(lastMail).toContain(validUser.email);
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sendind email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();

    expect(response.status).toBe(502);
  });

  it('returns "E-mail failure message when sendind email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();

    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();

    expect(users.length).toBe(0);
  });

  it('returns "Validation failure" message in error response body when validation fails', async () => {
    const response = await postUser({ ...validUser, username: null });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${fr.username_null}
    ${'username'} | ${'usr'}           | ${fr.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${fr.username_size}
    ${'email'}    | ${null}            | ${fr.email_null}
    ${'email'}    | ${'mail.com'}      | ${fr.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${fr.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${fr.email_invalid}
    ${'password'} | ${null}            | ${fr.password_null}
    ${'password'} | ${'P4ssw'}         | ${fr.password_size}
    ${'password'} | ${'alllowercase'}  | ${fr.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${fr.password_pattern}
    ${'password'} | ${'1234567890'}    | ${fr.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${fr.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${fr.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${fr.password_pattern}
  `(
    'returns "$expectedMessage" when $field is $value when language is set to French',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword'
      };
      user[field] = value;
      const response = await postUser(user, { language: 'fr' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${fr.email_in_use} when same email is already in use when language is set to French`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'fr' });
    expect(response.body.validationErrors.email).toBe(fr.email_in_use);
  });

  it(`returns success message "${fr.user_create_success}" when signup request is valid & language is French`, async () => {
    const response = await postUser({ ...validUser }, { language: 'fr' });
    expect(response.body.message).toBe(fr.user_create_success);
  });

  it(`returns "${fr.email_failure}" message when sendind email fails and language is set to French`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'fr' });

    expect(response.body.message).toBe(fr.email_failure);
  });

  it(`returns ${fr.validation_failure} message in error response body when validation fails and language is French`, async () => {
    const response = await postUser(
      { ...validUser, username: null },
      { language: 'fr' }
    );
    expect(response.body.message).toBe(fr.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();

    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();

    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    const users = await User.findAll();

    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();

    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'fr'}  | ${'wrong'}   | ${fr.account_activation_failure}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
    ${'fr'}  | ${'correct'} | ${fr.account_activation_success}
  `(
    `returns "$message" when token is $tokenStatus and language is $language`,
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-does-not-exist';
      if (tokenStatus === 'correct') {
        const users = await User.findAll();
        token = users[0].activationToken;
      }

      const response = await request(app)
        .post(`/api/1.0/users/token/${token}`)
        .set('Accept-Language', language)
        .send();

      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationErrors in response on validation failure', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;

    expect(Object.keys(body)).toEqual(
      expect.arrayContaining([
        'path',
        'timestamp',
        'message',
        'validationErrors'
      ])
    );
  });

  it('returns path, timestamp and message in response body when request fails w/o validation errors', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;

    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(['path', 'timestamp', 'message'])
    );
  });

  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;

    expect(body.path).toEqual(`/api/1.0/users/token/${token}`);
  });

  it('returns timestamp in milliseconds within 5 seconds in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;

    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
