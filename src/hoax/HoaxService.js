const Hoax = require('./Hoax');

const save = async (body, user) => {
  const hoax = {
    content: body.content,
    timestamp: Date.now(),
    userId: user.id
  };
  await Hoax.create(hoax);
};

const getHoaxes = async (page, size) => {
  const hoaxesWithCount = await Hoax.findAndCountAll({
    limit: size,
    offset: page * size
  });

  return {
    content: hoaxesWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(hoaxesWithCount.count / size)
  };
};

module.exports = { save, getHoaxes };
