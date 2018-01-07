const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  // i18n middleware
  i18n = require("i18n"),
  // Routers
  fetchXML = require("./routes/fetchxml"),
  fetchWeather = require("./routes/weather");

// .env
require("dotenv").config();

i18n.configure({
  locales: ["ru"],
  directory: __dirname + "/locales",
  api: {
    __: "t", //now req.__ becomes req.t
    __n: "tn" //and req.__n can be called as req.tn
  }
});

const mongoose = require("mongoose");
mongoose.Promise = Promise;
mongoose.connect(process.env.MONGODB_URL);

// app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(i18n.init);
app.use("/api/v1/xml", fetchXML);
app.use("/api/v1/weather", fetchWeather);

app.get("/", (req, res) => {
  res.status(404).send("404 – File not found.");
});

app.listen(process.env.PORT || 8000, () => {
  console.log(`Listening on port ${process.env.PORT}!`);
});
