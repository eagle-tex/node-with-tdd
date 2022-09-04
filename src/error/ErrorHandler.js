module.exports = (err, req, res, _next) => {
  const { status, message, errors } = err;
  let validationErrors = null;

  if (errors) {
    validationErrors = {};
    errors.forEach((error) => {
      return (validationErrors[error.param] = req.t(error.msg));
    });
  }

  res.status(status).send({ message: req.t(message), validationErrors });
};
