// Based on https://gist.github.com/stongo/6359042?permalink_comment_id=3476052#gistcomment-3476052
module.exports = (validator) => {
  return (req, res, next) => {
    const { error } = validator(req.body);
    // Write validation error to console for development purposes
    // TODO: Remove console.log once development progresses
    console.log("error: ", error);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }
    next();
  };
};
