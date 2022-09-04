const request = require('supertest');
const app = require('../app');
const User = require('../user/User');
const sequelize = require('../config/database');
const SMTPServer = require('smtp-server').SMTPServer;

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

  server.listen(8587, 'localhost'); // await ?

  await sequelize.sync();
});

// we use return to wait for the asynchronous function (User.destroy())
// to resolve before continuing
beforeEach(() => {
  simulateSmtpFailure = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
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
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

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

  const username_null = 'Username cannot be null';
  const username_size = 'Must have min 4 and max 32 characters';
  const email_null = 'E-mail cannot be null';
  const email_invalid = 'E-mail is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_pattern =
    'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';
  const email_in_use = 'E-mail already in use';
  const email_failure = 'E-mail failure';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'1234567890'}    | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${password_pattern}
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

  it(`returns ${email_in_use} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(email_in_use);
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

  it('returns Email failure message when sendind email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();

    expect(response.body.message).toBe(email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();

    expect(users.length).toBe(0);
  });

  it('returns "Validation failure" message in error response body when validation fails', async () => {
    const response = await postUser({ ...validUser, username: null });
    expect(response.body.message).toBe('Validation failure');
  });
});

describe('Internationalization', () => {
  const username_null = "Le nom d'utilisateur ne peut pas être vide";
  const username_size = 'Doit avoir minimum 4 et maximum 32 lettres';
  const email_null = "L'e-mail ne peut pas être vide";
  const email_invalid = 'E-mail invalide';
  const password_null = 'Le mot de passe ne peut pas être vide';
  const password_size = 'Le mot de passe doit avoir au moins 6 lettres';
  const password_pattern =
    'Le mot de passe doit avoir au moins 1 minuscule, 1 majuscule et 1 chiffre';
  const email_in_use = 'Cet e-mail est déjà utilisé';
  const user_create_success = 'Utilisateur créé';
  const email_failure = "Echec d'email";
  const validation_failure = 'Echec de validation';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'1234567890'}    | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${password_pattern}
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

  it(`returns ${email_in_use} when same email is already in use when language is set to French`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'fr' });
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it(`returns success message "${user_create_success}" when signup request is valid & language is French`, async () => {
    const response = await postUser({ ...validUser }, { language: 'fr' });
    expect(response.body.message).toBe(user_create_success);
  });

  it(`returns "${email_failure}" message when sendind email fails and language is set to French`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'fr' });

    expect(response.body.message).toBe(email_failure);
  });

  it(`returns ${validation_failure} message in error response body when validation fails and language is French`, async () => {
    const response = await postUser(
      { ...validUser, username: null },
      { language: 'fr' }
    );
    expect(response.body.message).toBe(validation_failure);
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
    ${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid'}
    ${'fr'}  | ${'wrong'}   | ${'Cet compte est soit actif ou le jeton est invalide'}
    ${'en'}  | ${'correct'} | ${'Account is activated'}
    ${'fr'}  | ${'correct'} | ${'Le compte est activé'}
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
    //
  });
});
