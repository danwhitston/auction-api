# auction-api

Cloud-based Auction API, written in NodeJS with CI/CD to Google Cloud.

## Academic Declaration

I have read and understood the sections of plagiarism in the College Policy on assessment offences and confirm that the work is my own, with the work of others clearly acknowledged. I give my permission to submit my report to the plagiarism testing database that the College is using and test it using plagiarism detection software, search engines or meta-searching software.

## Application structure

There are three applications, in three folders of the git repository:

- `api-app` - the Node API
- `auction-closer` - a Node script to close auctions, on a once-a-minute cron
- `api-test-app` - Python test script, confirms correct working of api-app and auction-closer

The API, the auction closer script, and the underlying MongoDB storage have a docker-compose config for local development and hosting. The API test app makes requests against this, and requires a clean MongoDB database.

## Usage instructions

### Service description

The Auction API provides an API endpoint which can be communicated with using http requests. By making requests and parsing the responses you receive, you can:

- check if the API is online
- register as a user in the auction system
- login to obtain an auth token, which you can use to authorise subsequent requests
- post items for sale, with a description, condition, and auction closing time
- get a list of all items that have been posted for sale
- get a list of all auctions, or show either only open or only completed auctions
- submit a bid for an open auction
- get details for an auction to see whether it's open, the bidding history, and the current winner's ID and winning amount

### Setting up a development environment

Local running is through use of docker containers. This requires that you have docker and docker-compose installed.

```sh
cd auction-api
echo "TOKEN_SECRET=aaabbbccc1234567890" > .env # replace this with your own secret value!
docker-compose up
```

This should bring up the API on <http://localhost:3000>, and a cron job in a separate container that closes off auctions and marks the winner once every minute. If you change the code and want to rebuild the docker instances, simply use `docker-compose up --build` to force a rebuild when bringing up the docker instances.

To reset the Mongo database, run `docker-compose rm -fv`. Be warned that, even though this will clear the Mongo data including registrations, any auth-tokens you've generated will still be valid. This is because the token itself contains the user ID, and the JWT auth remains valid as it's based on a static secret token. However, any requests that create data will either fail or produce documents with references to a non-existent user ID.

### Running tests

You'll need a Python 3 installation on your machine, and both `pytest` and the `pytest-dependency` plugin:

```sh
cd auction-api/api-test-app
pip install pytest
pip install pytest-dependency # This ensures tests are run in the correct order
```

Before running tests, bring up a (preferably blank) docker setup:

```sh
cd auction-api/
docker-compose rm -fv # This deletes the current database and loses all data!
docker-compose up
cd api-test-app
pytest # Run the tests
```

The test objects are *not* deleted after a test run. The API does not have actions to enable deletion, and the test code does not control the application environment. This is why `docker-compose rm -fv` is necessary before a test run.

### REST endpoints

All actions are RESTful, with JSON body for POST data, an auth-token header where required for authorisation, and query params for parameters additional to the REST actions and resource identities. In the default local setup using docker-compose, the root endpoint is at <http://localhost:3000/>.

The API sends one of three response statuses:

- 200 - the request succeeded. Accompanying information is returned as a JSON body.
- 400 - the request failed. Accompanying information may be returned as plain text.
- 401 - authentication failure. The accompanying text indicates a more precise cause.

#### `/` GET

The root route. Returns a simple server status response to confirm the API is up and running. No auth is required.

```txt
Server is running!
```

#### `/users/register` POST

Create a new user. Does not require an auth-token. The JSON payload takes the form:

```json
{
    "username":"daniel",
    "email":"test@example.com",
    "password":"somePassword"
}
```

#### `/users/login` POST

Log in as a user. The JSON payload takes the form:

```json
{
    "email":"test@example.com",
    "password":"somePassword"
}
```

Returns an error if anything goes wrong, otherwise returns an auth-token as payload if the username and password match one that's stored. The auth-token must be included as a header in any future requests that require authorisation.

```json
{
    "auth-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjNiMTI1ZjJmODAyMjY4YzlmODE5NGQiLCJpYXQiOjE2NDgwMzkwNjl9.xbfmL60wI0nTBmqkSZ97uxvCm3REjZ9LoU8Ljrnxl4k"
}
```

#### `/items` POST

Create a new item. This also creates an associated auction object to store bids and other auction-related information about the item. Condition can be `used` or `new`. Closing time should be an ISO formatted date-time string, preferably using UTC. The request has to include a valid `auth-token` header.

