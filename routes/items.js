const { Item, validateItem } = require("../models/item");
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
    // console.log(item);
    try {
      const savedItem = await item.save();
      res.send(savedItem);
    } catch (err) {
      res.status(400).send({ message: err });
    }
  }
);

module.exports = router;
