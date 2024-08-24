const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  instaUrl: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  yearsOfExperience: {
    type: Number,
    required: true,
  },
  specialization: {
    type: String,
  },
  certifications: [{
    type: String,
  }],
  bio: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);