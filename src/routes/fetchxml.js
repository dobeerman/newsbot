const express = require("express"),
  fetchXML = express.Router(),
  watchdog = require("../handlers/watchdog"),
  Promise = require("bluebird"),
  xml2js = require("xml2js"),
  iconv = require("iconv-lite"),
  https = require("https"),
  http = require("http"),
  _ = {
    union: require("lodash/union")
  };

const Source = require("../model/source");
const LastUpdate = require("../model/lastupdate");
const sendMessages = require("../bot/sendmessages");
const Markup = require("../class/Markup");

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

  if (!chat_id) return res.status(400).json({ error: "No Chat ID provided." });

  Source.find({ chat_id, onair: true })
    .then(sources => {
      const promises = sources.map(o =>
        requestPromise(o).catch(error => console.log("requestPromise", error))
      );

      Promise.all(promises)
        .then(o => o.reduce((pv, cv) => cv && _.union(pv, cv.messages), []))
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
    .then(opts => {
      if (!opts) throw new Error("Nothing to handle.");

      (async () => {
        try {
          await requestPromise(opts)
            .then(result => {
              const messages = Markup.messages(result.rss.channel.item, opts);

              sendMessages([messages.messages[0]]).then(() =>
                res.status(200).json(messages)
              );
            })
            .catch(error => {
              throw error;
            });
        } catch (error) {
          console.log(error);
          res.status(400).json({ error: error.message });
        }
      })();
    })
    .catch(error => {
      console.log(error);
      res.status(400).json({ error: error.message });
    });
});

const requestPromise = source =>
  new Promise((resolve, reject) => {
    const protocol = source.uri.indexOf("https") > -1 ? https : http;
    try {
      protocol.get(source.uri, data => {
        data.pipe(iconv.decodeStream(source.encoding)).collect((err, xml) => {
          if (err) throw err;

          try {
            parser.parseString(xml, (error, result) => {
              if (error) throw error;

              if (result.html) return reject();

              if (!Array.isArray(result.rss.channel.item))
                result.rss.channel.item = [result.rss.channel.item];

              resolve(Markup.messages(result.rss.channel.item, source));
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

const _has = (from, selector) =>
  selector.split(".").reduce((prev, cur) => prev && prev[cur], from);

module.exports = fetchXML;
