const { withFilter } = require('apollo-server');

const POST_ADDED = 'POST_ADDED';

const Subscriptions = {
  postAdded: {
    /* As a user creating a subscription,
    I don't care really when a random person adds a post so much as I
    care when someone I follow does, so that's what I'm going to filter by here. */
    subscribe: withFilter(
      context => context.pubsub.asyncIterator(POST_ADDED),
      (payload, variables, { connection }) => {
        const { context } = connection;
        const { following } = context;
        return !!following.find(person => person.id === payload.postAdded.postedBy);
      },
    ),
  },
};

module.exports = Subscriptions;
