const mongoose = require("mongoose");
const debug = require("debug")("news25r:models:cbr");

const schema = new mongoose.Schema({
  chat_id: { type: String, required: true },
  Valutes: {
    type: Array,
    required: true,
    default: [
      "840", // USD
      "978" // EUR
    ]
  }
});

module.exports = mongoose.model("CBR", schema, "cbr");
