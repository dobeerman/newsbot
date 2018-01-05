const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  // Routers
  fetchXML = require("./routes/fetchxml");

// .env
require("dotenv").config();

const mongoose = require("mongoose");
mongoose.Promise = Promise;
mongoose.connect(process.env.MONGODB_URL);

// app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/api/v1/xml", fetchXML);

app.get("/", (req, res) => {
  res.status(404).send("404 – File not found.");
});

app.listen(8000, () => {
  console.log("App listening on port 8000!");
});
