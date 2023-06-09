const mongoose = require("mongoose");

const feesDetailsSchema = mongoose.Schema(
  {
    user_id: {
      type: Number,
      ref: "User",
      required: true,
    },
    user_name: {
      type: String,
      ref: "User",
      required: true,
    },
    subscription: {
      type: String,
      ref: "User",
      required: true,
    },
    subscription_type: {
      type: String,
      ref: "User",
      required: true,
    },
    cardio: {
      type: String,
      required: true,
    },
    mode_of_payment: {
      type: String,
      ref: "User",
      required: true,
    },
    admin: {
      type: String,
      ref: "Admin",
      required: true,
    },
    transaction_type: {
      type: String,
      enum: ["New User", "Fees Renewal"],
      required: true,
    },
    amount: {
      type: Number,
    },
  },
  { timestamps: true }
);

const FeesDetails = mongoose.model("FeesDetails", feesDetailsSchema);

module.exports = FeesDetails;
