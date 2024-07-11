const mongoose = require("mongoose");

const subscriptionTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    enum: ["branch1", "branch2"],
    required: true,
  },
});

const SubscriptionType = mongoose.model(
  "SubscriptionType",
  subscriptionTypeSchema
);

module.exports = SubscriptionType;