```json
{
    "title": "A lovely teapot",
    "condition": "used",
    "description": "This teapot is truly lovely. I would attach a photograph but, alas, that would require whatever the GCP equivalent of S3 is and a bunch of messing around to get working on local",
    "closingTime": "2022-07-14T12:26:34Z",
}
```

In the above, the closingTime is actually part of the auction information and gets stored there, rather than in the item.

#### `/items` GET

List all items that have been submitted for auction. The item details are included, but auction details (including the auction closing time, status and bids) are not. There is currently no ordering and no filtering on this list. The request has to include a valid `auth-token` header.

```json
[
    {
        "_id": "6245c791dfb720212cc55b93",
        "title": "A lovely teapot",
        "condition": "used",
        "description": "This teapot is marvellous",
        "userId": "6245c790dfb720212cc55b8a",
        "createdAt": "2022-03-31T15:24:01.198Z",
        "auctionId": "6245c791dfb720212cc55b95",
        "__v": 0
    },
    {
        "_id": "6245c791dfb720212cc55b99",
        "title": "A set of cutlery",
        "condition": "new",
        "description": "Useful for eating stuff",
        "userId": "6245c790dfb720212cc55b8c",
        "createdAt": "2022-03-31T15:24:01.212Z",
        "auctionId": "6245c791dfb720212cc55b9b",
        "__v": 0
    },
    {
        "_id": "6245c791dfb720212cc55b9f",
        "title": "Faded tablecloth",
        "condition": "used",
        "description": "Well loved, has a fluffy bunnies pattern",
        "userId": "6245c790dfb720212cc55b8e",
        "createdAt": "2022-03-31T15:24:01.224Z",
        "auctionId": "6245c791dfb720212cc55ba1",
        "__v": 0
    }
]
```

#### `/items/:id` GET

Return details of a single item. The request has to include a valid `auth-token` header.

```json
{
    "_id": "6245aa20a5d79729604114e2",
    "title": "A lovely teapot",
    "condition": "used",
    "description": "This teapot is marvellous",
    "userId": "6245aa1fa5d79729604114d9",
    "createdAt": "2022-03-31T13:18:24.011Z",
    "auctionId": "6245aa20a5d79729604114e4",
    "__v": 0
}
```

#### `/auctions?status=open|completed` GET

Returns a list of all auctions, including bids made for each auction. If the optional status parameter is included, then the list of auctions is filtered to either open or completed ones. The request has to include a valid `auth-token` header.

```json
[
    {
        "_id": "6245cd79139a650c9eacbbc7",
        "itemId": "6245cd79139a650c9eacbbc5",
        "auctionStatus": "completed",
        "closingTime": "2022-03-31T15:49:33.333Z",
        "winnerId": "6245cd79139a650c9eacbbb2",
        "winnerAmount": 50,
        "bids": [
            {
                "createdAt": "2022-03-31T15:49:13.336Z",
                "userId": "6245cd79139a650c9eacbbb4",
                "amount": 0,
                "_id": "6245cd79139a650c9eacbbc6"
            },
            {
                "createdAt": "2022-03-31T15:49:13.389Z",
                "userId": "6245cd79139a650c9eacbbb2",
                "amount": 20,
                "_id": "6245cd79139a650c9eacbbd5"
            },
            {
                "createdAt": "2022-03-31T15:49:13.402Z",
                "userId": "6245cd78139a650c9eacbbb0",
                "amount": 25,
                "_id": "6245cd79139a650c9eacbbdb"
            },
            {
                "createdAt": "2022-03-31T15:49:13.413Z",
                "userId": "6245cd79139a650c9eacbbb2",
                "amount": 50,
                "_id": "6245cd79139a650c9eacbbe1"
            },
            {
                "createdAt": "2022-03-31T15:49:13.423Z",
                "userId": "6245cd78139a650c9eacbbb0",
                "amount": 50,
                "_id": "6245cd79139a650c9eacbbe7"
            }
        ],
        "__v": 4
    }
]
```

#### `/auctions/:id` GET

Returns details of a single auction, identified by the ID included as part of the URL. The request has to include a valid `auth-token` header.

