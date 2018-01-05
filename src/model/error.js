const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    tag: { type: String, required: true, index: true },
    error: { type: String, required: true }
  },
  { timestamps: true }
);

// schema.methods.done = function(ctx) {
//   debug("Order model:done", this);
//   return HTML_mail_order(ctx, this._id);
// };

module.exports = mongoose.model("Errors", schema, "errors");
