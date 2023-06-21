const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true,

    unique: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