```json
{
    "_id": "6245cd79139a650c9eacbbc7",
    "itemId": "6245cd79139a650c9eacbbc5",
    "auctionStatus": "completed",
    "closingTime": "2022-03-31T15:49:33.333Z",
    "winnerId": "6245cd79139a650c9eacbbb2",
    "winnerAmount": 50,
    "bids": [
        {
            "createdAt": "2022-03-31T15:49:13.336Z",
            "userId": "6245cd79139a650c9eacbbb4",
            "amount": 0,
            "_id": "6245cd79139a650c9eacbbc6"
        },
        {
            "createdAt": "2022-03-31T15:49:13.389Z",
            "userId": "6245cd79139a650c9eacbbb2",
            "amount": 20,
            "_id": "6245cd79139a650c9eacbbd5"
        },
        {
            "createdAt": "2022-03-31T15:49:13.402Z",
            "userId": "6245cd78139a650c9eacbbb0",
            "amount": 25,
            "_id": "6245cd79139a650c9eacbbdb"
        },
        {
            "createdAt": "2022-03-31T15:49:13.413Z",
            "userId": "6245cd79139a650c9eacbbb2",
            "amount": 50,
            "_id": "6245cd79139a650c9eacbbe1"
        },
        {
            "createdAt": "2022-03-31T15:49:13.423Z",
            "userId": "6245cd78139a650c9eacbbb0",
            "amount": 50,
            "_id": "6245cd79139a650c9eacbbe7"
        }
    ],
    "__v": 4
}
```

#### `/auctions/:id/bids` POST

Submit a bid for an item in a currently running auction. The request has to include a valid `auth-token` header, which identifies the user submitting the bid. If the auction is open then a confirmation response is sent with details of the bid. If the auction is completed or the bid cannot be recorded for some other reason, an error response is returned. Note that a successful bid submission does not imply that the bid is the highest amount to be submitted. The auction ID is included in the URL, and the amount is the only argument in the payload. The amount cannot be less than 0 or more than 100000000.

An example payload might be:

```json
{
    "amount": 2300,
}
```

An example response might be:

```json
{
    "_id": "623ed4d891d4c5b6a49aae50",
    "itemId": "623ed4d891d4c5b6a49aae4f",
    "auctionStatus": "open",
    "closingTime": "2022-07-14T12:26:34.000Z",
    "bids": [
        {
            "createdAt": "2022-03-26T09:30:01.056Z",
            "userId": "623b125f2f802268c9f8194d",
            "amount": 2300,
            "_id": "623edd199a176cffefeb4f0d"
        }
    ],
    "__v": 1
}
```

## Development notes

### Data structures

To meet the specification, the API application uses four models, which are stored in MongoDB as three collections plus a subdocument array, as follows.

![Diagram of models and relations](./Auction%20API%20data%20structure.svg)

#### User

Each registered user has their details stored in a single document defined by the User model, consisting of:

- **username** - a mandatory, unique string between 3 and 256 letters long
- **email** - a mandatory, unique string between 3 and 256 characters long, stored as lower case for ease of referening and to reduce risk of duplicate email addresses
- **password** - a mandatory string between 8 and 1024 characters long. Created passwords are hashed with a salt prior to saving using a pre-save hook, so they cannot be easily decrypted if user data is compromised
- **createdAt** - the date and time a document was created, i.e. when the user was registered

Documents stored by the User model are stored in the MongoDB users collection. As with all collections, there's also a unique _id field that can be used to reference the user elsewhere in the database.

#### Item

Each item posted by a user is stored as a single document defined by the Item model, consisting of:

- **title** - a short, mandatory string (max 256 characters) that acts as the name of the item
- **condition** - a mandatory string that takes the value `new` or `used`
- **description** - a long, mandatory string (max 32768 characters) that gives room for a complete description of the item, to enable bidders to fully understand what they're bidding for
- **auctionId** - required _id value of the auction that matches to the item. Items and Auctions currently have a one-to-one relationship, but are stored separately to meet the stated requirements of the assignment
- **userId** - required _id value of the user that posted the item.
- **createdAt** - when the item was posted

Keeping items and auctions separate makes it easier to decouple the two later on if desired, e.g. to have a single auction for multiple items, or multiple auctions for an item if the first auction is unsuccessful.

Documents stored by the Item model are stored in the MongoDB items collection. While there should be no way to create an item with invalid references for userId and auctionId, there is also no enforcement of referential integrity as MongoDB is less concerned with data normalisation and enforcement of 'correctness'. In theory, a rogue request could destroy a referenced document and leave an item stranded without a matching user or auction. Or it could assign multiple auctions to a single item or vice versa. At scale, it would be necessary to run regular checks on data integrity to flag inconsistencies and take appropriate remedial action.

#### Auction

When a user posts an item, the save process automatically creates a matching auction document, consisting of:

