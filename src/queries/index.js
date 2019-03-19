const { UserInputError } = require('apollo-server-micro');
const { getUserID } = require('../utils');

const Queries = {
  async posts(_, { userID }, { prisma }) {
    const userExists = await prisma.$exists.user({ id: userID });
    if (!userExists) {
      throw new UserInputError('No user with that ID');
    }
    return prisma.user({ id: userID }).posts({ where: { deleted: false } });
  },
  async feed(_, params, context) {
    const { prisma } = context;
    const userID = await getUserID(context);

    const following = await prisma.user({ id: userID }).following();
    const followingIDs = following.map(user => user.id);

    return prisma.posts({
      where: {
        user: { id_in: followingIDs },
        deleted: false,
      },
    });
  },
};

module.exports = Queries;
