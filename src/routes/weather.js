const express = require("express"),
  request = require("request"),
  fetchWeather = express.Router(),
  watchdog = require("../handlers/watchdog"),
  Promise = require("bluebird"),
  xml2js = require("xml2js"),
  https = require("https");

const ForecastMessages = require("../class/ForecastMessages");

const parser = new xml2js.Parser({ explicitArray: false });
const production = process.env.NODE_ENV === "production";

fetchWeather.get("/:point/:chat_id", (req, res) => {
  var { point, chat_id } = req.params;
  var { parse_mode } = req.query;

  parse_mode = parse_mode || "Markdown";

  const url = `https://xml.meteoservice.ru/export/gismeteo/point/${point}.xml`;

  requestHttpAsync(url)
    .then(json => {
      if (json.error) return res.status(400).json({ error: json.error });

      const forecast = new ForecastMessages(json);

      forecast
        .getXML()
        .then(text => sendMessage({ form: { chat_id, text, parse_mode } }))
        .then(data => res.status(200).json(data))
        .catch(error => res.status(400).json({ error: error.message }));
    })
    .catch(error => res.status(400).json({ error: error.message }));
});

const requestHttpAsync = source => {
  return new Promise((resolve, reject) => {
    try {
      https
        .get(source, res => {
          res.on("data", chunk => {
            parser.parseString(chunk, (error, xml) => {
              if (error) reject(error.message);

              resolve(xml);
            });
          });
        })
        .on("error", error => {
          reject(error.message);
        });
    } catch (error) {
      reject(error);
    }
  }).catch(error => {
    return { error };
  });
};

const sendMessage = async params => {
  const url = `https://api.telegram.org/bot${
    process.env.BOT_TOKEN
  }/sendMessage`;

  Object.assign(params, { url });
  if (!production)
    Object.assign(params.form, { chat_id: process.env.DEV_CHAT });

  return await request.post(params, (error, response, data) => {
    if (error) throw error;

    return data;
  });
};

module.exports = fetchWeather;
