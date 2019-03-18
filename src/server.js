const {
  ApolloServer,
  gql,
  AuthenticationError
} = require("apollo-server-micro");
const micro = require("micro");
const { router, get, options, post } = require("microrouter");
const { PubSub, withFilter } = require("apollo-server");

const { prisma } = require("../generated/prisma-client");
const { typeDefs } = require("./schema");
const { resolvers } = require("./resolvers");
const { getUserID } = require("./utils");

const pubsub = new PubSub();

const server = new ApolloServer({
  introspection: true,
  playground: true,
  typeDefs,
  resolvers,
  // Add Prisma to the context as we'll be using that all over
  context: request => {
    return {
      ...request,
      pubsub,
      prisma
    };
  },
  subscriptions: {
    /* We have two tasks when the connection is established
    0. Figure out if the person trying to connect is authorized to do so
    1. Pull out the people they follow so we can pass that to the subscription function */
    onConnect: async (connectionParams, webSocket) => {
      if (connectionParams.Authorization) {
        const userID = await getUserID({
          prisma,
          connectionParams
        });
        const following = await prisma.user({ id: userID }).following();
        return {
          userID,
          following
        };
      }

      throw new AuthenticationError("No token provided for user");
    }
  }
});

const graphqlPath = "/";
const graphqlHandler = server.createHandler({ path: graphqlPath });
const routes = router(
  post(graphqlPath, graphqlHandler),
  get(graphqlPath, graphqlHandler)
);

const microServer = micro(routes);
microServer.listen();

module.exports = routes;
