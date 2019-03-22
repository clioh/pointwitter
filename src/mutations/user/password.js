const { UserInputError } = require('apollo-server-micro');

const { TWILIO_SID, TWILIO_TOKEN } = process.env;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const client = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
const sgMail = require('@sendgrid/mail');

const { APP_SECRET, getUserID } = require('../../utils');

sgMail.setApiKey(process.env.SENDGRID_KEY);

async function sendResetText(phoneNumber, resetToken) {
  return client.messages.create({
    body: `Your password token is ${resetToken}`,
    from: '+17122276468',
    to: `+1${phoneNumber}`,
  });
}

async function sendResetEmail(recipient, resetToken) {
  const msg = {
    to: recipient,
    from: 'clio@clioharper.xyz',
    subject: 'Your Pointwitter password reset',
    html: `Hi there! <br /> It looks like you've requested a password reset.
    If you didn't, please ignore this email.
    If you did, your token is: <strong>${resetToken}</strong><br />
    Go ahead and throw that sucker in the resetPassword mutation and we'll get your password reset`,
  };
  const res = await sgMail.send(msg);
  console.log(res);
}

async function requestPasswordReset(_, { email, phoneNumber }, { prisma }) {
  if (!email && !phoneNumber) {
    throw new UserInputError('Must supply either email or phone number');
  }
  let user;
  if (email) {
    user = await prisma.user({ email });
  } else {
    const phoneNumberFormatted = phoneNumber.replace(/\D/g, '');
    user = await prisma.user({ phoneNumber: phoneNumberFormatted });
  }
  if (!user) {
    return "If such a user exists, we'll get a reset token to them";
  }
  console.log('Here');
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
  if (email) {
    await sendResetEmail(user.email, token);
  } else {
    await sendResetText(user.phoneNumber, token);
  }

  return "If such a user exists, we'll get a reset token to them. If you entered an email and you're not seeing it, it could be in your spam folder.";
}

async function resetPassword(_, { resetToken, newPassword }, context) {
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
}

module.exports = { requestPasswordReset, resetPassword };
