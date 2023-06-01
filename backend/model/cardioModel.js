const mongoose = require("mongoose");

const cardioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const Cardio = mongoose.model("Cardio", cardioSchema);

module.exports = Cardio;
