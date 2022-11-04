const Hoax = require('./Hoax');
const User = require('../user/User');
const NotFoundException = require('../error/NotFoundException');

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
    attributes: ['id', 'content', 'timestamp'],
    include: {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'image']
    },
    order: [['id', 'DESC']],
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

const getHoaxesOfUser = async (userId, page, size) => {
  const user = await User.findOne({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException('user_not_found');
  }

  const hoaxesWithCount = await Hoax.findAndCountAll({
    attributes: ['id', 'content', 'timestamp'],
    include: {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'image'],
      // NOTE: no way is better than the other. Just pay attention to
      // the property used in the `where` clause (1-'userId' or 2-'id')
      where: { id: userId } // seconday way (alternative to first way)
    },
    order: [['id', 'DESC']],
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

module.exports = { save, getHoaxes, getHoaxesOfUser };
