const { gql } = require("apollo-server-micro");

const typeDefs = gql`
  type User {
    id: ID!
    name: String
    email: String!
    password: String!
    phoneNumber: String!
    posts: [Post!]!
    followers: [User!]!
    following: [User!]!
    blocked: [User!]!
    createdAt: String!
    updatedAt: String!
    lastLogin: String!
  }

  type Post {
    id: ID!
    user: User!
    body: String!
    mediaUrl: String
    createdAt: String!
    updatedAt: String!
    deleted: Boolean!
  }

  type AuthPayload {
    token: String
    user: User
  }

  input MediaUpload {
    file: Upload!
    fileType: FileType!
    size: Int!
  }

  enum FileType {
    IMAGE
    VIDEO
  }

  type Query {
    posts(userID: ID!): [Post]!
    feed: [Post]!
  }

  type Mutation {
    signup(
      email: String
      password: String!
      phoneNumber: String
      name: String
    ): AuthPayload!
    login(email: String, phoneNumber: String, password: String!): AuthPayload
    logout(userID: String): String!
    createPost(postBody: String!, upload: MediaUpload): Post!
    updatePost(
      postID: ID!
      postUpdate: String!
      uploadUpdate: MediaUpload
    ): Post!
    deletePost(postID: ID!): Post!
    followUser(userID: ID!): User!
    unfollowUser(userID: ID!): User!
  }

  type Subscription {
    postAdded: Post
  }
`;

module.exports = { typeDefs };
