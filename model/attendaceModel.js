const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
  },
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
  session: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  planEnds: {
    ref: "User",
    type: Date,
  },
  status: {
    ref: "User",
    type: String,
  },
  photoURL: {
    type: String,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "200d",
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
