const i18next = require("i18next"),
  format = require("date-fns/format"),
  locale_RU = require("date-fns/locale/ru");

function ForecastMessages(xml) {
  if (!(this._xml = this._has(xml, "MMWEATHER.REPORT.TOWN")))
    throw new Error("Object has no valid property.");

  this._xml = {
    town: this._xml["$"],
    forecast: this._xml.FORECAST
  };

  this.city = decodeURI(this._xml.town.sname);

  this.getXML = async function() {
    try {
      const messages = await this._xml.forecast.map((el, idx) => {
        var message = {
          period: this.getProperty("PERIOD", idx),
          phenomena: this.getProperty("PHENOMENA", idx),
          temperature: this.getProperty("TEMPERATURE", idx),
          pressure: this.getProperty("PRESSURE", idx),
          relwet: this.getProperty("RELWET", idx),
          wind: this.getProperty("WIND", idx),
          heat: this.getProperty("HEAT", idx)
        };

        return i18next.t("ForecastMessage", message);
      });

      await messages.unshift(i18next.t("city", { city: this.city }));

      return messages.join("\n\n");
    } catch (error) {
      throw error;
    }
  };
}

ForecastMessages.prototype.getProperty = function(property, idx, options = {}) {
  switch (property) {
    case "PERIOD":
      const { day, month, year, hour } = this._xml.forecast[idx]["$"];

      return format(new Date(year, month - 1, day, hour), "dd, D MMM HH:mm", {
        locale: locale_RU
      });
    case "WIND":
    case "PRESSURE":
    case "TEMPERATURE":
    case "RELWET":
    case "HEAT":
      Object.assign(options, this._xml.forecast[idx][property]["$"]);
      break;
    case "PHENOMENA":
      for (key in this._xml.forecast[idx].PHENOMENA["$"]) {
        Object.assign(options, {
          [key]: i18next.t(
            key + "_" + this._xml.forecast[idx].PHENOMENA["$"][key]
          )
        });
      }
      break;
  }

  return i18next.t(property.toLowerCase(), options);
};

ForecastMessages.prototype._has = (from, selector) =>
  selector.split(".").reduce((prev, cur) => prev && prev[cur], from);

module.exports = ForecastMessages;
