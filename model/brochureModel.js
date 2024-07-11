const mongoose = require("mongoose");

const brochureSchema = new mongoose.Schema({
  photoURL: {
    type: String,
    required: true,
  },  
  branch: {
    type: String,
    enum: ["branch1", "branch2"],
    required: true,
  },
});

const Brochure = mongoose.model("Brochure", brochureSchema);

module.exports = Brochure;
