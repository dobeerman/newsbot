const i18next = require("i18next"),
  format = require("date-fns/format"),
  locale = require("date-fns/locale/ru");

function CbrMessages(valutes, date) {
  this.valutes = valutes;
  this.date = date;

  this.getXML = async function() {
    try {
      const messages = await this.valutes.map(el =>
        i18next.t("CBRMessage", el)
      );

      await messages.unshift("");
      await messages.unshift(
        i18next.t("CBRdate", {
          date: format(this.date, "D MMMM", { locale }),
          interpolation: { escapeValue: false }
        })
      );

      return messages.join("\n");
    } catch (error) {
      throw error;
    }
  };
}

module.exports = CbrMessages;
