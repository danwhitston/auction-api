const { Auction } = require("../models/auction");
const { Bid, validateBid } = require("../models/bid");
const { Item } = require("../models/item");
const express = require("express");
const router = express.Router({ mergeParams: true });
const validateMiddleWare = require("../middleware/validate");
const authMiddleWare = require("../middleware/authorise");

// Submit a bid for an open auction. I've left lots of code in that could
// be moved to an auctions controller, partly because I'm not using a full
// controller setup, partly to reduce risk of evasion
router.post(
  "/",
  [authMiddleWare(), validateMiddleWare(validateBid)],
  async (req, res) => {
    const auctionId = req.params.id; // guaranteed to be string, apparently
    const auction = await Auction.findById(auctionId);
    // If the auction is completed, throw an error. This checks
    // both auction status and the closing time, just in case
    // an auction has reached its end date but is still
    // waiting on the auction-closer daemon. Also, it uses the same
    // date comparison logic as the auction-closer.
    if (auction.auctionStatus == "completed" || auction.closingTime <= Date.now()) {
      res.status(400).send({message: "Auction is completed. No further bids accepted"});
    }
    // Look up the auction owner, throw an error if it's
    // the same user that's trying to submit a bid
    const ownerId = await Item.findById(auction.itemId).ownerId;
    // TODO: SOMETHING IS WRONG HERE
    console.log("ownerId = "+ownerId+" and req user id = "+req.user._id)
    if (ownerId == req.user._id) {
      res.status(400).send({ message: "User cannot bid for their own item" })
    }
    // Create bid and push it to the bids array
    const bid = new Bid({
      userId: req.user._id,
      amount: req.body.amount,
    });
    auction.bids.push(bid);
    try {
      const savedAuction = await auction.save();
      res.send(savedAuction);
    } catch (err) {
      res.status(400).send({ message: err });
    }
  }
);

module.exports = router;
