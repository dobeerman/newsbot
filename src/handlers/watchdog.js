const mongoose = require("mongoose");
const Errors = require("../model/error");

const watchdog = (tag = "all", message) => {
  Errors.create({ tag, message });
};

module.exports = watchdog;
