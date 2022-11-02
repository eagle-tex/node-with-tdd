const Hoax = require('./Hoax');

const save = async (body) => {
  await Hoax.create(body);
};

module.exports = { save };