- **itemId** - mandatory _id value of the item that is being auctioned. Each item should reference one auction, and that auction should in turn reference the same item back again. This makes it possible to navigate in both directions. This field is marked as immutable in the model as it should never need to be changed once created
- **auctionStatus** - a mandatory string that takes the value `open` or `completed`. Auctions are set to open at the time of creation since it's assumed that they start taking bids immediately. They are then set to completed once the closingTime is reached, by the auction-closer script that runs every minute
- **closingTime** - a mandatory, user-supplied date and time at which the auction will stop taking bids and declare a winner. The value of this is submitted as part of an item posting, but is actually saved in the matching auction record. This field is marked as immutable in the model as it should not need to be changed once created
- **winnerId** - the _id value of the user with the current winning bid. At time of creation, this is set to the user who posted the item originally, since they 'win' by default if nobody else bids. Each time a valid bid is submitted for the auction, the winnerId is updated to the user posting the bid, if and only if it's higher than the previous winnerAmount and the auction is still marked as open
- **winnerAmount** - the amount of the current winning bid, stored as a number between 0 and 100000000. At time of creation, this is set to 0, which creates a lower threshold for subsequent bids to be marked as winning
- **bids** - an array of Bid documents, stored inside the auction to which they apply. At time of creation, a single zero-value bid is posted in the array, attributed to the user who is posting the item in the first place

The auction record does not store a permanent reference to the user who created it and thus posted the item for sale. We look up the user via the original item record instead. Doing this results in a minor reduction in duplication and potential inconsistency.

Documents stored in the Auction model are stored in the MongoDB auctions collection. This is kept as a separate collection to the items collection instead of subdocuments, to make direct search and retrieval of auctions simpler and more efficient. However, because item creation and auction creation are two separate transactions, there is potential for breakage if e.g. the item saves correctly but the auction save fails for some reason. This would hopefully be extremely rare, and would require manual admin intervention for occasional use, and either automated detection or proper wrapping of related transactions for larger scale use.

#### Bid

Each bid posted by a user is stored as a single document, as part of an array of documents inside the auction document that the bid relates to. Thus, there is no single collection of bids. Instead, all bids pertaining to an auction are stored together, making them easier to identify and query in the context of their auction, but harder to compare against the universe of all bids in all auctions. I believe that matches to likely usage patterns of the data.

- **userId** - mandatory _id value of the user posting the bid. As with all such fields, the user ID is determined using OAuth 2 with JSON webtoken, which is sent along with the request and when decoded gives the user ID
- **amount** - mandatory number between 0 and 100000000 that represents how much is being offered in the auction. This is the only key-value in the body of the bid posting request
- **createdAt** - when the bid was placed

Bids are defined in the model as entirely immutable once successfully created. There are no REST actions other than posting, and as with other records the createdAt is determined internally based on the current system time. Further, bid submission checks both the auction status and the closing time, and fails if either is invalid, just in case there's an inconsistency caused by e.g. the auction-closer not yet triggering. This is important, as trustworthiness of bid information and correctness of the auction winner is critical to successful operation of the platform. This is also why there is no way for a user to set the value of a createdAt field as part of any requests.

One option for further development would be to offer withdrawl of a bid, provided an auction was still open. This would need to preserve immutability of the original request details for security and transparency reasons, so could be achieved by e.g. an extra field called withdrawnAt that updated the first time a deletion request was received for a bid, from the bidder concerned.

### Handling auction end times

There are two requirements for correct handling of auction end times:

1. Valid bids submitted before the end time are accepted, and those submitted after the end time are rejected.
2. The auction data is updated after the auction end time, to show the auction winner and sale price, and to mark the auction as closed.

The no-bids-after-end-time requirement is simple to manage. Any submitted bid should be compared to the auction end time. This ensures correctness for all bid requests, provided the processing time between submission and comparison is sufficiently brief and the OS-provided datetime is correct.

Marking an auction closed and setting the winner and sale price can be handled in one of several ways:

- Run a scheduled task that finds auctions past their end time and updates the relevant fields.
- Intercept all requests that depend on auction status and ensure the statuses of the auctions being requested are correct, by updating the relevant fields if they're incorrect due to the auction end time being in the past.
- Use 'virtual' fields to show auction status, winning bidder and win price. Don't store them directly in the database, and instead calculate the relevant information using the auction end time and saved bids for the auction.

Scheduled tasks are the correct solution for large-scale systems. They are a form of maintenance task, and the auction end tasks should also be able to trigger time-based actions such as sending of an email to the auction winner and the item owner.

