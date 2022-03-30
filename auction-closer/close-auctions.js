// Close down auctions after their closing time, and record the winner

const mongoose = require("mongoose");

const { findOverdueAuctions } = require("./models/auction");

console.log("Running auction-closer");

mongoose.connect("mongodb://mongo:27017").catch((err) => {
  console.error(err);
});

async function main() {
  var auctionsToClose;

  try {
    // This operates on the assumption that there is no overlap between
    // post-save hooks on bid submission or on this auction closing action.
    // There are potential failure modes to this, that a more thoroughly
    // worked-out solution would need to address. Specifically, it's
    // possible for two users to submit bids, where one of them 
    auctionsToClose = await findOverdueAuctions();
  } catch (error) {
    console.error("Mongo auctions to close query failed: " + error);
  }

  for (const auction of auctionsToClose) {
    console.log("Closing " + auction._id);
    try {
      // Winner is the first submitted bid at the maximum bid amount
      auction.auctionStatus = "completed";
      await auction.save();
    } catch (error) {
      console.error(error);
    }
  }
}

main();
