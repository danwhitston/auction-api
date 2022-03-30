const mongoose = require("mongoose");

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

module.exports = {
  bidSchema,
};
