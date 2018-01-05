const express = require("express"),
  fetchXML = express.Router(),
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
  };

const mongoose = require("mongoose");
const Source = require("../model/source");
const LastUpdate = require("../model/lastupdate");
const Errors = require("../model/error");

const sendMessages = require("../bot/sendmessages");

const parser = new xml2js.Parser({ explicitArray: false });

fetchXML.get("/SaveSecretPath", (req, res) => {
  const urls = require("../const/urls");

  (async () => {
    try {
      await Object.keys(urls).forEach(key => {
        Source.findOneAndUpdate({ handler: key }, urls[key], {
          upsert: true
        }).catch(error => Errors.create({ tag: "save handler", error }));
      });
    } catch (e) {
      res.status(400).json({ e });
    }
  })()
    .then(data => res.status(200).json({ ok: true }))
    .catch(error => res.status(400).json({ error }));
});

fetchXML.get("/getall", (req, res) => {
  Source.find({ onair: true })
    .then(data => {
      const promises = data.map(o => requestHttpAsync(o));

      Promise.all(promises)
        .then(o => o.reduce((pv, cv) => _.union(pv, cv), []))
        .then(reduced => {
          return LastUpdate.findOneAndUpdate(
            { uid: "date" },
            { count: reduced.length }
          ).then(obj => {
            const date = new Date(obj.updatedAt);
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
    .catch(error => res.status(400).json({ error }));
});

fetchXML.get("/one/:handler", (req, res) => {
  const handler = req.url.replace("/one/", "");

  Source.findOne({ handler })
    .then(data => {
      if (data) {
        (async () => {
          try {
            var xml = await requestHttpAsync(data);

            // parser.parseString(xml, (err, result) => {
            // if (err) throw new Error(err);

            res.status(200).json(xml);
            // });
          } catch (error) {
            Errors.create({ tag: handler, error });

            res.status(400).json({ error });
          }
        })();
      } else {
        return res.status(400).json({ error: "Nothing to handle." });
      }
    })
    .catch(error => res.status(400).json({ error }));
});

const requestHttpAsync = source => {
  const protocol = source.uri.indexOf("https") > -1 ? https : http;

  return new Promise((resolve, reject) => {
    try {
      protocol.get(source.uri, data => {
        // console.log(data);
        data.pipe(iconv.decodeStream(source.encoding)).collect((err, xml) => {
          if (err) throw new Error(err);

          try {
            parser.parseString(xml, (err, result) => {
              if (err) throw new Error(err);

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
            Errors.create({ tag: source.handler, error });
            throw error;
          }
        });
      });
    } catch (error) {
      Errors.create({ tag: source.handler, error });
      throw error;
    }
  });
};

const makeMessage = (object, source) => {
  var { title, description, category, link, pubDate } = object;
  var { addlink, handler, chat_id } = source;

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

  // Remove all html tags from description
  description = _.trim(description.replace(/[\s]<\/?[^>]+(>|$)/gi, ""));

  // Text constructor
  const textParts = [
    `${title}`,
    `${he.decode(description.replace(/<(?:.|\n)*?>/gm, ""))}`,
    `${category} #${handler}`
  ];

  if (addlink) textParts.push(link);

  // Make the text string
  const text = textParts.join(`\n\n`);

  return { form: { chat_id, text, parse_mode: "HTML" }, pubDate };
};

module.exports = fetchXML;
