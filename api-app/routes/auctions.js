const { Auction, validateAuctionQuery } = require("../models/auction");
const express = require("express");
const router = express.Router();
const authMiddleWare = require("../middleware/authorise");
const validateQuery = require("../middleware/validateQuery");

// Auctions are created by the /items POST route

router.get("/", [authMiddleWare(), validateQuery(validateAuctionQuery)], async (req, res) => {
  try {
    var auctions;
    if (req.query.status) {
      auctions = await Auction.find({auctionStatus: req.query.status});
    } else {
      auctions = await Auction.find();
    }
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

module.exports = router;
