const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNo: {
      type: String,
      required: true,
      trim: true,
    },
    alternateContactNo: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    collegeName: {
      type: String,
      default: '',
      trim: true,
    },
    degree: {
      type: String,
      default: 'B.Tech / BE (Computer / IT)',
      trim: true,
    },
    semester: {
      type: String,
      default: '6th Semester',
      trim: true,
    },
    interestedDomain: {
      type: String,
      default: 'Full Stack Web Development (MERN)',
      trim: true,
    },
    city: {
      type: String,
      default: 'Surat',
      trim: true,
    },
    preferredBatch: {
      type: String,
      default: 'Morning (9:00 AM - 1:00 PM)',
      trim: true,
    },
    duration: {
      type: String,
      default: '6 Months (Full Live Project Internship)',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: 'Google Form',
      trim: true,
    },
    status: {
      type: String,
      enum: ['New Lead', 'Converted to Inquiry', 'Rejected'],
      default: 'New Lead',
    },
    isConvertedToInquiry: {
      type: Boolean,
      default: false,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
    },
    assignedTo: {
      type: String,
      default: '',
      trim: true,
    },
    convertedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
