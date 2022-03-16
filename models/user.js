const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const SALT_WORK_FACTOR = 10;

const userSchema = mongoose.Schema({
  username: {
    type: String,
    require: true,
    unique: true,
    min: [3, "Username must be at least 3 letters long"],
    max: [256, "Username must be at most 256 letters long"],
  },
  email: {
    type: String,
    require: true,
    unique: true,
    lowercase: true, // automatically lowercases before saving!
    min: 3,
    max: 256,
  },
  password: {
    type: String,
    require: true,
    min: 8,
    max: 1024,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// We deliberately keep logic and validation inside the model where we want to
// enforce it on all code that accesses the model

// Pre-save hook is used for processes that must be carried out on valid
// inputs prior to saving, i.e. hashing and salting the password
// Based on: https://www.mongodb.com/blog/post/password-authentication-with-mongoose-part-1
userSchema.pre("save", function (next) {
  const user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Validation function uses Joi to assess validity of data prior to attempting
// commit, e.g. saving of a document
// Based on https://gist.github.com/stongo/6359042?permalink_comment_id=3476052#gistcomment-3476052
const validateUser = (user) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(256).required(),
    email: Joi.string().email().min(3).max(256).required(),
    password: Joi.string().min(8).max(1024).required(),
  });
  return schema.validate(user);
};

const User = mongoose.model("user", userSchema);

module.exports = {
  User,
  validateUser,
};
