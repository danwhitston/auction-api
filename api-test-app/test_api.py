import requests
import pytest
from requests.compat import urljoin
import datetime
import time

ENDPOINT = "http://localhost:3000"

# There are major problems with the complete separation of testing and app
# environments. Since the test environment does not control the app
# environment, it's dependent on correct, manual setup of the app. I can see
# three immediate problems from this:
# 1. If the Mongo database is not empty, then the tests may fail in
#    unpredictable ways. This also prevents re-running of tests without
#    first resetting the environment.
# 2. It's very difficult to deliberately introduce timing clashes between
#    requests, which makes testing of sync issues harder.
# 3. The test app can't mock or stub the API. In particular, it can't alter
#    the system time as it's perceived by the API, which makes testing of
#    auction closing times considerably less elegant.
# For now, I'm setting auction closing times on the assumption that the
# Python and auction-closer environments both use UTC and have the correct
# time. Tests will fail if this is not the case.


class User:

    def __init__(self, name):
        self.name = name

    def register(self, username: str, email: str, password: str):
        url = urljoin(ENDPOINT, "/users/register")
        payload = {'username': username, 'email': email, 'password': password}
        self.response = requests.post(url, json=payload)
        self.username = username
        self.email = email
        self.password = password
        self.id = self.response.json()['_id']

    def login(self):
        """We assume register() has been run previously. This relies
        on self.email and self.password"""
        url = urljoin(ENDPOINT, "/users/login")
        payload = {'email': self.email, 'password': self.password}
        self.response = requests.post(url, json=payload)
        self.auth_token = self.response.json()['auth-token']

    def post_item(
            self,
            title: str,
            condition: str,
            description: str,
            closing_time: datetime.datetime,
            include_auth_token: bool = True):
        url = urljoin(ENDPOINT, "/items")
        payload = {
            'title': title,
            'condition': condition,
            'description': description,
            'closingTime': closing_time.isoformat()}
        headers = {}
        if include_auth_token:
            headers['auth-token'] = self.auth_token
        self.response = requests.post(url, json=payload, headers=headers)
        if self.response.status_code == 200:
            self.closing_time = closing_time
            self.item_id = self.response.json()['item']['_id']
            self.auction_id = self.response.json()['auction']['_id']

    def get_items(self):
        url = urljoin(ENDPOINT, "/items")
        headers = {'auth-token': self.auth_token}
        self.response = requests.get(url, headers=headers)

    def get_item(self, item_id):
        url = urljoin(ENDPOINT, "/items/" + item_id)
        headers = {'auth-token': self.auth_token}
        self.response = requests.get(url, headers=headers)

    def get_auction(self, auction_id):
        url = urljoin(ENDPOINT, "/auctions/" + auction_id)
        headers = {'auth-token': self.auth_token}
        self.response = requests.get(url, headers=headers)

    def post_bid(self, auction_id, amount):
        url = urljoin(ENDPOINT, "/auctions/" + auction_id + "/bids")
        headers = {'auth-token': self.auth_token}
        payload = {'amount': amount}
        self.response = requests.post(url, headers=headers, json=payload)
        if self.response.status_code == 200:
            # The response returns the entire auction item,
            # so we find the last element in the bids
            # array and use the id of that as the bid ID
            self.bid_id = self.response.json()['bids'][-1]['_id']

    def get_auctions_completed(self):
        url = urljoin(ENDPOINT, "/auctions")
        params = {'status': 'completed'}
        headers = {'auth-token': self.auth_token}
        self.response = requests.get(url, params=params, headers=headers)


def test_get_root():
    """Test that GET / returns a status message"""
    response = requests.get(ENDPOINT)
    assert response.status_code == 200
    assert response.content == b"Server is running!"


@pytest.mark.dependency()
def test_TC1():
    """Olga, Nick and Mary register in the application and are ready to access
    the API."""
    olga.register("olga", "olga@example.com", "aPassword")
    nick.register("nick", "nick@example.com", "anotherPassword")
    mary.register("mary", "mary@example.com", "aThirdPassword")
    assert olga.response.status_code == 200
    assert nick.response.status_code == 200
    assert mary.response.status_code == 200
    assert hasattr(olga, 'id')
    assert hasattr(nick, 'id')
    assert hasattr(mary, 'id')


@pytest.mark.dependency(depends=["test_TC1"])
def test_TC2():
    """Olga, Nick and Mary will use the oAuth v2 authorisation service to get
    their tokens."""
    olga.login()
    nick.login()
    mary.login()
    assert olga.response.status_code == 200
    assert nick.response.status_code == 200
    assert mary.response.status_code == 200
    assert hasattr(olga, 'auth_token')
    assert hasattr(nick, 'auth_token')
    assert hasattr(mary, 'auth_token')


def test_TC3():
    """Olga makes a call to the API (any endpoint) without using a token. This
    call should be unsuccessful as the user is unauthorised."""
    # I've added a flag to the item posting method, to post a request without
    # the token that would otherwise be included automatically
    olga.post_item(
        'A lovely teapot',
        'used',
        'This teapot is marvellous, not least because it should never appear in the auction catalogue.',
        (datetime.datetime.utcnow() +
         datetime.timedelta(
            days=1)),
        False)
    assert olga.response.status_code == 401


