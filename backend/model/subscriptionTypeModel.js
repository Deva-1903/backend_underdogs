const mongoose = require("mongoose");

const subscriptionTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const SubscriptionType = mongoose.model(
  "SubscriptionType",
  subscriptionTypeSchema
);

module.exports = SubscriptionType;
