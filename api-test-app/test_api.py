import requests
import pytest

ENDPOINT = "http://localhost:3000"


class User:

    def __init__(self, name):
        self.name = name

    def register(self, username, email, password):
        self.username = username
        self.email = email
        self.password = password


@pytest.mark.dependency()
def test_TC1():
    """Olga, Nick and Mary register in the application and are ready to access
    the API."""
    olga.register("olga", "olga@example.com", "aPassword")
    assert olga.username == "olga"


@pytest.mark.dependency(depends=["test_TC1"])
def test_TC2():
    """Olga, Nick and Mary will use the oAuth v2 authorisation service to get
    their tokens."""
    assert olga.username == "olga"


@pytest.mark.dependency(depends=["test_TC2"])
def test_TC3():
    """Olga makes a call to the API (any endpoint) without using a token. This
    call should be unsuccessful as the user is unauthorised."""
    pass


@pytest.mark.dependency(depends=["test_TC3"])
def test_TC4():
    """Olga adds an item for auction with an expiration time using her
    token."""


@pytest.mark.dependency(depends=["test_TC4"])
def test_TC5():
    """Nick adds an item for auction with an expiration time using his
    token."""
    pass


@pytest.mark.dependency(depends=["test_TC5"])
def test_TC6():
    """Mary adds an item for auction with an expiration time using her
    token."""
    pass


@pytest.mark.dependency(depends=["test_TC6"])
def test_TC7():
    """Nick and Olga browse all the available items, there should be three
    items available."""
    pass


@pytest.mark.dependency(depends=["test_TC7"])
def test_TC8():
    """Nick and Olga get the details of Mary’s item."""
    pass


@pytest.mark.dependency(depends=["test_TC8"])
def test_TC9():
    """Mary bids for her item. This call should be unsuccessful, an owner
    cannot bid for their own items."""
    pass


@pytest.mark.dependency(depends=["test_TC9"])
def test_TC10():
    """Nick and Olga bid for Mary’s item in a round-robin fashion (one after
    the other)."""
    pass


@pytest.mark.dependency(depends=["test_TC10"])
def test_TC11():
    """Nick or Olga wins the item after the end of the auction."""
    pass


@pytest.mark.dependency(depends=["test_TC11"])
def test_TC12():
    """Olga browses all the items sold."""
    pass


@pytest.mark.dependency(depends=["test_TC12"])
def test_TC13():
    """Mary queries for a list of bids as historical records of bidding
    actions of her sold item."""
    pass


olga = User('Olga')
nick = User('Nick')
mary = User('Mary')
