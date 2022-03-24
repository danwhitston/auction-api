# auction-api

Cloud-based Auction API, written in NodeJS with CI/CD to Google Cloud

## Development plan

- [x] Set up Node environment
- [x] Create a toy Express application
- [x] Add a basic Docker setup
- [x] Add MongoDB (use Docker-compose for a local dev environment?)
- [x] Set up Express routes in own folder
- [x] Set up MongoDB connector in Express
- [x] Add basic registration and login routes
- [x] Add auth storage to MongoDB and model setup
- [x] Complete and manually test the registration and login actions
- [ ] Add an auth-checking hook for use by all actions
- [ ] Add an auction / item creation route (or routes?)
- [ ] Add a route to view current auctions / items

## Setting up a development environment

To run the application locally, you have two options:

### 1. Local installation and running

This requires that you have nvm or node 17, MongoDB, and linux.

```sh
cd auction-api
nvm use # .nvmrc expects node v17
npm install
# TODO: figure out how to set up Mongo and connect it manually
npm start # runs node ./server.js by default
```

### 2. Local docker containers

This requires that you have docker and docker-compose installed.

```sh
cd auction-api
docker-compose up
```

This should bring up the application on <http://localhost:3000>. If you change the code and want to rebuild the docker instances, simply use `docker-compose up --build` to force a rebuild when bringing up the docker instances. To reset the Mongo database, delete the relevant container.

## Current REST endpoints

### `/` GET

The root route. Returns a simple server status response to confirm it's up and running. No auth is required.

### `/users/register` POST

Create a new user. Does not require an auth-token. The JSON payload takes the form:

```json
{
    "username":"daniel",
    "email":"test@example.com",
    "password":"somePassword"
}
```

### `/users/login` POST

Log in as a user. The JSON payload takes the form:

```json
{
    "email":"test@example.com",
    "password":"somePassword"
}
```

Returns an error if anything goes wrong, otherwise returns an auth-token as payload if the username and password match one that's stored:

```json
{
    "auth-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjNiMTI1ZjJmODAyMjY4YzlmODE5NGQiLCJpYXQiOjE2NDgwMzkwNjl9.xbfmL60wI0nTBmqkSZ97uxvCm3REjZ9LoU8Ljrnxl4k"
}
```

### `/items` POST

Create a new item. This also creates an associated auction object to store bids and other auction-related information about the item. The request has to include a valid `auth-token` header.

```json
{
    "title": "A lovely teapot",
    "condition": "used",
    "description": "This teapot is truly lovely. I would attach a photograph but, alas, that would require whatever the GCP equivalent of S3 is and a bunch of messing around to get working on local"
}
```

### `/items` GET

List all items. There is currently no ordering and no filtering on this list. The request has to include a valid `auth-token` header.

## Development notes

The solution structure and code is based on that given in the first four labs of the Cloud Computing course. I've also based code on examples from other sources where appropriate, and marked it as such in each case.

As we're using Express >4.16, we can use the built-in `.json()` method, and have no need of the `bodyparser` package.

Because we're using MongoDB via docker-compose for local running, we don't need auth. This does not obviate the need for auth in cloud environments, but we can solve that later. I've also kept in the JWT secret token as a `.env` setting for now, but have excluded the `.env` file from the git repo.

The specification requires both `auctions` and `items` to be stored and made available. Given that each auction has one and only one item associated, and that there's no `bids` object, it appears that the purpose of the auctions collection is to store the complete auction history for a posted item in a single document.

I couldn't get nodemon working within a Docker container, despite apparently-working examples, so I stripped it out. Testing changes requires a manual rebuild each time.

Minimum email length is set to 3 as that's achievable from within an intranet. I've also enforced uniqueness and lowercase characters on email addresses in the model, as both are required to prevent duplicates.

Minimum password length is set to 8 digits. This is still less than the recommended 10 characters.

I've moved Joi validation code inside the model and created middleware that validates request content prior to running the controller code (which is still inside the individual route files for simplicity).

I've also moved some domain logic inside the model with a pre-save hook, to tie password hashing directly into the model and make it harder to mess up security.

I chose to use references between collections rather than embedding. There was no performance benefit to denormalising at this level of usage, and there was a stated requirement to keep separate collections, so it was easier to use references.
