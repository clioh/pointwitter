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

Apollo Server is the server-side service maintained by Apollo, who is undoubtedly a leader in the graphQL revolution. I like Apollo Server because it easily integrates with the client side offerings that Apollo has as well. Furthermore, it lets me easily choose the framework I want to use, which in this case is Micro. More on that below.

Apollo offers thorough documentation, which helps significantly, and it widely used by the community at large, meaning it is unlike to disappear in the next few years.

The other tempting alternative to Apollo would be graphQL Yoga, which is maintained by Prisma. graphQL Yoga offers much the same thing in a slightly more opinionated framework. One of the disadvantages of it is that it requires you to use Express.

### Micro

Micro is a small (as the name implies) Node framework from Zeit. I like it because it integrates well with Now, allowing me to prototype easily for small projects like this one. It is also tiny in size at less than one megabyte and less than 260 lines of code.

### JWT

In this application, JWT's don't really confer any advantages. Their promise is to be a stateless means of authentication, but since we required an explicit logout function, we actually need to check against the database for every request anyways. This isn't a big deal as this check is O(1). The nice thing about JWT's is that they offer extensibility in the future should we want to keep building this app more. Frankly, there's a good argument against the way they're commonly used [here](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/) but I think they're just fine as long as you avoid pitfalls.

### Prisma

Prisma is definitely the future of databases for common applications. It's a graphQL ORM+ that allows you to bring your own database. The details behind this database are at the individuals discretion, which makes the framework flexible enough to scale relatively painlessly. In this case, I'm taking advantage of Prisma's own hosted database to remove the complications of spinning up my own. If I were to productionize this app, this would be removed before deployment.

## Improvements

### Reset password functionality

When I was writing this app, I thought it would be more fun to create my own login functionality as opposed to using something out of the box. One of the piece of functionality that is missing is the ability to reset a forgotten password, which is pretty common. In order to do this, I'd need to add a password reset token to the user type and integrate and email and text message service, which would be not too difficult.

### Rate limiting

One of the nice things about bcrypt is that it hashes slowly, which makes it good for applications like this. This feature of the algorithm cannot take the place of smart rate limits on queries that prevent both accidental and malicious misuse of the API. [This](https://blog.apollographql.com/securing-your-graphql-api-from-malicious-queries-16130a324a6b) article my Max Stoiber is a good start when considering protecting your graphQL API against malicious use.

### Logging

There currently isn't any logging integrated with the service. In a production environment, logging and error reporting are must-haves.

### Testing

Testing is huge in ensuring that applications work consistently. The very next step I'd take if I were to continue this project is to create some integration tests to ensure everything works as it should.

### Dynamic video resizing

While users can upload videos or images right now, only images are resized. In the future, I'd like to add the ability to resize videos as well.
