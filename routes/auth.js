const {
  User,
  validateUserWrite,
  validateUserLogin,
} = require("../models/user");
const validateMiddleWare = require("../middleware/validate");
const router = require("./auctions");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");

router.post(
  "/register",
  [validateMiddleWare(validateUserWrite)],
  async (req, res) => {
    // Extract new user details to an object for passing to mongoose
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    });

    try {
      const savedUser = await user.save();
      res.send(savedUser);
    } catch (err) {
      // This can result in user-unfriendly error messages, but is fine
      // for development and testing purposes
      res.status(400).send({ message: err });
    }
  }
);

router.post(
  "/login",
  [validateMiddleWare(validateUserLogin)],
  async (req, res) => {
    // TODO: test login route for query injection vulnerability
    // Check user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).send({ message: "User does not exist" });
    }

    // Check user password
    const passwordValidation = bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!passwordValidation) {
      return res.status(400).send({ message: "Password is wrong" });
    }

    // Generate auth-token - USES jsonwebtoken AND dotenv!!!
    const token = jsonwebtoken.sign(
      { _id: user._id },
      process.env.TOKEN_SECRET
    );
    res.header("auth-token", token).send({ "auth-token": token });
  }
);

module.exports = router;
