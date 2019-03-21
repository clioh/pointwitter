const { UserInputError } = require('apollo-server-micro');
const { getUserID } = require('../utils');

const Queries = {
  async posts(_, { userID, skip, first }, { prisma }) {
    const userExists = await prisma.$exists.user({ id: userID });
    if (!userExists) {
      throw new UserInputError('No user with that ID');
    }
    const posts = await prisma
      .user({ id: userID })
      .posts({ where: { deleted: false }, skip, first });
    return posts.map(post => ({ postedBy: userID, ...post }));
  },
  async feed(_, { skip, first }, context) {
    const { prisma } = context;
    const userID = await getUserID(context);

    const following = await prisma.user({ id: userID }).following();
    const followingIDs = following.map(user => user.id);

    const posts = await prisma.posts({
      where: {
        user: { id_in: followingIDs },
        deleted: false,
      },
      skip,
      first,
    }).$fragment(`
    fragment PostWithAuthorsAndComments on Post {
      id
      user {
        id
      }
      body
      mediaUrl
      createdAt
      updatedAt
      deleted
    }
  `);

    return posts.map(post => ({ postedBy: post.user.id, ...post }));
  },
  async user(_, args, { prisma }) {
    /* In order to let users specify multiple search params, we need to convert the
    arguments into an array */
    const argsArray = Object.keys(args).map((argKey) => {
      // Deals with inconsistency in searching for phone numbers just like we did on mutations
      if (argKey === 'phoneNumber') {
        return { [argKey]: args[argKey].replace(/\D/g, '') };
      }
      return { [argKey]: args[argKey] };
    });
    const users = await prisma.users({ where: { AND: argsArray } })
      .$fragment(`fragment UserWithRelationships on User {
      id
      name
      email
      phoneNumber
      posts {
        id
        user {
          id
        }
        body
        mediaUrl
        createdAt
        updatedAt
        deleted
      }
      followers {
        id
        name
        email
        phoneNumber
        createdAt
        updatedAt
      }
      following {
        id
        name
        email
        phoneNumber
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }`);

    return users.map(user => ({
      posts: user.posts.map(post => ({ postedBy: post.user.id, ...post })),
      ...user,
    }));
  },
};

module.exports = Queries;
