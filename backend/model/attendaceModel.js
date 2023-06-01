const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
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
  timeIn: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  subscription: {
    ref: "User",
    type: String,
    required: true,
  },
  subscription_type: {
    ref: "User",
    type: String,
    required: true,
  },
  planEnds: {
    ref: "User",
    type: String,
  },
  status: {
    ref: "User",
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "90d",
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
