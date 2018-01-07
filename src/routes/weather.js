const express = require("express"),
  fetchWeather = express.Router(),
  watchdog = require("../handlers/watchdog"),
  Promise = require("bluebird"),
  xml2js = require("xml2js"),
  format = require("date-fns/format"),
  ruLocale = require("date-fns/locale/ru"),
  https = require("https");

const parser = new xml2js.Parser({ explicitArray: false });

fetchWeather.get("/:point", (req, res) => {
  const { point } = req.params;
  const url = `https://xml.meteoservice.ru/export/gismeteo/point/${point}.xml`;

  requestHttpAsync(url).then(xml => {
    const report = xml.MMWEATHER.REPORT.TOWN;
    var { $: { sname: city }, FORECAST } = report;
    city = decodeURI(city);

    // const messageMaker = async (city, FORECAST) => {

    /*
    <FORECAST day="07" month="01" year="2018" hour="21" tod="3" predict="0" weekday="1">
    <PHENOMENA cloudiness="2" precipitation="10" rpower="0" spower="0"/>
    <PRESSURE max="764" min="764"/>
    <TEMPERATURE max="-9" min="-11"/>
    <WIND min="5" max="5" direction="5"/>
    <RELWET max="92" min="71"/>
    <HEAT min="-18" max="-18"/>
    </FORECAST>
  */
    const messages = FORECAST.map(o => {
      var tod = res.tn("forecast", o["$"].tod * 1);
      var weekday = res.tn("weekday", o["$"].weekday * 1);
      var date = format(
        new Date(o["$"].year * 1, o["$"].month - 1, o["$"].day * 1),
        "D MMMM",
        { locale: ruLocale }
      );

      var message = [`${city}. ${tod}`, `${date}. ${weekday}.`];
      return message.join("\n");
    });
    // };
    // messageMaker(city, FORECAST).then(messages =>
    res.status(200).json({ messages });
    // );

    // .json({ message: res.__("Hello, {{city}}", { city: decodeURI(city) }) });
  });
});

const requestHttpAsync = source => {
  return new Promise((resolve, reject) => {
    try {
      https
        .get(source, res => {
          res.on("data", chunk => {
            parser.parseString(chunk, (error, xml) => {
              if (error) throw error;
              resolve(xml);
            });
          });
        })
        .on("error", error => {
          throw new Error("Got error: " + error.message);
        });
    } catch (error) {
      reject(error);
    }
  });
};

const makeMessage = xml => {
  // decodeURI(city)
};

module.exports = fetchWeather;
