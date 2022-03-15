const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = 3000;

app.use(express.json()); // Instead of bodyparser

const rootRoute = require("./routes/root");
const auctionsRoute = require("./routes/auctions");

app.use("/", rootRoute);
app.use("/auctions", auctionsRoute);

mongoose.connect("mongodb://mongo:27017").catch((err) => {
  console.log(err);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  console.log(`MongoDB connection status is ${mongoose.connection.readyState}`)
});