Triggering auction update actions when auction items are accessed by users has the advantage that you don't need to manage scheduled tasks, and that you avoid errors in accessing auctions past their end time that haven't yet been updated by the scheduled task. But in general, tagging maintenance tasks onto user requests is poor practice. It could result in arbitrary delays to auctions getting marked as closed, and time-based tasks such as notifying owners, winners, losers of the result would not work correctly.

Using virtual fields is unwise in a real world scenario. Frankly, any storage of contractual information with substantial consequences for users should be backed by trustworthy, queryable journaling of transactions.

To support this, I've implemented a separate scheduled task to mark auctions as closed, which runs once a minute in a separate docker container using cron. Currently, winning bid and winning amount are still saved by the bid POST action each time a bid is submitted. This could run into issues with sufficient bid frequency and volume as there's potential for overlap between parallel processes resulting in an incorrect winning bid being saved over the top of the correct one. I haven't implemented a solution for this, but have discussed it in the notes for potential future development.

### General notes

Because we're using MongoDB via docker-compose for local running, we don't need auth. This does not obviate the need for auth in cloud environments, but we can solve that later. I've also kept in the JWT secret token as a `.env` setting for now, but have excluded the `.env` file from the git repo.

The specification requires both `auctions` and `items` to be stored and made available. Given that each auction has one and only one item associated, and that there's no `bids` object, it appears that the purpose of the auctions collection is to store the complete auction history for a posted item in a single document.

I couldn't get nodemon working within a Docker container, despite apparently-working examples, so I stripped it out for now. Testing changes requires a manual rebuild each time. I suspect a good longer-term answer involved linking folders inside the container to folders in the local filesystem.

Minimum email length is set to 3 as that's achievable from within an intranet. I've also enforced uniqueness and lowercase characters on email addresses in the model, as both are required to prevent duplicates.

Minimum password length is set to 8 digits. This is still less than the recommended 10 characters.

I have *not* used controllers, and instead kept code inside the routes. This was in keeping with the approach in the labs tutorials. I've also mixed and matched model usage across all routes where necessary. Ideally I should fix by extracting all code related to a model to its model or controller counterpart.

I've moved Joi validation code inside the model and created middleware that validates request content prior to running the controller code (which is still inside the individual route files for simplicity). This was based on an example found on the internet.

I've also moved some domain logic inside the model with a pre-save hook, to tie password hashing directly into the model and make it harder to mess up security. Same with update of current winning bidder for each auction on a post-save hook to the Bid model.

I chose to use references between items and auctions, rather than embedding one inside the other. There was no performance benefit to denormalising at this level of usage, and there was a stated requirement to create both auctions and items. However, I am embedding bids as an array inside each auction, as those aren't specified as a distinct requirement.

Items and Auctions have their respective references to each other as required fields. This means that every item should have an auction and vice versa. There is no enforcement of reference consistency between the two collections, so it's theoretically possible to create inconsistent documents that don't reference each other, many-to-one or one-to-many connections, or documents that reference a document of completely the wrong type. To limit the potential for mischief, these references are calculated by the program, and cannot be defined by end users.

I'm using the MongoDB internal ID as the public ID of documents. Ideally, we would use a public-facing ID for external consumption, but it's not a major issue either way.

I've marked some fields in Auction and Bid records as immutable, in the api-app. This is a safety measure to reduce the possibility of auctions or bids getting modified after-the-fact, which would invalidate auction results and damage trust. In a production setup, I would set up a custom MongoDB user with limited permissions on collections, such that it was impossible for the API app to remove or modify bid documents, that changes to item information did not overwrite previous edits, and that auctions could not be removed but instead only marked as cancelled.

### Completed tasks

The following tasks have already been completed:

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
- [x] Write request handling code for test cases
- [x] Write test cases 1, 2, 3, 4
- [x] Write test cases 5, 6, 7, 8
- [x] Implement GET /items/:id for test case TC8
- [x] Write test cases 9, 10, 11, 12, 13
- [x] Fix blocking of self-bidding
- [x] Implement GET /auctions?status=X to only see open or completed auctions
- [x] Implement confirm highest bid in POST /auction/:id/bids response
- [x] Fix the docker rebuild issue - auction-closer and api-app don't update their code when using `docker up --build`, so I'm manually deleting the existing containers before building and running tests

There are some additional short-term improvements to be completed:

