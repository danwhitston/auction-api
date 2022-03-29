const { Auction } = require("../models/auction");
const express = require("express");
const router = express.Router();
const authMiddleWare = require("../middleware/authorise");

// Auctions are created by the /items POST route

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

module.exports = router;
