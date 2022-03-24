const mongoose = require("mongoose");
const Joi = require("joi");
const conditionOptions = ["new", "used"];

const itemSchema = mongoose.Schema({
  title: {
    type: String,
    require: true,
    max: [
      256,
      "Title length is max 256 characters. Use the description for item details",
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  condition: {
    type: String,
    enum: conditionOptions,
    require: true,
  },
  description: {
    type: String,
    max: [32768, "Description length is max 32768 characters"],
  },
  // auctionId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   require: true,
  //   default: ???
  // },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
  },
});

const validateItem = (item) => {
  const schema = Joi.object({
    title: Joi.string().max(256).required(),
    condition: Joi.string()
      .valid(...Object.values(conditionOptions))
      .required(),
    description: Joi.string().max(32768).required(),
  });
  return schema.validate(item);
};

const Item = mongoose.model("item", itemSchema);

module.exports = {
  Item,
  validateItem,
};
