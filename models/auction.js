const mongoose = require("mongoose");
const Joi = require("joi");
const {bidSchema, validateBidSchema} = require("./bid");
const statusOptions = ["open", "completed"];

const auctionSchema = mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
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
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    require: false, 
  },
  bids: [bidSchema],
});

const validateAuction = (auction) => {
  const schema = Joi.object({
    itemId: Joi.string().length(24),
    auctionStatus: Joi.string().valid(...Object.values(statusOptions)),
    closingTime: Joi.date().required(),
    winnerId: Joi.string().length(24),
    bids: Joi.array().items(validateBidSchema)
  });
  return schema.validate(auction);
}

const Auction = mongoose.model("auction", auctionSchema);

module.exports = {
  Auction,
  validateAuction,
};
