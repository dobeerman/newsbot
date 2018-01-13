const mongoose = require("mongoose");
const debug = require("debug")("news25r:models:source");

const schema = new mongoose.Schema({
  handler: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
    unique: true
  },
  uri: { type: String, required: true },
  encoding: { type: String, required: true, default: "utf8" },
  addlink: { type: Boolean, required: true, default: true },
  chat_id: { type: String, required: true },
  onair: { type: Boolean, required: true, default: true },
  markup: {
    type: Object,
    required: true,
    default: {
      description: "description",
      message_options: {
        parse_mode: "HTML",
        disable_web_page_preview: false
      }
    }
  }
});

// schema.methods.done = function(ctx) {
//   debug("Order model:done", this);
//   return HTML_mail_order(ctx, this._id);
// };

module.exports = mongoose.model("Source", schema, "sources");
