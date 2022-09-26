const TokenService = require('../auth/TokenService');

const tokenAuthentication = async (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.substring(7);
    try {
      const user = await TokenService.verifyToken(token);
      req.authenticatedUser = user;
    } catch (err) {
      // NOTE: We do not need to do anything here
      // if we don't have an authenticated user,
      // our handlers (PUT route handler) will be acting accordingly.
      // i.e returning ForbiddenException('unauthorized_user_update')
      // src/user/UserRouter.js -> router.put -> Line 100
    }
  }

  next();
};

module.exports = tokenAuthentication;
