const { Auction } = require("../models/auction");
const { Bid, validateBid } = require("../models/bid");
const express = require("express");
const router = express.Router({ mergeParams: true });
const validateMiddleWare = require("../middleware/validate");
const authMiddleWare = require("../middleware/authorise");

router.post(
  "/",
  [authMiddleWare(), validateMiddleWare(validateBid)],
  async (req, res) => {
    const auctionId = req.params.id; // guaranteed to be string, apparently
    // Need to account for logic around closingTime and auctionStatus
    // and winnerId.
    const auction = await Auction.findById(auctionId);
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
