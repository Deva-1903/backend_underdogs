const mongoose = require("mongoose");

const brochureSchema = new mongoose.Schema({
  photoURL: {
    type: String,
    required: true,
  },
});

const Brochure = mongoose.model("Brochure", brochureSchema);

module.exports = Brochure;
