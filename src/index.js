const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  // i18n middleware
  i18next = require("i18next"),
  i18nextMiddleware = require("i18next-express-middleware"),
  Backend = require("i18next-node-fs-backend"),
  // Routers
  fetchXML = require("./routes/fetchxml"),
  fetchWeather = require("./routes/weather"),
  fetchCBR = require("./routes/cbr");

// .env
require("dotenv").config();

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    lng: "ru",
    backend: {
      loadPath: __dirname + "/locales/{{lng}}/{{ns}}.json",
      addPath: __dirname + "/locales/{{lng}}/{{ns}}.missing.json"
    },
    fallbackLng: "ru",
    preload: ["ru"],
    saveMissing: true,
    debug: false
  });

const mongoose = require("mongoose");
mongoose.Promise = Promise;
mongoose.connect(process.env.MONGODB_URL);

// app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(i18nextMiddleware.handle(i18next));
app.use("/api/v1/xml", fetchXML);
app.use("/api/v1/weather", fetchWeather);
app.use("/api/v1/cbr", fetchCBR);

app.get("/", (req, res) => {
  res.status(404).send("404 – File not found.");
});

app.listen(process.env.PORT || 8000, () => {
  console.log(`Listening on port ${process.env.PORT}!`);
});
