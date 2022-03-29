const mongoose = require("mongoose");
const Joi = require("joi");

const bidSchema = mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    immutable: true,
  },
  amount: {
    type: Number,
    require: true,
    min: [0, "Bid cannot be less than 0"],
    max: [100000000, "Bid cannot be greater than 100000000"],
    immutable: true,
  },
});

const validateBidSchema = Joi.object({
  createdAt: Joi.date().default(Date.now()),
  userId: Joi.string().length(24),
  amount: Joi.number().min(0).max(100000000),
});

const validateBid = (bid) => {
  return validateBidSchema.validate(bid);
};

const Bid = mongoose.model("bid", bidSchema);

module.exports = {
  bidSchema,
  validateBidSchema,
  validateBid,
  Bid,
};
