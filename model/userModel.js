const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
    },
    name: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    healthIssues: {
      type: String,
    },
    emergencyContactNo: {
      type: String,
    },
    height: {
      type: String,
    },
    weight: {
      type: String,
    },
    bloodGroup: {
      type: String,
    },
    address: {
      type: String,
    },
    subscription: {
      type: String,
      required: true,
    },
    subscription_type: {
      type: String,
      required: true,
    },
    cardio: {
      type: String,
      required: true,
    },
    mode_of_payment: {
      type: String,
      required: true,
    },
    joiningDate: {
      type: Date,
    },
    planEnds: {
      type: Date,
    },
    occupation: {
      type: String,
    },
    feesAmount: {
      type: Number,
    },
    registrationFees: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    branch: {
      type: String,
      enum: ["branch1", "branch2"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add a compound index on id and branch fields
userSchema.index({ id: 1, branch: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
