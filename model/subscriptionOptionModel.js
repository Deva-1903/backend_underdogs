const mongoose = require("mongoose");

const subscriptionOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const SubscriptionOption = mongoose.model(
  "SubscriptionOption",
  subscriptionOptionSchema
);

module.exports = SubscriptionOption;
