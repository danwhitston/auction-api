const { Item, validateItem } = require("../models/item");
const { Auction } = require("../models/auction");
const express = require("express");
const router = express.Router();
const validateMiddleWare = require("../middleware/validate");
const authMiddleWare = require("../middleware/authorise");

router.get("/", [authMiddleWare()], async (req, res) => {
  try {
    const items = await Item.find();
    res.send(items);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.post(
  "/",
  [authMiddleWare(), validateMiddleWare(validateItem)],
  async (req, res) => {
    const item = new Item({
      title: req.body.title,
      condition: req.body.condition,
      description: req.body.description,
      userId: req.user._id,
    });
    // Ideally we would not put Auction code in an Item route, but they are
    // fundamentally the same object and have to be created together.
    const auction = new Auction({
      itemId: item._id,
      auctionStatus: "open",
      winnerId: req.user._id, // By default, the item owner wins on no-bid
      winnerAmount: 0,
      closingTime: req.body.closingTime,
    });
    item.auctionId = auction._id;
    try {
      // These are two separate transactions. Thus, it's possible to correctly
      // save the item and then fail on saving the auction, resulting in a
      // broken state in Mongo. Avoiding this is possible but would take
      // extra work.
      const savedItem = await item.save();
      const savedAuction = await auction.save();
      res.send({ item: savedItem, auction: savedAuction });
    } catch (err) {
      res.status(400).send({ message: err });
    }
  }
);

module.exports = router;
