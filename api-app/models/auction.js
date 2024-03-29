const mongoose = require("mongoose");
const Joi = require("joi");
const { bidSchema, validateBidSchema } = require("./bid");
const statusOptions = ["open", "completed"];

const auctionSchema = mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    immutable: true,
  },
  auctionStatus: {
    type: String,
    enum: statusOptions,
    require: true,
    default: "open",
  },
  closingTime: {
    type: Date,
    require: true,
    immutable: true,
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  winnerAmount: {
    type: Number,
    default: 0,
    min: [0, "Bid cannot be less than 0"],
    max: [100000000, "Bid cannot be greater than 100000000"],
  },
  bids: [bidSchema],
});

const validateAuction = (auction) => {
  const schema = Joi.object({
    itemId: Joi.string().length(24),
    auctionStatus: Joi.string().valid(...Object.values(statusOptions)),
    closingTime: Joi.date().required(),
    winnerId: Joi.string().length(24),
    winnerAmount: Joi.number().min(0).max(100000000),
    bids: Joi.array().items(validateBidSchema),
  });
  return schema.validate(auction);
};

const validateAuctionQuery = (auction) => {
  // We don't have status of all as that's the default if the key is absent
  const schema = Joi.object({
    status: Joi.string().valid("open", "completed"),
  })
  return schema.validate(auction);
}

const Auction = mongoose.model("auction", auctionSchema);

module.exports = {
  Auction,
  validateAuction,
  validateAuctionQuery,
};
