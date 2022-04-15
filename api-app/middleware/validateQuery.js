// Based on Stong and devChedar (2020)
module.exports = (validator) => {
  return (req, res, next) => {
    const { error } = validator(req.query);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }
    next();
  };
};