- [ ] Allow the api-test-app to directly set up fresh docker containers, run tests against them, and then delete them
- [ ] Confirm that all routes and parameters are fully validated and protected against query injection
- [ ] Extract model references to their own functions, all in the same route or controller. Currently, I call Item, Auction, and Bid from within the same route file

### Tasks for production deployment

The application does not have a configuration for production deployment, i.e. deployment on the cloud with access via the open internet. To achieve this, several further tasks would be required:

- [ ] Auth-token storage and retrieval in the database, token expiry, and token revocation - these are required for security, as an attacker who stole someone's auth-token would otherwise have irrevocable access to their account.
- [ ] Virtual Private Cloud (VPC) setup to ensure that only the API endpoint is accessible via the open internet.
- [ ] Auth between services, specifically adding a username and password for MongoDB to be accessed by the API and auction-closer services. If neither this nor the VPC are implemented, then the MongoDB service presents a substantial **security risk** in production deployment.
- [ ] CI/CD scripts that build and test the app in a managed cloud environment, then allow merge to production branch if tests pass and approval is given, then deploys from production branch to the production service. This could be written using GitHub Actions, a dedicated CI service such as CircleCI, or one of the cloud providers' own services.
- [ ] Ensure that the API endpoint is only addressable via https, i.e. that all communication is secure. The auth-token approach is trivially insecure without this.
- [ ] Application monitoring and statistics. The AWS version of this is CloudWatch, which can be used to monitor service usage levels, CPU and database load, error rates, and more. Alarms can be set up to alert admins if error rates go down.
- [ ] Most cloud services offer multi-zone or multi-region mirroring of services. To make use of this, we'd want to use e.g. MongoDB Atlas, and an API gateway service that load-balanced across multiple servers running the API, and handing off to each other in the event of downtime. This would also make it easier to use gradual roll-out and instant roll-back on error, blue-green deployment, and versioned API support.
- [ ] Handling of requests or responses that get lost in transit. Currently, if a user does not receive a response, then they cannot be certain if their request was actioned without manually querying the parent of whatever object they're trying to create. There is also no protection against duplicate requests when posting items. It may be sensible to operate a two-step process where a user first requests an ID for their actual request, then sends a PUT with the actual request and the assigned ID to prevent duplication.
- [ ] It's normal to guard against spam and DoS by rate limiting requests from individual accounts and IP addresses.
- [ ] Test for and (if necessary) guard against clashes in assigning the winning bidder caused by overlapping bid requests. This could be managed by e.g. locking the auction object during update.
- [ ] Consider using an SQL database for storage, either replacing or in addition to MongoDB. It's not clear that the advantages of NoSQL are suited to this particular application.
- [ ] Add an emailing service triggered by the auction-closer, to email auction bidders when an auction closes and let them know whether they won, and to email the item owner and let them know the sale price.

## References

Where I have based code on examples sourced from the internet, I have acknowledged this in comments above the code, with the original URL included. Where code follows a standard 'boilerplate' structure without room for deviation or creativity, this is not acknowledged, as it is common to all code that makes use of the platforms in question. The overall structure of the Express app is based on example code by Stelios Sotiriadis from his lab tutorials.

<api-app/middleware/validateBody.js> and <api-app/middleware/validateQuery.js> and structure of validation functions in <api-app/models/user.js> based on `Joi validation in a Mongoose model`, available online at <https://gist.github.com/stongo/6359042?permalink_comment_id=3476052#gistcomment-3476052>. Last accessed 31/3/2022.

<api-app/middleware/authorise.js> based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/validations/validation.js>. Last accessed 31/3/2022.

<api-app/models/user.js> user pre-save salting and hashing based on 'Password Authentication with Mongoose Part 1' by MongoDB, available online at <https://www.mongodb.com/blog/post/password-authentication-with-mongoose-part-1>. Last accessed 31/3/2022.

<api-app/routes/users.js> basic code structure based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/routes/auth.js>. Last accessed 31/3/2022.

<api-app/server.js> basic code structure based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/app.js>. Last accessed 31/3/2022.

<api-app/Dockerfile> and <auction-closer/Dockerfile> based on 'Dockerizing a Node.js web app' by OpenJS Foundation, available online at <https://nodejs.org/en/docs/guides/nodejs-docker-webapp/>. Last accessed 31/3/2022.

<auction-closer/Dockerfile> and <auction-closer/crontab> and <auction-closer/entrypoint.sh> based on 'Running Cron in Docker' by Jason Kulatunga, available online at <https://blog.thesparktree.com/cron-in-docker>. Last accessed 31/3/2022.
