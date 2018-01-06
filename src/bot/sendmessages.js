const request = require("request");
const he = require("he");
const watchdog = require("../handlers/watchdog");
const _ = {
  trim: require("lodash/trim")
};

require("dotenv").config();
const production = process.env.NODE_ENV === "production";

const sendMessage = async (messages, chat_id) => {
  const len = messages.length - 1;
  var ok = 0;

  await messages.forEach((o, i) => {
    setTimeout(() => {
      postAsync(o)
        .then(data => {
          var res = JSON.parse(data.body);
          if (!res.ok) {
            watchdog(
              "send message",
              [res.ok, res.error_code, res.description].join("\n")
            );
          }
          ok++;
        })
        .catch(e => watchdog("postAsync", e.message));
    }, i * 3050); // Set delay to 3.05 sec between messages to avoid 429 error. Ref: https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
  });
  return ok;
};

const postAsync = params => {
  const url = `https://api.telegram.org/bot${
    process.env.BOT_TOKEN
  }/sendMessage`;

  Object.assign(params, { url });

  if (!production)
    Object.assign(params.form, { chat_id: `${params.form.chat_id}_dev` });

  return new Promise((resolve, reject) => {
    request.post(params, (err, response, data) => {
      if (err) reject(err);

      resolve(response);
    });
  });
};

module.exports = sendMessage;
