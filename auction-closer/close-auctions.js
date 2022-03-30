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
    auctionsToClose = await findOverdueAuctions();
  } catch (error) {
    console.error("Mongo auctions to close query failed: " + error);
  }

  for (const auction of auctionsToClose) {
    console.log("Closing " + auction._id);
    try {
      // Winner is the first submitted bid at the maximum bid amount
      auction.auctionStatus = "closed";
      const winningBid = await auction.winningBid();
      auction.winnerId = winningBid.userId;
      auction.winnerAmount = winningBid.amount;
      await auction.save();
    } catch (error) {
      console.error(error);
    }
  }
}

main();
