const express = require("express"),
  request = require("request"),
  fetchCBR = express.Router(),
  Promise = require("bluebird"),
  xml2js = require("xml2js"),
  iconv = require("iconv-lite"),
  http = require("http"),
  format = require("date-fns/format");

const CbrMessages = require("../class/CbrMessages");
const CBR = require("../model/cbr");

const parser = new xml2js.Parser({ explicitArray: false });
const production = process.env.NODE_ENV === "production";

fetchCBR.get("/:chat_id", (req, res) => {
  var { chat_id } = req.params;
  var { parse_mode } = req.query;

  parse_mode = parse_mode || "Markdown";

  const now = new Date();

  const url = `http://www.cbr.ru/scripts/XML_daily.asp?date_req=${format(
    now,
    "DD/MM/YYYY"
  )}`;

  requestHttpAsync(url)
    .then(json => {
      if (json.error) return res.status(400).json({ error: json.error });

      CBR.findOneAndUpdate(
        { chat_id },
        { chat_id },
        { upsert: true, new: true }
      )
        .then(
          doc =>
            new CbrMessages(
              json.ValCurs.Valute.filter(
                el => doc.Valutes.indexOf(el.NumCode) > -1
              ),
              now
            )
        )
        .then(cbr => cbr.getXML())
        .then(text => sendMessage({ form: { chat_id, text, parse_mode } }))
        .then(data => res.status(200).json({ data }))
        .catch(error => res.status(400).json({ error: error.message }));
    })
    .catch(error => res.status(400).json({ error: error.message }));
});

const requestHttpAsync = url => {
  return new Promise((resolve, reject) => {
    try {
      http.get(url, data => {
        data.pipe(iconv.decodeStream("win1251")).collect((err, xml) => {
          if (err) throw new Error(err);

          try {
            parser.parseString(xml, (error, result) => {
              if (error) throw new Error(error);
              resolve(result);
            });
          } catch (error) {
            throw error;
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  }).catch(error => {
    return error;
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

module.exports = fetchCBR;
