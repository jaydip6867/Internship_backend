const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
    },
    registrationNo: {
      type: String,
      unique: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactNo: {
      type: String,
      required: true,
      trim: true,
    },
    collegeName: {
      type: String,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      enum: ['Creative Web Infotech', 'Granthi It Solution'],
      default: 'Creative Web Infotech',
      trim: true,
    },
    duration: {
      type: String,
      default: '6 Months',
      trim: true,
    },
    batchTime: {
      type: String,
      default: 'Morning',
      trim: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    totalFees: {
      type: Number,
      required: true,
      min: 0,
    },
    paidFees: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingFees: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI / GPay / PhonePe', 'Bank Transfer', 'Cheque', 'Other'],
      default: 'UPI / GPay / PhonePe',
    },
    paymentReference: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Cancelled'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

admissionSchema.pre('save', function (next) {
  this.remainingFees = Math.max(0, (this.totalFees || 0) - (this.paidFees || 0));
  next();
});

module.exports = mongoose.model('Admission', admissionSchema);
