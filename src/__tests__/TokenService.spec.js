const sequelize = require('../config/database');
const Token = require('../auth/Token');
// const TokenService = require('../auth/TokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // NOTE: There will be no users in these test cases, it is therefore
  // OK to use `{ truncate: true }` option to clean Token table.
  await Token.destroy({ truncate: true });
});

describe('Scheduled Token Cleanup', () => {
  it('tests if current test suite runs', () => {
    expect(1).toBe(2);
  });
});
