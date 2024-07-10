const mongoose = require("mongoose");

const subscriptionOptionSchema = new mongoose.Schema({
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

const SubscriptionOption = mongoose.model(
  "SubscriptionOption",
  subscriptionOptionSchema
);

module.exports = SubscriptionOption;
