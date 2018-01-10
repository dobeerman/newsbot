const express = require("express"),
  fetchXML = express.Router(),
  watchdog = require("../handlers/watchdog"),
  Promise = require("bluebird"),
  xml2js = require("xml2js"),
  iconv = require("iconv-lite"),
  https = require("https"),
  http = require("http"),
  he = require("he"),
  _ = {
    union: require("lodash/union"),
    sortBy: require("lodash/sortBy"),
    trim: require("lodash/trim")
  },
  Html5Entities = require("html-entities").Html5Entities;

const Source = require("../model/source");
const LastUpdate = require("../model/lastupdate");
const sendMessages = require("../bot/sendmessages");

const parser = new xml2js.Parser({ explicitArray: false });

fetchXML.get("/SaveSecretPath", (req, res) => {
  const { chat_id } = req.query;
  const urls = require("../const")(chat_id);

  if (urls.error) return res.status(400).json(urls);

  (async () => {
    try {
      await Object.keys(urls).forEach(key => {
        Source.findOneAndUpdate({ handler: key }, urls[key], {
          upsert: true
        }).catch(error => watchdog("save handler", error.message));
      });
    } catch (e) {
      res.status(400).json({ e });
    }
  })()
    .then(data => res.status(200).json({ ok: true }))
    .catch(error => res.status(400).json({ error: error.message }));
});

fetchXML.get("/getall", (req, res) => {
  const { chat_id } = req.query;

  if (!chat_id) return res.status(400).json({ error: "No chat_id provided." });

  Source.find({ chat_id, onair: true })
    .then(data => {
      const promises = data.map(o => requestHttpAsync(o));

      Promise.all(promises)
        .then(o => o.reduce((pv, cv) => _.union(pv, cv), []))
        .then(reduced => {
          return LastUpdate.findOneAndUpdate(
            { chat_id },
            { count: reduced.length },
            { upsert: true }
          ).then(obj => {
            const date = obj ? new Date(obj.updatedAt) : new Date();
            return reduced.filter(o => new Date(o.pubDate) > date);
          });
        })
        .then(filtered => {
          return _.sortBy(filtered, [o => new Date(o.pubDate)]);
        })
        .then(messages => {
          sendMessages(messages).then(count => res.status(200).json({ count }));
        });
    })
    .catch(error => {
      watchdog("error", error.message);
      res.status(400).json({ error: error.message });
    });
});

fetchXML.get("/one/:handler", (req, res) => {
  const { handler } = req.params;
  const { chat_id } = req.query;

  Source.findOne({ handler, chat_id })
    .then(data => {
      if (data) {
        (async () => {
          try {
            var xml = await requestHttpAsync(data);
            res.status(200).json(xml);
          } catch (error) {
            watchdog("error", error.message);
            res.status(400).json({ error: error.message });
          }
        })();
      } else {
        watchdog(
          "error",
          `Nothing to handle. handler: ${handler}, chat_id: ${chat_id}`
        );
        return res
          .status(400)
          .json({ error: "Nothing to handle.", handler, chat_id });
      }
    })
    .catch(error => {
      watchdog("error", error.message);
      res.status(400).json({ error: error.message });
    });
});

const requestHttpAsync = source => {
  const protocol = source.uri.indexOf("https") > -1 ? https : http;

  return new Promise((resolve, reject) => {
    try {
      protocol.get(source.uri, data => {
        data.pipe(iconv.decodeStream(source.encoding)).collect((err, xml) => {
          if (err) throw new Error(err);

          try {
            parser.parseString(xml, (error, result) => {
              if (error) {
                throw new Error(error);
              }

              if (result.rss.channel.item.length) {
                // Result is array
                resolve(
                  result.rss.channel.item.map(o => makeMessage(o, source))
                );
              } else {
                // Result is a single element
                resolve(makeMessage(result.rss.channel.item, source));
              }
              resolve();
            });
          } catch (error) {
            throw error;
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

const makeMessage = (object, source) => {
  var { title, description, category, link, pubDate } = object;
  var { addlink, handler, chat_id, markup } = source;

  if (typeof category === "object") {
    if (handler === "ytrorossii") category.shift();

    category = category
      .map(cat => cat.replace(/[^A-Za-zА-ЯЁёа-я0-9]/gm, ""))
      .join(" #");
  } else if (category) {
    category = category.replace(/[^A-Za-zА-ЯЁёа-я0-9]/gm, "");
  }

  // Caterory can be empty
  category = category ? `#${category}` : "";

  // Replace the description with another field of xml object
  if (markup && markup.description) {
    // Unescape all HTML entities to readable format
    const entities = new Html5Entities();
    description = entities.decode(object[markup.description]);
  }

  // Some sources has description as an object with lodash property
  if (description["_"]) description = description["_"];

  // Remove all html tags from the description
  description = _.trim(description.replace(/<(?:.|\n)*?>/gm, ""));

  // Cut off the unnecessary end of the string
  if (markup && markup.cut_text) {
    var idx = description.indexOf(markup.cut_text);
    description = idx > -1 ? description.slice(0, idx) : description;
  }

  // enclosure

  // Text constructor
  const textParts = [
    `${title}`,
    `${he.decode(description)}`,
    `${category} #${handler}`
  ];

  if (addlink) textParts.push(link);

  // Make the text string
  const text = textParts.join(`\n\n`);

  var params = { form: { chat_id, text, parse_mode: "HTML" }, pubDate };

  if (markup && markup.message_options) {
    Object.assign(params.form, markup.message_options);
  }

  return params;
};

module.exports = fetchXML;
