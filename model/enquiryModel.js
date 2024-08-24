const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contactDetails: {
    type: String,
    required: true,
  },
  enquiryDate: {
    type: Date,
    required: true,
  },
  notes: String,
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open',
  },
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);