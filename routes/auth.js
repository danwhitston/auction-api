const { User, validateUser } = require("../models/user");
const validateMiddleWare = require("../middleware/validate");
const router = require("./auctions");

router.post(
  "/register",
  [validateMiddleWare(validateUser)],
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

router.post("/login", async (req, res) => {
  // TODO: write login route
});

module.exports = router;
