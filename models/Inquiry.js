const mongoose = require('mongoose');

const followupSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Interested',
        'Callback Requested',
        'Cold/No Response',
        'Visited Campus',
        'Ready for Admission',
        'Not Interested',
        'Other'
      ],
      default: 'Interested',
    },
    remarks: {
      type: String,
      required: true,
      trim: true,
    },
    nextFollowupDate: {
      type: Date,
    },
    recordedBy: {
      type: String,
      enum: ['Haresh Sir', 'Mishal Sir', 'Jaydip Sir', 'Sanjana', 'Admin', 'Other'],
      default: 'Haresh Sir',
    },
  },
  { timestamps: true }
);

const inquirySchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    contactNo: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    alternateContactNo: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    collegeName: {
      type: String,
      trim: true,
      default: '',
    },
    degree: {
      type: String,
      trim: true,
      default: 'B.Tech/BE',
    },
    semester: {
      type: String,
      trim: true,
      default: '',
    },
    interestedDomain: {
      type: String,
      required: [true, 'Interested domain/technology is required'],
      trim: true,
    },
    reference: {
      type: String,
      default: 'Walk-in',
      trim: true,
    },
    referenceDetails: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['New', 'Interested', 'Follow-up', 'Converted to Admission', 'Not Interested', 'Cancelled'],
      default: 'New',
    },
    inquiryDate: {
      type: Date,
      default: Date.now,
    },
    takenBy: {
      type: String,
      enum: ['Haresh Sir', 'Mishal Sir', 'Jaydip Sir', 'Other'],
      default: 'Haresh Sir',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    followups: [followupSchema],
    isConverted: {
      type: Boolean,
      default: false,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
