const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
    branch: {
      type: String,
      enum: ["branch1", "branch2"],
      required: true,
    },
  },
});

const Price = mongoose.model("Price", priceSchema);

module.exports = Price;
