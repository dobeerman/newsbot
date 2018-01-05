const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    count: Number,
    lastUpdate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// schema.methods.done = function(ctx) {
//   debug("Order model:done", this);
//   return HTML_mail_order(ctx, this._id);
// };

module.exports = mongoose.model("LastUpdate", schema, "updated");
