const sequelize = require('../config/database');
const Token = require('../auth/Token');
const TokenService = require('../auth/TokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // NOTE: There will be no users in these test cases, it is therefore
  // OK to use `{ truncate: true }` option to clean Token table.
  await Token.destroy({ truncate: true });
});

describe('Scheduled Token Cleanup', () => {
  it('clears the expired token with scheduled task', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({
      token: token,
      // no need to add userId
      lastUsedAt: eightDaysAgo
    });

    TokenService.scheduleCleanup();
    // fake advance of time by 1h + 5seconds
    jest.advanceTimersByTime(1 * 60 * 60 * 1000 + 5000);
    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB).toBeNull();
  });
});
