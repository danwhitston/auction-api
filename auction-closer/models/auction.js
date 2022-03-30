const mongoose = require("mongoose");
const { bidSchema } = require("./bid");
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
    require: false,
  },
  winnerAmount: {
    type: Number,
    require: false,
    min: [0, "Bid cannot be less than 0"],
    max: [100000000, "Bid cannot be greater than 100000000"],
  },
  bids: [bidSchema],
});

const findOverdueAuctions = () => {
  return Auction.find({auctionStatus: "open", closingTime:{$lte: new Date()}}).exec();
};

auctionSchema.methods.winningBid = () => {
  return this.bids.sort({ amount: -1, createdAt: 1 }).limit(1).exec();
};

const Auction = mongoose.model("auction", auctionSchema);

module.exports = {
  Auction,
  findOverdueAuctions,
};
