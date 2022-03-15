# auction-api
Cloud-based Auction API, written in NodeJS with CI/CD to Google Cloud

## Development plan

- [x] Set up Node environment
- [x] Create a toy Express application
- [x] Add a basic Docker setup
- [x] Add MongoDB (use Docker-compose for a local dev environment?)
- [ ] Set up Express routes in own folder
- [ ] Set up MongoDB connector in Express
- [ ] Add basic registration and login routes
- [ ] Add auth storage to MongoDB and model setup
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

This requires that you have docker and docker-compose.

```sh
cd auction-api
docker-compose up
```

This should bring up the application on localhost:3000.

## Some technical notes

As we're using Express >4.16, we can use the built-in `.json()` method, and have no need of the `bodyparser` package.
