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
  branch: {
    type: String,
    enum: ["branch1", "branch2"],
    required: true,
  },
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
