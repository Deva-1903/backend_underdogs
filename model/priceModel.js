const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
});

const Price = mongoose.model("Price", priceSchema);

module.exports = Price;
