# auction-api

Cloud-based Auction API, written in NodeJS with cron-based auction closer and MongoDB data storage, all served as via docker-compose. Also a non-cloud Python API testing script that queries the API via its public interface.

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

This should bring up the API on <http://localhost:3000>. To verify it's working, navigate to that address in a browser and you should see the message 'Server is running!' in the browser window.

The docker compose file sets up three separate services: the API, the auction-closer which runs on a cron job, and a MongoDB service that stores data for the API. Both the API and the auction-closer communicate with the Mongo database, but the only service that's exposed to users is the API, via requests to the localhost endpoint.

Because of the services being used, the services may behave unintuitively when stopped and started. To avoid confusion, do the following:

- **To stop and start without losing the state of your containers**, either run `docker-compose stop` or interrupt the process in the console with Ctrl-C. This will preserve the db content. Then run `docker-compose start` to restart them. This has the advantage that you can preserve the state of your database without having to re-seed its contents. But on the downside, any changes you make to the application source code will not be reflected in the dockerised applications. You can however rebuild individual services by name using e.g. `docker-compose build web closer`, which will refresh the code without affected the MongoDB service.
- **When stopping the services, to clear data and builds for both the Mongo database and the two applications**, run `docker-compose down --rmi local` in the root folder. You can do this in a separate console, or use Ctrl-C to stop the containers and get control back, then run this command. The next time you bring up the services, they will start afresh.
- **To guarantee a fresh build, with a clean database and freshly built applications**, run `docker-compose up --build -V`. This takes slightly longer to start due to the rebuilding process, but you definitely won't be running old code or using a database with existing records.

Finally, a major caveat when working in a development environment. Instructions on using the API are included in this document. Resetting the database does not invalidate existing authorisation tokens, but continuing to use them will result in broken data and unexpected behaviour. To avoid issues, always delete your previously generated tokens and create and login as a new user when you drop the database.

### Running tests

Tests are run locally, instead of setting up another docker service. You'll need a Python 3 installation on your machine, and both `pytest` and the `pytest-dependency` plugin:

```sh
cd auction-api/api-test-app
pip install pytest
pip install pytest-dependency     # This ensures tests are run in the correct order
```

Before running tests, bring up a fresh docker setup:

```sh
cd auction-api
docker-compose up --build -V      # Ensure a fresh install and clean db
cd api-test-app
pytest                            # Run the tests
cd ..
docker-compose down --rmi local   # Remove records generated by the test
```

### Interacting with the API - a tour and API reference

All API actions are RESTful, with JSON body for POST data, an auth-token header where required for authorisation, and query params for parameters additional to the REST actions and resource identities. In the default local setup using docker-compose, the root endpoint is at <http://localhost:3000/>.

The API sends one of three response statuses:

- 200 - the request succeeded. Accompanying information is returned as a JSON body.
- 400 - the request failed. Accompanying information may be returned as plain text.
- 401 - authentication failure. The accompanying text indicates a more precise cause.

Full details of each API call are provided later on. However, as an introduction to interacting with the API, you may wish to try the following exercise. The included screenshots were taken in Postman. The requests were made against an API after first generating some dummy records by running the Python testing app, to give some more content to play with:

- First, set up a development environment as described previously
- Check the API is online by navigating to the root. You can even do this in a web browser. The default address is <http://localhost:3000/>
  ![Screenshot of browser showing server status](./images/tour-00-check-server-status.png)
