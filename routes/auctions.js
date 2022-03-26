const { Auction, validateAuction } = require("../models/auction");
const { Bid, validateBid } = require("../models/bid");
const express = require("express");
const router = express.Router();
const validateMiddleWare = require("../middleware/validate");
const authMiddleWare = require("../middleware/authorise");

router.get("/", [authMiddleWare()], async (req, res) => {
  try {
    const auctions = await Auction.find();
    res.send(auctions);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.get("/:id", [authMiddleWare()], async (req, res) => {
  const auctionId = req.params.id; // Guaranteed to be string, apparently
  try {
    const auction = await Auction.findById(auctionId);
    res.send(auction);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.post("/:id/bids", [authMiddleWare(), validateMiddleWare(validateBid)], async (req, res) => {
  const auctionId = req.params.id; // guaranteed to be string, apparently
  // Need to account for logic around closingTime and auctionStatus
  // and winnerId. Future development: withdraw bids.
  const auction = await Auction.findById(auctionId);
  const bid = new Bid({
    userId: req.user._id,
    amount: req.body.amount,
  });
  // It's unclear whether the mongoose .push method is safe from save
  // conflicts. Looks like mongoose converts to a push action in mongo
  // so *should* be okay?
  auction.bids.push(bid);
  try {
    const savedAuction = await auction.save();
    res.send(savedAuction);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

module.exports = router;