@pytest.mark.dependency(depends=["test_TC2"])
def test_TC4():
    """Olga adds an item for auction with an expiration time using her
    token."""
    olga.post_item('A lovely teapot', 'used', 'This teapot is marvellous',
                   (datetime.datetime.utcnow() + datetime.timedelta(days=1)))
    assert olga.response.status_code == 200
    assert hasattr(olga, 'item_id')


@pytest.mark.dependency(depends=["test_TC4"])
def test_TC5():
    """Nick adds an item for auction with an expiration time using his
    token."""
    nick.post_item('A set of cutlery', 'new', 'Useful for eating stuff',
                   (datetime.datetime.utcnow() + datetime.timedelta(days=2)))
    assert nick.response.status_code == 200
    assert hasattr(nick, 'item_id')


@pytest.mark.dependency(depends=["test_TC5"])
def test_TC6():
    """Mary adds an item for auction with an expiration time using her
    token."""
    # I've set a closing time of 20 seconds, as we wait for this auction
    # to close so that we confirm the auction-closer is working correctly
    mary.post_item(
        'Faded tablecloth',
        'used',
        'Well loved, has a fluffy bunnies pattern',
        (datetime.datetime.utcnow() +
         datetime.timedelta(
            seconds=20)))
    assert mary.response.status_code == 200
    assert hasattr(mary, 'item_id')


@pytest.mark.dependency(depends=["test_TC6"])
def test_TC7():
    """Nick and Olga browse all the available items, there should be three
    items available."""
    nick.get_items()
    olga.get_items()
    assert nick.response.status_code == 200
    assert olga.response.status_code == 200
    assert len(nick.response.json()) == 3
    assert len(olga.response.json()) == 3


@pytest.mark.dependency(depends=["test_TC7"])
def test_TC8():
    """Nick and Olga get the details of Mary’s item."""
    # I've extended this to both *item* and *auction*
    nick.get_item(mary.item_id)
    assert nick.response.status_code == 200
    assert nick.response.json()['title'] == 'Faded tablecloth'
    olga.get_item(mary.item_id)
    assert olga.response.status_code == 200
    assert olga.response.json()['title'] == 'Faded tablecloth'
    nick.get_auction(mary.auction_id)
    assert nick.response.status_code == 200
    assert nick.response.json()['_id'] == mary.auction_id
    olga.get_auction(mary.auction_id)
    assert olga.response.status_code == 200
    assert olga.response.json()['_id'] == mary.auction_id


@pytest.mark.dependency(depends=["test_TC8"])
def test_TC9():
    """Mary bids for her item. This call should be unsuccessful, an owner
    cannot bid for their own items."""
    # Note that bids happen on *auctions*, not *items*
    mary.post_bid(mary.auction_id, 10)
    assert mary.response.status_code == 400


@pytest.mark.dependency(depends=["test_TC9"])
def test_TC10():
    """Nick and Olga bid for Mary’s item in a round-robin fashion (one after
    the other)."""
    nick.post_bid(mary.auction_id, 20)
    assert nick.response.status_code == 200
    olga.post_bid(mary.auction_id, 25)
    assert olga.response.status_code == 200
    nick.post_bid(mary.auction_id, 50)
    assert nick.response.status_code == 200
    # Bids at or below the current highest bid are still accepted
    # But the auction winnerId won't update to the non-winner
    olga.post_bid(mary.auction_id, 50)
    assert olga.response.status_code == 200
    assert olga.response.json()['winnerId'] == nick.id


@pytest.mark.dependency(depends=["test_TC10"])
def test_TC11():
    """Nick or Olga wins the item after the end of the auction."""
    # In theory, Mary's auction should only last 20 seconds
    # However, the auction-closer runs once a minute, and can
    # take e.g. 20 seconds to run. For simplicity, we try waiting
    # then checking auction status, and give up if it doesn't shut
    # within 100 seconds
    start_time = datetime.datetime.now()
    while (datetime.datetime.now() - start_time).total_seconds() < 100:
        time.sleep(10)
        nick.get_auction(mary.auction_id)
        if nick.response.json()['auctionStatus'] == 'completed':
            break
    assert nick.response.status_code == 200
    assert nick.response.json()['winnerId'] == nick.id
    assert nick.response.json()['winnerAmount'] == 50
    assert nick.response.json()['auctionStatus'] == 'completed'


@pytest.mark.dependency(depends=["test_TC11"])
def test_TC12():
    """Olga browses all the items sold."""
    olga.get_auctions_completed()
    assert olga.response.status_code == 200
    # Only 1 auction should be completed
    assert len(olga.response.json()) == 1
    # And that auction is for Mary's item
    assert olga.response.json()[0]['_id'] == mary.auction_id


@pytest.mark.dependency(depends=["test_TC12"])
def test_TC13():
    """Mary queries for a list of bids as historical records of bidding
    actions of her sold item."""
    mary.get_auction(mary.auction_id)
    assert mary.response.status_code == 200
    # There were 5 valid bids, like so:
    # 1 default starting bid of 0 from the item owner in TC6
    # 1 invalid bid in TC 9, thus not counted
    # 4 valid bids in TC10
    assert len(mary.response.json()['bids']) == 5


olga = User('Olga')
nick = User('Nick')
mary = User('Mary')
