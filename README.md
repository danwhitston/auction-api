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
- [x] Add an auth-checking hook for use by all actions
- [x] Add an auction / item creation route (or routes?)
- [x] Add a route to view current auctions / items
- [x] Submit bids on an auction
- [x] Users cannot bid for their own items
- [x] Users cannot bid in an auction after the closing date
- [x] Set up three-app structure for API, API tester, auction closer
- [x] Create cron container to close auctions and mark winners
- [x] Create Python testing app to query local instance
- [ ] Write request handling code for test cases
- [ ] Write test cases 1, 2, 3, 4
- [ ] Write test cases 5, 6, 7, 8
- [ ] Write test cases 9, 10, 11, 12, 13

## Setting up a development environment

Local running is through use of docker containers. This requires that you have docker and docker-compose installed.

```sh
cd auction-api
docker-compose up
```

This should bring up the API on <http://localhost:3000>, and a cron job in a separate container that closes off auctions and marks the winner once every minute. If you change the code and want to rebuild the docker instances, simply use `docker-compose up --build` to force a rebuild when bringing up the docker instances. To reset the Mongo database, delete the relevant container.

## Running API tests

You'll need a Python 3 installation on your machine, and both `pytest` and the `pytest-dependency` plugin:

```sh
cd auction-api/api-test-app
pip install pytest
pip install pytest-dependency # This ensures tests are run in order
```

Before running tests, bring up a (preferably blank) docker setup:

```sh
cd auction-api/
docker-compose up --build
cd api-test-app
pytest # Run the tests!
```

The test objects are *not* deleted after a test run. This is because the API does not have delete functionality, and the test code does not create the environment. Therefore, subsequent test runs will fail due to duplicate data, until the dockerised MongoDB database is dropped or the `mongo` container in which it operates is deleted and rebuilt.

## Application structure

There are three applications, in three folders of the git repository:

- `api-app` - the Node API
- `auction-closer` - a Node script to close auctions, on a once-a-minute cron
- `api-test-app` - Python test script, confirms correct working of api-app and auction-closer

The API, the auction closer script, and the underlying MongoDB storage have a docker-compose config for local development and hosting. The API test app makes requests against this, and requires a clean MongoDB database.

## REST endpoints

### `/` GET

The root route. Returns a simple server status response to confirm the API is up and running. No auth is required.

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
    "description": "This teapot is truly lovely. I would attach a photograph but, alas, that would require whatever the GCP equivalent of S3 is and a bunch of messing around to get working on local",
    "closingTime": "2022-07-14T12:26:34Z",
}
```

In the above, the closingTime is actually part of the auction information and gets stored there, rather than in the item.

### `/items` GET

List all items that have been submitted for auction. There is currently no ordering and no filtering on this list. The request has to include a valid `auth-token` header.

### `/auctions` GET

Returns a list of all auctions, including bids made for each auction. The request has to include a valid `auth-token` header.

### `/auctions/:id` GET

Returns details of a single auction, identified by the ID included as part of the URL. The request has to include a valid `auth-token` header.

### `/auctions/:id/bids` POST

Submit a bid for an item in a currently running auction. The request has to include a valid `auth-token` header, which identifies the user submitting the bid. If the auction is open then a confirmation response is sent with details of the bid. If the auction is closed or the bid cannot be recorded for some other reason, an error response is returned. Note that a successful bid submission does not imply that the bid is the highest amount to be submitted. The auction ID is included in the URL, and the amount is the only argument in the payload. The amount cannot be less than 0 or more than 100000000.

```json
{
    "amount": 2300, // The amount being bid, in currency units
}
```

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

I chose to use references between items and auctions, rather than embedding one inside the other. There was no performance benefit to denormalising at this level of usage, and there was a stated requirement to create both auctions and items. However, I am embedding bids as an array inside each auction, as those aren't specified as a distinct requirement.

Items and Auctions have their respective references to each other as required fields. This means that every item should have an auction and vice versa. There is no enforcement of reference consistency between the two collections, so it's theoretically possible to create inconsistent documents that don't reference each other, many-to-one or one-to-many connections, or documents that reference a document of completely the wrong type. To limit the potential for mischief, these references are calculated by the program, and cannot be defined by end users.

I'm using the MongoDB internal ID as the public ID of documents. Ideally, we would use a public-facing ID for external consumption, but it's not a major issue either way.

I've marked many fields in Auction and Bid records as immutable. This is a safety measure to reduce the possibility of auctions or bids getting modified after-the-fact, which would invalidate auction results and damage trust. In a production setup, I would set up a custom MongoDB user with limited permissions on collections, such that it was impossible for the API app to remove or modify bid documents, that changes to item information did not overwrite previous edits, and that auctions could not be removed but instead only marked as cancelled.

The docker cron configuration is based on an example given in <https://blog.thesparktree.com/cron-in-docker>.
