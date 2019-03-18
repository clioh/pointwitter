const Mutation = require("../mutations");
const Query = require("../queries");
const Subscription = require("../subscriptions");

const resolvers = {
  Query: Query,
  Mutation: Mutation,
  Subscription: Subscription
};

module.exports = { resolvers };
