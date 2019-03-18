const { AuthenticationError } = require("apollo-server-micro");
const jwt = require("jsonwebtoken");
const APP_SECRET = "GraphQL-is-aw3some";

async function tokenBlacklisted(prisma, token) {
  return prisma.$exists.token({ token, blacklisted: true });
}

async function getUserID(context) {
  const { prisma, req, connectionParams } = context;
  let Authorization;
  if (!req) {
    Authorization = connectionParams.Authorization;
  } else {
    Authorization = req.headers.authorization;
  }
  if (Authorization) {
    const token = Authorization.replace("Bearer ", "");

    // Since we want to explcitly let individual log out, we need to save a black-list to reference when we get a token.
    // Even though JWT's are supposed to be stateless, this is the best way to do this. Luckily the operation is O(1) since it's a hash table
    const blacklisted = await tokenBlacklisted(prisma, token);
    if (blacklisted) {
      throw new AuthenticationError("Token is invalid");
    }
    const { userID, exp } = jwt.verify(token, APP_SECRET);

    // Tokens are valid for 24 hours so we need to check if it's an expired token
    if (exp < Date.now()) {
      throw new AuthenticationError("Token is expired");
    }

    // The last thing we're going to check in this function is if the user exists in the DB. If not, we'll throw and return
    const userExists = await prisma.$exists.user({ id: userID });
    if (!userExists) {
      throw new AuthenticationError("Token is invalid");
    }

    return userID;
  }

  throw new AuthenticationError("Token is invalid");
}

module.exports = {
  APP_SECRET,
  getUserID
};
