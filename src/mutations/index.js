const sharp = require("sharp");
const { PassThrough } = require("stream");

const { UserInputError, AuthenticationError } = require("apollo-server-micro");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APP_SECRET, getUserID } = require("../utils");

const Mutation = {
  async signup(_, { password, email, phoneNumber, ...rest }, { prisma }) {
    // We only require on of these two, but obviously we need one
    if (!email && !phoneNumber) {
      return UserInputError("Must register with either email or phone number");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.createUser({
      password: hashedPassword,
      email,
      phoneNumber,
      ...rest
    });

    const iat = Date.now();
    // We're just going to make tokens valid for 24 hours
    const exp = Date.now() + 24 * 60 * 60 * 1000;

    const token = jwt.sign(
      {
        userID: user.id,
        iat,
        exp
      },
      APP_SECRET
    );
    await prisma.createToken({ token, iat, exp });
    return {
      token,
      user
    };
  },
  async login(_, { email, phoneNumber, password }, { prisma }) {
    // Becasue we allow users to sign in with either email or phone number, we need to check both.
    // We're going to prefer email to phone if they provide but it doesn't really matter
    let user;
    if (email) {
      user = await prisma.user({ email });
    } else if (phoneNumber) {
      user = await prisma.user({ phoneNumber });
    }
    // For all these, we are going to provide a generic error response as not to let people test for logins maliciously
    if (!user) {
      throw new UserInputError("Invalid email/phone or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UserInputError("Invalid email/phone or password");
    }

    const iat = Date.now();
    // We're just going to make tokens valid for 24 hours
    const exp = Date.now() + 24 * 60 * 60 * 1000;

    const token = jwt.sign(
      {
        userID: user.id,
        iat,
        exp
      },
      APP_SECRET
    );
    await prisma.createToken({ token, iat: String(iat), exp: String(exp) });

    return {
      token,
      user
    };
  },
  async logout(_, { userID }, { req, prisma }) {
    const Authorization = req.headers.authorization;
    if (!Authorization) {
      throw new UserInputError("No token to sign out");
    }

    const token = Authorization.replace("Bearer ", "");

    try {
      // Invalidate the token in the DB
      const res = await prisma.updateToken({
        where: { token },
        data: { blacklisted: true }
      });
      return "Success";
    } catch (e) {
      // Catch if we can't find the token
      throw new Error("Unable to log user out");
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
        user: { connect: { id: userID } }
      });
      pubsub.publish(POST_ADDED, {
        postAdded: { ...post, user: { id: userID } }
      });
      return post;
    }

    const post = await prisma.createPost({
      body: postBody,
      user: { connect: { id: userID } }
    });
    pubsub.publish(POST_ADDED, {
      postAdded: { ...post, user: { id: userID } }
    });
    return post;
  },
  async updatePost(_, { postUpdate, uploadUpdate, postID }, context) {
    const { prisma } = context;
    const userID = await getUserID(context);
    const postBelongsToUser = await prisma.$exists.post({
      AND: [
        {
          id: postID
        },
        {
          user: { id: userID }
        }
      ]
    });

    if (!postBelongsToUser) {
      throw new AuthenticationError("This isn't your post!");
    }

    if (uploadUpdate) {
      const mediaUrl = await uploadMedia(uploadUpdate);
      return prisma.updatePost({
        body: postBody,
        mediaUrl,
        user: { connect: { id: userID } }
      });
    }

    return prisma.updatePost({
      where: { id: postID },
      data: { body: postUpdate }
    });
  },
  async deletePost(_, { postID }, context) {
    const { prisma } = context;
    const userID = getUserID(context);
    const postBelongsToUser = await prisma.$exists.post({
      AND: [
        {
          id: postID
        },
        {
          user: { id: userID }
        }
      ]
    });

    if (!postBelongsToUser) {
      throw new AuthenticationError("This isn't your post!");
    }

    return prisma.updatePost({
      where: { id: postID },
      data: { deleted: true }
    });
  },
  async followUser(_, { userID }, context) {
    const { prisma } = context;
    const requestingUserID = await getUserID(context);

    try {
      // Since my following someone implies that I'm followed by them, we also need to reflect that in the target's state
      await prisma.updateUser({
        where: { id: userID },
        data: { followers: { connect: { id: requestingUserID } } }
      });

      // First we're going to make this user follow the new userID they've just added
      return prisma.updateUser({
        where: { id: requestingUserID },
        data: {
          following: {
            connect: { id: userID }
          }
        }
      });
    } catch (e) {
      throw new UserInputError("cannot follow user");
    }
  },
  async unfollowUser(_, { userID }, context) {
    const { prisma } = context;
    const requestingUserID = await getUserID(context);
    try {
      // Since my following someone implies that I'm followed by them, we also need to reflect that in the target's state
      await prisma.updateUser({
        where: { id: userID },
        data: { followers: { disconnect: { id: requestingUserID } } }
      });

      // First we're going to make this user follow the new userID they've just added
      return prisma.updateUser({
        where: { id: requestingUserID },
        data: {
          following: {
            disconnect: { id: userID }
          }
        }
      });
    } catch (e) {
      throw new UserInputError("cannot unfollow user");
    }
  }
};

module.exports = Mutation;
