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
- [ ] Complete and manually test the registration and login actions

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

This should bring up the application on <http://localhost:3000>. If you change the code and want to rebuild the docker instances, simply use `docker-compose up --build` to force a rebuild when bringing up the docker instances.

## Some technical notes

As we're using Express >4.16, we can use the built-in `.json()` method, and have no need of the `bodyparser` package.

Because we're using MongoDB via docker-compose for local running, we don't need auth. This does not obviate the need for auth in cloud environments, but we can look at alternative methods that are more secret-preserving than dotenv.

The noun for each 'item' is 'auction', as that seemed more expressive, and also means we can extract items from out of auctions later, if we so choose.

I couldn't get nodemon working within a Docker container, despite apparently-working examples, so I stripped it out. Testing changes requires a manual rebuild each time.

Minimum email length is set to 3 as that's achievable from within an intranet. I've also enforced uniqueness and lowercase characters on email addresses in the model, as both are required to prevent duplicates.

Minimum password length is set to 8 digits. This is still less than the recommended 10 characters.

I've moved Joi validation code inside the model and created middleware that validates request content prior to running the controller code (which is still inside the individual route files for simplicity).

I've also moved some domain logic inside the model with a pre-save hook, to tie password hashing directly into the model and make it harder to mess up security.
