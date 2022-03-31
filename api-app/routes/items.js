const { Item, validateItem } = require("../models/item");
const { Auction } = require("../models/auction");
const { Bid } = require("../models/bid");
const express = require("express");
const router = express.Router();
const validateBody = require("../middleware/validateBody");
const authMiddleWare = require("../middleware/authorise");

router.get("/", [authMiddleWare()], async (req, res) => {
  try {
    const items = await Item.find();
    res.send(items);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.get("/:itemId", [authMiddleWare()], async (req, res) => {
  const itemId = req.params.itemId; // Guaranteed to be string, apparently
  try {
    const item = await Item.findById(itemId);
    res.send(item);
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.post(
  "/",
  [authMiddleWare(), validateBody(validateItem)],
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
      bids: [
        new Bid({
          userId: req.user._id,
          amount: 0,
        })
      ]
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
