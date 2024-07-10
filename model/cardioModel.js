const mongoose = require("mongoose");

const cardioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  branch: {
    type: String,
    enum: ["branch1", "branch2"],
    required: true,
  },
});

const Cardio = mongoose.model("Cardio", cardioSchema);

module.exports = Cardio;
