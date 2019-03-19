# Pointwitter

### _A small Twitter-like demo for Point_

## Overview

This API has been hosted on Zeit's now platform. It can be found @ [pointwitter.clioharper.xyz](https://pointwitter.clioharper.xyz). Navigating there will allow you to use the GraphQL Playground and interact with the API in that manner. Introspection is also enabled for the purposes of this demo. You can navigate to the GraphQL and get a visual understanding of the API schema.

## Local Development

To run the project locally, first clone the repository with:

`git clone https://github.com/harpe116/pointwitter.git`

You'll need to have Node installed along with either `npm` or `yarn`

Run `yarn install` to install all dependencies for the project.

From there, you can run `yarn dev` to run the development server with hot reloading or you can run `yarn start` to start the server in production mode. The server is currently configured to expose the GraphQL playground in both modes.

### Note

Most endpoints for this API are protected. To access them, you'll need to include a token in the `Authorization` header or the request

To obtain a token, you'll need to either register or login. You can take the token you receive and include it in the header. See below for more details.

## API endpoints

The API is configured to accept requests on the `/` endpoint.
`GET` requests to this endpoint will show the GraphQL playground, while `POST` requests will allow use of the endpoint as normal.

## GraphQL endpoints

_The GraphQL endpoints are as follows_

### Queries

#### Posts

Returns all the posts made by a user. Does not require authorization.

##### Example

    query {
      posts(userID:"cjtc821yk17fv0b5142wl7kuf") {
        id
        body
      }
    }

#### Feed

_Requires authorization._

Returns all posts from the users that a user is following.

##### Example

    query {
      feed {
        id
          body
      }
    }

### Mutations

#### Signup

##### Example

Allows a user to register for an account with an email/password OR phoneNumber/password.

    mutation{
      signup(email:"clio.harper@gmail.com", password:"password") {
        token
        user{
          email
        }
      }
    }

**OR**

    mutation{
      signup(phoneNumber:"5127884342", password:"password") {
        token
        user{
          email
        }
      }
    }

#### Login

Allows a user to login with previously registered credentials.

##### Example

    mutation{
      login(email:"clio.harper@gmail.com", password:"password") {
        token

      }
    }

**OR**

    mutation{
      login(phoneNumber:"5127884342", password:"password") {
        token

      }
    }

#### Logout

Invalidates the token supplied in the `Authorization` header

_Requires authorization._

##### Example

    mutation {
      logout
    }

#### CreatePost

Creates a post authored by the user indicated by the token provided.

_Requires authorization._

##### Example

    mutation {
      createPost(postBody:"hello world") {
        id
      }
    }

#### UpdatePost

Updates a post previously created by the user.

_Requires authorization._

##### Example

    mutation {
      updatePost(postUpdate:"goodbye cruel world", postID:"cjtcins7gsd80b76gq1xj138") {
        id
      }
    }

#### DeletePost

Deletes a post previously created by the user. This is a soft delete.

_Requires authorization._

##### Example

    mutation {
      deletePost(postID:"cjtcins7g3sd80b76gq1xj138") {
        id
      }
    }

#### FollowUser

Allows a user to specify a user the want to follow by userID.

_Requires authorization._

##### Example

    mutation {
      followUser(userID:"cjtdh9c3a89og0b511z2zoxic") {
        id
      }
    }

#### UnfollowUser

Allows a user to specify a user the want to unfollow by userID.

_Requires authorization._

##### Example

    mutation {
      unfollowUser(userID:"cjtciga46213g0b51ls8xc00f") {
        id
      }
    }

### Subscriptions

#### PostAdded

Listens for posts added by anyone the user if following.

_Requires authorization._

##### Example

    subscription{
      postAdded {
        id
        body
      }
    }

## Approach

### Apollo Server

### Micro

### JWT

### Prisma

## Improvements

### Pagination on posts

### Reset password functionality

### More testing

### Dynamic video resizing
