const { UserInputError, AuthenticationError } = require('apollo-server-micro');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET, getUserID } = require('../utils');
const { uploadMedia, sendResetEmail } = require('./utils');

const POST_ADDED = 'POST_ADDED';

const Mutation = {
  async signup(_, {
    password, email, phoneNumber, ...rest
  }, { prisma }) {
    // We only require one of these two, but obviously we need one
    if (!email && !phoneNumber) {
      return UserInputError('Must register with either email or phone number');
    }

    /* For the sake of consistency here, we're going to strip out
    everything but digits from the phone number */
    let phoneNumberFormatted;
    if (phoneNumber) {
      phoneNumberFormatted = phoneNumber.replace(/\D/g, '');
      if (phoneNumberFormatted === '') {
        throw new UserInputError('Invalid phone number');
      }
    }

    const emailExists = await prisma.$exists.user({ email });
    const phoneNumberExists = await prisma.$exists.user({ phoneNumber: phoneNumberFormatted });
    if (email && emailExists) {
      throw new UserInputError('User already exists');
    }
    if (phoneNumber && phoneNumberExists) {
      throw new UserInputError('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.createUser({
      password: hashedPassword,
      email,
      phoneNumber: phoneNumberFormatted,
      ...rest,
    });

    const iat = Date.now();
    const iatDateTime = new Date(iat).toISOString();
    // We're just going to make tokens valid for 24 hours
    const exp = Date.now() + 24 * 60 * 60 * 1000;
    const expDateTime = new Date(exp).toISOString();

    const token = jwt.sign(
      {
        userID: user.id,
        iat,
        exp,
      },
      APP_SECRET,
    );
    await prisma.createToken({ token, iat: iatDateTime, exp: expDateTime });

    return {
      token,
      user,
    };
  },
  async login(_, { email, phoneNumber, password }, { prisma }) {
    // Because we allow users to sign in with either email or phone number, we need to check both.
    // We're going to prefer email to phone if they provide but it doesn't really matter
    let user;
    if (email) {
      user = await prisma.user({ email });
    } else if (phoneNumber) {
      /* We'd most likely have front-end send up a property formatted phone number,
      but it doesn't hurt to double-check here */
      const phoneNumberFormatted = phoneNumber.replace(/\D/g, '');
      user = await prisma.user({ phoneNumber: phoneNumberFormatted });
    }

    /* For all these, we are going to provide a generic error response as not
    to let people test for logins maliciously */
    if (!user) {
      throw new UserInputError('Invalid email/phone or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UserInputError('Invalid email/phone or password');
    }

    const iat = Date.now();
    const iatDateTime = new Date(iat).toISOString();
    // We're just going to make tokens valid for 24 hours
    const exp = Date.now() + 24 * 60 * 60 * 1000;
    const expDateTime = new Date(exp).toISOString();

    const token = jwt.sign(
      {
        userID: user.id,
        iat,
        exp,
      },
      APP_SECRET,
    );
    await prisma.createToken({ token, iat: iatDateTime, exp: expDateTime });

    return {
      token,
      user,
    };
  },
  async logout(_, params, { req, prisma }) {
    const Authorization = req.headers.authorization;
    if (!Authorization) {
      throw new UserInputError('No token to sign out');
    }

    const token = Authorization.replace('Bearer ', '');

    try {
      // Invalidate the token in the DB
      await prisma.updateToken({
        where: { token },
        data: { blacklisted: true },
      });
      return 'Success';
    } catch (e) {
      // Catch if we can't find the token
      throw new Error('Unable to log user out');
    }
  },
  async createPost(_, { postBody, upload }, context) {
    const { prisma, pubsub } = context;
    const userID = await getUserID(context);
    // If there's a media upload, we need to handle the upload before we return
    if (upload) {
      const mediaUrl = await uploadMedia(upload);
      const post = prisma.createPost({
        body: postBody,
        mediaUrl,
        user: { connect: { id: userID } },
      });
      pubsub.publish(POST_ADDED, {
        postAdded: { ...post, user: { id: userID } },
      });
      return post;
    }

    const post = await prisma.createPost({
      body: postBody,
      user: { connect: { id: userID } },
    });
    pubsub.publish(POST_ADDED, {
      postAdded: { ...post, postedBy: userID },
    });
    return { ...post, postedBy: userID };
  },
  async updatePost(_, { postUpdate, uploadUpdate, postID }, context) {
    const { prisma } = context;
    const userID = await getUserID(context);
    const postBelongsToUser = await prisma.$exists.post({
      AND: [
        {
          id: postID,
        },
        {
          user: { id: userID },
        },
      ],
    });

    if (!postBelongsToUser) {
      throw new AuthenticationError("This isn't your post!");
    }

    if (uploadUpdate) {
      const mediaUrl = await uploadMedia(uploadUpdate);
      return prisma.updatePost({
        body: postUpdate,
        mediaUrl,
        user: { connect: { id: userID } },
      });
    }

    const post = await prisma.updatePost({
      where: { id: postID },
      data: { body: postUpdate },
    });

    return { postedBy: userID, ...post };
  },
  async deletePost(_, { postID }, context) {
    const { prisma } = context;
    const userID = getUserID(context);
    const postBelongsToUser = await prisma.$exists.post({
      AND: [
        {
          id: postID,
        },
        {
          user: { id: userID },
        },
      ],
    });

    if (!postBelongsToUser) {
      throw new AuthenticationError("This isn't your post!");
    }

    const post = await prisma.updatePost({
      where: { id: postID },
      data: { deleted: true },
    });

    return { postedBy: userID, ...post };
  },
  async followUser(_, { userID }, context) {
    const { prisma } = context;
    const requestingUserID = await getUserID(context);

    try {
      /* Since my following someone implies that I'm followed by them,
      we also need to reflect that in the target's state */
      await prisma.updateUser({
        where: { id: userID },
        data: { followers: { connect: { id: requestingUserID } } },
      });

      // First we're going to make this user follow the new userID they've just added
      return prisma.updateUser({
        where: { id: requestingUserID },
        data: {
          following: {
            connect: { id: userID },
          },
        },
      });
    } catch (e) {
      throw new UserInputError('Cannot follow user');
    }
  },
  async unfollowUser(_, { userID }, context) {
    const { prisma } = context;
    const requestingUserID = await getUserID(context);
    try {
      /* Since my following someone implies that I'm followed by them,
      we also need to reflect that in the target's state */
      await prisma.updateUser({
        where: { id: userID },
        data: { followers: { disconnect: { id: requestingUserID } } },
      });

      // First we're going to make this user follow the new userID they've just added
      return prisma.updateUser({
        where: { id: requestingUserID },
        data: {
          following: {
            disconnect: { id: userID },
          },
        },
      });
    } catch (e) {
      throw new UserInputError('Cannot unfollow user');
    }
  },
  async requestPasswordReset(_, { email }, { prisma }) {
    /* NOTE: This is a great place to use JWT's as
    their self contained nature allow you to validate
    without a lot of effort. It also means that the logic
    we use to validate requests can be used in the resetPassword function too! */
    const user = await prisma.user({ email });
    const iat = Date.now();
    // We're just going to make tokens valid for 1 hour
    const exp = Date.now() + 1 * 60 * 60 * 1000;

    const token = jwt.sign(
      {
        userID: user.id,
        iat,
        exp,
      },
      APP_SECRET,
    );
    /* In reality, this would be sent in an email,
    but setting up SES is outside the scope of this demo,
    so I'll just return it here */
    await sendResetEmail(user.email, token);
    return 'Success';
  },
  async resetPassword(_, { resetToken, newPassword }, context) {
    /* Perhaps we should compare the hash of the
    new password to the hash of the old password,
    but that doesn't seem strictly necessary */
    const { prisma } = context;
    const userID = await getUserID({ ...context, resetToken });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.updateUser({
      where: { id: userID },
      data: { password: hashedPassword },
    }).$fragment(`fragment UserWithPosts on User {
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
    /*
     If we get here, we've successfully reset the password and need to get rid of the token.
     This code is somewhat gross because I don't want to create a new table for reset tokens,
     which I'll do shortly and come back to
    */
    const now = new Date(Date.now()).toISOString();
    await prisma.createToken({
      token: resetToken,
      blacklisted: true,
      iat: now,
      exp: now,
    });
    return { posts: user.posts.map(post => ({ ...post, postedBy: post.user.id })), ...user };
  },
};

module.exports = Mutation;
