const mongoose = require("mongoose");

const pendingFeesSchema = mongoose.Schema(
  {
    userId: {
      type: Number,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      ref: "User",
      required: true,
    },
    pendingAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    branch: {
      type: String,
      enum: ["branch1", "branch2"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingFees", pendingFeesSchema);