- Then, create a new user by making a POST request to `/users/register` (i.e. <http://localhost:3000/users/register>) using a request tool such as Postman
  ![Screenshot of request to register a new user](./images/tour-01-register-user.png)
- Generate an auth-token to prove you're the user by making a POST request to `/users/login`, and copying the auth-token you get in response. You'll need to include that auth-token as a header in all the requests you make below
  ![Screenshot of request to log in as the new user](./images/tour-02-login-user.png)
- Now, put an item up for auction by making a POST request to `/items`. This creates both an item record with the details of what the item is, its description etc. It also creates an auction record which is used to track the progress of the auction, to store bids, and to determine the eventual winner of the auction
  ![Screenshot of request to post a new item for auction](./images/tour-03-post-item.png)
- Want to see the item you just posted? You can browse item details with a GET request to `/items`, or make a GET request to `/auctions` to see how the auction is progressing for each item that's been posted. If you're looking for only open or only completed auctions, add a parameter of the form `?status=open|completed` to the auctions URL
  ![Screenshot of request to show all items, with the response body cut off due to length](./images/tour-04-get-items.png)
- Each auction response includes a list of all bids to date in an array called bids
  ![Screenshot of request to show all open auctions, with the response body cut off due to length](./images/tour-05-get-open-auctions.png)
- Because records cross-reference each other, you can use the itemId in an auction record to look up the matching item details, or the auctionId in an item record to look up the matching auction, using a GET request to `/items/:id` or `/auctions/:id`
  ![Screenshot of request to show a single auction using the auction ID](./images/tour-06-get-auction-by-id.png)
- There's a problem with all of this. If you're running on your local machine, you're probably the only 'user', and you can't bid on your own auctions. To try out the bidding functionality, you'll need to make register and login requests for multiple different users, with unique usernames and email addresses. This will give you a different `auth-token` value for each user, and you can pretend to be different users by using their auth-token values in the requests that you make
- The purpose of the auction system is to allow users to bid on each other's items. So, once you've found an item you like, submit a bid by making a POST request to `/auctions/:id/bids`. If you're bidding on an item that you posted, your request will fail.
  ![Screenshot of request to bid on own item](./images/tour-07-post-bid-for-own-item.png)
  It will also fail if the auction's closingTime has passed and the auction status is closed. If your bid is successful, the response will give full details of the auction, including all bids to date and the current highest bidder's userId and amount. If you submitted the highest bid, this will be you
  ![Screenshot of request to bid on someone else's item, as the highest bidder](./images/tour-08-post-bid-for-other-item.png)
- Once the auction is finished, the auctionStatus will be marked as completed, and the winner's userId and bid amount will be stored in the main auction record. The bids array in the auction record will include a record of all bids submitted
  ![Screenshot of request to show an auction that's ended and had multiple bids](./images/tour-09-show-completed-auction-by-id.png)

The above tour covers all of the API's functionality. The auction-closer application doesn't support user interaction, and can be seen in action when it changes the auction status to closed once the closingTime has been reached. Instructions for running the API test cases can be found in the 'Running tests' section, and the Python code provides a model for how to interact with the API programmatically. In addition, the following API documentation gives routes, parameters and responses for every implemented API action.

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

As detailed in the development notes, the API cryptographically verifies the signature of requests made with the auth-token, using the value of TOKEN_SECRET defined during setup of the application. However, when it receives a request with an auth-token header, it does not check the database to ensure that the information contained in the token is still valid. This means that an auth-token cannot be revoked, even if the user whose ID is verified is deleted from the database or the database is wiped entirely, and any actions carried out with the auth-token will be attributed to a userId that may not even be in the database anymore. To avoid issues, always delete your previously generated tokens and register / login as a new user when you drop the database.

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

## Architecture decisions, rationales, and potential improvements

### Virtualised services and containerisation

The project brief required that the services would deploy and run in a virtualised environment, on the development machine. This makes it easier to deploy to production, as the resulting code does not rely on hidden state in the local environment and is packaged for deployment anywhere that's needed.

In the implementation of the brief, I've used a docker-compose configuration that deploys an auction API, an auction-closer cron job that closes auctions when they reach their closing date, and a MongoDB service to store data. This meets the requirements of the brief, and means that anyone with docker and docker-compose installed on their machine can install, makes changes to, and run the software with high confidence that its behaviour will match that of all other deployments running the same code. I've also stored the full set of code (and this documentation) in a single git repository to make sharing and synchronising code easier, and to provide a base for CI/CD setup if required.

I have left one aspect of the project outside of docker, as the project brief required that it be developed outside of the virtual machine. The Python testing application is designed to be run locally, and interacts with the dockerised services through a localhost endpoint to provide assurance that the services are actually accessible by the outside world and that their behaviour matches expectations when interacted with using actual API requests. I did consider automating the docker setup and teardown such that tests could be run with a single command, but the fragility and obscurity of the solution outweighed the reduction in complexity for developers.

It's worth noting that, although the docker setup is ready for containerised development, the main IaaS providers operate their own dedicated services that are preferable to deploying on docker containers. With Google Cloud Platform, instead of three docker containers we would use managed MongoDB Atlas, managed application hosting such as App Engine, and Cloud Scheduler triggering Cloud Functions instead of a dockerised cron job. These services all operate in a distributed fashion, so they behave differently and require awareness of issues that can occur more frequently in distributed systems.

The different infrastructure for production means that there would still be further work to ready the project for actual production-quality deployment. Some cloud services can be mimicked locally using e.g. the AWS SDK, but if those were used we would still want to use them within containers, to properly isolate and manage their configuration. It would also be much simpler to extend a containerised setup than a purely local one, given that we have a guarantee that the infrastructure and underlying state are fully encapsulated in the docker configuration. I've written a list of tasks that would improve production readiness, and included them at the end of the architecture section.

### Data structures

To meet the specification, the API application uses four models, which are stored in MongoDB as three collections plus a subdocument array, as follows.

![Diagram of models and relations](./images/Auction%20API%20data%20structure.svg)

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

### Authorisation, and use of auth tokens

User authentication and authorisation follows the method implemented in lab sessions of the Cloud Computing module[TODO: add cite link]. Most types of request to the API must include a valid `auth-token` header. The header content is initially generated by the API upon receipt of a valid `/users/login` request from a user, and returned in the response body.

The user includes the auth-token content in the header of future requests that require auth, i.e. any requests to routes other than `/`, `/users/register`, and `/users/login`. The token is a JSON web token (JWT), which contains the Mongo document ID of the user and a cryptographic signature. When the API receives a request, it verifies the signature against the JWT content and the `TOKEN_SECRET` private key, and sets `req.user._id` in the Express request object to the verified user ID value. This is provided using middleware which runs for each auth-secured API request before the rest of the route is actioned. If the token is missing, or the signature does not decrypt successfully, then the middleware prevents further execution and returns a 401 not authorised response.

This model is simple and effective, and is used in production software. However, it has serious issues that make this implementation of it somewhat risky. Any generated signature will be valid forever, even if the database is cleared and the software rebuilt.

There are several consequences to this immutability:

- The only way to stop a token from being verified is to change the value of TOKEN_SECRET. This will invalidate *all* existing tokens as the signatures will no longer match the signature from the private key
- Therefore, a single compromised token cannot be blocked without invalidating all logins, which creates a lot of work for other users, and could result in serious additional load and delays to request submission if it's required on a frequent basis
- If a user is deleted, the token is still valid. So it's possible for item, auction and bid postings to be made by a non-existent user
- The lack of an expiry date means that a token can be used forever. This further increases the risk posed by compromise of a user's credentials

![Screenshot of a successful API request from a nonexistent user](./images/api-request-by-nonexistent-user.png)

The above screenshot shows a POST request made using a non-existent user following database reset. The user existed at the time of token generation, but the database reset has not invalidated the token since the TOKEN_SECRET value is still the same. The request returns a success response and generates item, auction, and bid objects. All of these objects refer to a non-existent user ID, retrieved from the JWT that forms the auth-token.

There are several options for improving on this that have seen implementation in production systems I've worked on:

- Most simply, include an expiry time in each token that gets generated, and reject an auth header when the token's expiry time has passed. This could be a few minutes, hours, or days, depending on the security requirements of the service. Any software that interacts with the API will need to include automated posting of a new login request and storage of the returned token when a request with auth header fails returns a 401 response. This is more secure, doesn't require the API to verify auth with the database, and limits the period of exposure if the auth token does get compromised
- Better yet, generate and store unique session tokens in the database for each user. They can be JWTs or random strings, doesn't matter too much. Each request would be validated by matching the auth-token header against the database record. With this approach, the session token could be invalidated whenever required by updating the database record, and if the API still uses private keys, it could change them without invalidating existing tokens.

The main practical impact of the current approach to auth tokens is that it's very easy for a developer to forget to get a new token when the database is reset, and it won't be obvious that the requests are generating data for a non-existent user.

To avoid this, each time you reset the database, stop using all previously generated auth-tokens. Use the register route to create a new user, then the login route to generate a fresh token, and attach *that* token to further requests.

Alternatively, an enterprising developer could stop relying on a permanent secret key, and instead modify the code in `api-app/routes/users.js` to generate a new token on startup and forget it when the application is rebuilt.

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

### Test approach and test cases

The project brief required that a test suite be written separately using Python, using http requests to test numerous aspects of the API's behaviour. This has been implemented in the api-test-app folder, as a set of pytest tests in <api-test-app/test_api.py>.

There are advantages and disadvantages to this approach:

- Pytest provides a useful, standardised framework for collating, running and reporting on test cases, and keeping all of the test cases in one system means that it's easier to regularly run all tests as part of a development process
- Running the tests entirely separately from the application codebase ensures true end-to-end integration testing, making the results more trustworthy
- The setup required to run tests from the outside also means that the `test_api` code provides a demonstration of how to interact programmatically with the API, making it easier to provide accurate API documentation and examples to follow
- External testing does not support unit testing, making test-driven development more difficult
- Tests are fragile to disruption by environmental factors. If anything goes wrong in the docker instances, for example the database isn't cleared before testing or the docker cron setup stops working for some reason, then all of the testing will fall over until the issue is fixed
- External testing removes control over the internal conditions of the application environment. Most obviously, this hampers testing around behaviour of auction closing times. The test_TC11 test case shows one way of working around this particular issue, but there are others, e.g. testing whether overlapping bid-saves could lead to an incorrect winnerId being set
- As discussed in the section on virtual services and containerised development, actual production deployment should ideally make use of dedicated, managed cloud services instead of directly deployed docker containers. The changes in behaviour that result from this mean that assurance of application behaviour in a containerised local environment does not guarantee the same behaviour in a production environment

The User class in that file provides demonstration code for interacting with the API in Python. Each user of the API is represented by a separate instance of the User class, and the user instance automatically retrieves and stores key information about the user from the API's responses to requests. Thus, if we want to create a user called Olga, have her log in to get an auth token, then post an item for sale with a closing date 1 day from now, we could use the following:

```python
olga = User('Olga')
olga.register("olga", "olga@example.com", "aPassword")
olga.login()
olga.post_item(
    'A lovely teapot',
    'used',
    'This teapot is marvellous, not least because it should never '
    'appear in the auction catalogue.',
    (datetime.datetime.utcnow() +
     datetime.timedelta(
        days=1)))
```

In the above, we don't need to pass the email and password to the login request because the `User.register()` method stores the arguments passed to it and uses them as needed for future requests. Likewise with the auth-token header that we're given in response to `User.login()`.

The test cases match to those required in the brief, with one additional case and additional checks within some of the required cases. Because many test cases follow on from each other and rely on the database state produced by previous requests, I've used `pytest-dependency` to enforce an ordered execution of the test cases. For the same reason, there is no cleaning of the database between tests.

The individual cases, with descriptions taken directly from the project brief, are:

- **test_get_root - Test that GET / returns a status message**. This is the simplest possible test. It doesn't rely on the User class as the request to root (i.e. GET <http://localhost:3000/>) can be made anonymously, and serves mainly to confirm that the environment setup has succeeded and the API is listening on the correct port
- **test_TC1 - Olga, Nick and Mary register in the application and are ready to access the API**. For each user, send a request to `/users/register`, and confirm both that the response code is 200 and that a user ID has been received and stored
- **test_TC2 - Olga, Nick and Mary will use the oAuth v2 authorisation service to get their tokens**. For each user, send a request to `/users/login`, and confirm both that the response code is 200 and that an auth-token has been received and stored
- **test_TC3 - Olga makes a call to the API (any endpoint) without using a token. This call should be unsuccessful as the user is unauthorised**. Get Olga to send a POST request to `/items` with no auth-token header, and confirm that the response code is 401
- **test_TC4 - Olga adds an item for auction with an expiration time using her token**. For this, Olga sends the same request as in test_TC3, but include the auth-token in the header that she received following her successful login in test_TC2. Confirm the response code is 200 and that Olga has received and stored an item ID
- **test_TC5 - Nick adds an item for auction with an expiration time using his token**. Same as with Olga in test_TC4, Nick makes a POST request to `/items` with the auth-token in the header that he received in test_TC2. Confirm the response code is 200 and that Nick has received and stored an item ID
- **test_TC6 - Mary adds an item for auction with an expiration time using her token**. Same as Olga and Nick, a post request to `/items` with her auth-token in the header. Confirm the response code is 200 and that Nick has received and stored an item ID
- **test_TC7 - Nick and Olga browse all the available items, there should be three items available**. This requires each of them to GET `/items` with their auth-token in the header, then confirm that the response status is 200 and there are three elements in the JSON array that gets returned in the body
- **test_TC8 - Nick and Olga get the details of Mary’s item**. To account for the separation between items and auctions, Nick and Olga each make GET requests to both `/items/:id` where the ID is the item ID returned from Mary's item posting request in test_TC6, and to `/auctions/:id` where the ID is the auction ID taken from the same response. Confirm that all four response codes are 200, that the title in the returned item matches the title posted by Mary, and that the ID code of the auction record returned matches the one sent to Mary in each case. That last check isn't terribly informative, but does ensure that the record is present.
- **test_TC9 - Mary bids for her item. This call should be unsuccessful, an owner cannot bid for their own items**. Mary makes a POST request to `/auctions/:id/bids` where :id is the auction ID returned in test_TC6, with her auth-token in the header as usual. But instead of a 200 she should get a 400 response code, indicating that the request was not accepted.
- **test_TC10 - Nick and Olga bid for Mary’s item in a round-robin fashion (one after the other)**. To satisfy this, we alternate POST requests to `/auctions/:id/bids` by Nick and Olga, both using the same auction ID that was returned to Mary, but increasing the amounts each time. I also inserted a wrinkle in this test case by making the last bid, by Olga, equal in amount to the preceding bid by Nick. The auction rules I've implemented allow for bids to be submitted at or below the highest bid amount, but they only update the winner if the bid amount is above that of the previous highest bidder. Therefore, we confirm that each bid request has a 200 response. We also confirm that, after the final bid, which is made by Olga, the winnerID shown in the response body is actually Nick's user ID.
- **test_TC11 - Nick or Olga wins the item after the end of the auction**. This is where it gets more complex. We can't easily change the system time on the docker services, as they operate separately to the Python test script. To get around this, we set a closingTime in the very near future for Mary's auction, back in test_TC6. 20 seconds seems to work fine. Then Nick makes a GET request to `/auctions/:id` with the ID of Mary's auction, on a loop with a 10-second delay, until either the auction status in the response is marked as 'completed', or 100 seconds have passed. Then we confirm that the response code is 200, that the winner is marked as Nick, that the winning amount is the highest amount that Nick bid in test_TC10, and that the auction status for Mary's is showing as completed. All of these are returned by the GET request.
- **test_TC12 - Olga browses all the items sold**. Olga makes a GET request to `/auctions?status=completed`, and confirms that the response code is 200 and that Mary's auction ID is the ID of the first element in the response array. This has the wrinkle that we can query auctions by auction status, but not items. If we want the item information for each auction, we would need to pull in the item data using the itemId field that is present in each auction record, then make GET requests to `/items/:id` for each item thus identified.
- **test_TC13 - Mary queries for a list of bids as historical records of bidding actions of her sold item**. The API schema makes this one trivial. Mary makes a GET request to `/auctions/:id` where :id is the ID of her auction, and the bids array in the response will contain all of the bid records for that auction. In this case, we just confirm that there are five bid records in the array, representing the automatic starting bid of 0 made by the original item submitter, and the four bids we made in test_TC10.

![Screenshot of a successful pytest run](./images/pytest-run-successful.png)

The above screenshot shows a successful pytest run of the described test cases, in the command line. I used two console sessions, one to set up the docker environment and monitor activity, the other to run the test suite. I could have run both in the same console session by using the `-d` flag on docker-compose to detach docker execution from the shell process, but it's useful to keep the output visible. In this particular test run, I used the `-ra` and `-vv` flags on pytest to produce more verbose output for passing tests, as the standard output for all tests passing is less useful in a screenshot. One other thing the screenshot doesn't show is the pause of about a minute during execution of test_TC11, while the test waits for the auction-closer to trigger and mark Mary's auction as closed.

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

One task was also dropped following development of a draft solution. I used the `python_on_whales` package to automate setup of test docker services in a separate namespace, so that tests could be run with a single `pytest` command rather than manually setting up a 'clean' set of services. However, brief usage convinced me that this would add fragility to the overall setup, and hide important detail from developers who would be managing a development docker-compose development.

### Tasks for production deployment

The application does not have a configuration for production deployment, i.e. deployment on the cloud with access via the open internet. A reliable, secure, professional cloud setup would benefit from the following:

- [ ] Extract controllers from the existing route code, and move code that works with each model to the matching controller. As an example, the Item route saves a new Item, Auction, and Bid, and there is logic affecting Auction and Bid objects contained directly within the Item route and model
- [ ] Auth-token storage and retrieval in the database, token expiry, and token revocation - these are required for security, as an attacker who stole someone's auth-token would otherwise have irrevocable access to their account
- [ ] Virtual Private Cloud (VPC) setup to ensure that only the API endpoint is accessible via the open internet
- [ ] Auth between services, specifically adding a username and password for MongoDB to be accessed by the API and auction-closer services. If neither this nor the VPC are implemented, then the MongoDB service presents a substantial **security risk** in production deployment
- [ ] CI/CD scripts that build and test the app in a managed cloud environment, then allow merge to production branch if tests pass and approval is given, then deploys from production branch to the production service. This could be written using GitHub Actions, a dedicated CI service such as CircleCI, or one of the cloud providers' own services
- [ ] Ensure that the API endpoint is only addressable via https, i.e. that all communication is secure. The auth-token approach is trivially insecure without this.
- [ ] Application monitoring and statistics. The AWS version of this is CloudWatch, which can be used to monitor service usage levels, CPU and database load, error rates, and more. Alarms can be set up to alert admins if error rates go down
- [ ] Most cloud services offer multi-zone or multi-region mirroring of services. To make use of this, we'd want to use e.g. MongoDB Atlas, and an API gateway service that load-balanced across multiple servers running the API, and handing off to each other in the event of downtime. This would also make it easier to use gradual roll-out and instant roll-back on error, blue-green deployment, and versioned API support
- [ ] Handling of requests or responses that get lost in transit. Currently, if a user does not receive a response, then they cannot be certain if their request was actioned without manually querying the parent of whatever object they're trying to create. There is also no protection against duplicate requests when posting items. It may be sensible to operate a two-step process where a user first requests an ID for their actual request, then sends a PUT with the actual request and the assigned ID to prevent duplication
- [ ] It's normal to guard against spam and DoS by rate limiting requests from individual accounts and IP addresses
- [ ] Test for and (if necessary) guard against clashes in assigning the winning bidder caused by overlapping bid requests. This could be managed by e.g. locking the auction object during update
- [ ] Consider using an SQL database for storage, either replacing or in addition to MongoDB. It's not clear that the advantages of NoSQL are suited to this particular application
- [ ] Add an emailing service triggered by the auction-closer, to email auction bidders when an auction closes and let them know whether they won, and to email the item owner and let them know the sale price

## References

Where I have based code on examples sourced from the internet, I have acknowledged this in comments above the code, with the original URL included. Where code follows a standard 'boilerplate' structure without room for deviation or creativity, this is not acknowledged, as it is common to all code that makes use of the platforms in question. The overall structure of the Express app is based on example code by Stelios Sotiriadis from his lab tutorials.

<api-app/middleware/validateBody.js> and <api-app/middleware/validateQuery.js> and structure of validation functions in <api-app/models/user.js> based on `Joi validation in a Mongoose model`, available online at <https://gist.github.com/stongo/6359042?permalink_comment_id=3476052#gistcomment-3476052>. Last accessed 31/3/2022.

<api-app/middleware/authorise.js> based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/validations/validation.js>. Last accessed 31/3/2022.

<api-app/models/user.js> user pre-save salting and hashing based on 'Password Authentication with Mongoose Part 1' by MongoDB, available online at <https://www.mongodb.com/blog/post/password-authentication-with-mongoose-part-1>. Last accessed 31/3/2022.

<api-app/routes/users.js> basic code structure based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/routes/auth.js>. Last accessed 31/3/2022.

<api-app/server.js> basic code structure based on 'Class 4' by Stelios Sotiriadis, available online at <https://github.com/steliosot/cc/blob/master/Class-4/mini-film-auth/app.js>. Last accessed 31/3/2022.

<api-app/Dockerfile> and <auction-closer/Dockerfile> based on 'Dockerizing a Node.js web app' by OpenJS Foundation, available online at <https://nodejs.org/en/docs/guides/nodejs-docker-webapp/>. Last accessed 31/3/2022.

<auction-closer/Dockerfile> and <auction-closer/crontab> and <auction-closer/entrypoint.sh> based on 'Running Cron in Docker' by Jason Kulatunga, available online at <https://blog.thesparktree.com/cron-in-docker>. Last accessed 31/3/2022.
