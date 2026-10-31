const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const Inquiry = require('../models/Inquiry');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/admissions
// @desc    Get all admissions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, domain, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { registrationNo: { $regex: search, $options: 'i' } },
        { contactNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } },
      ];
    }

    if (domain && domain !== 'All') {
      query.domain = domain;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const admissions = await Admission.find(query)
      .populate('inquiryId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: admissions.length,
      admissions,
    });
  } catch (error) {
    console.error('Fetch admissions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admissions' });
  }
});

// @route   GET /api/admissions/:id
// @desc    Get single admission details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).populate('inquiryId');
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }
    return res.json({ success: true, admission });
  } catch (error) {
    console.error('Fetch admission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admission' });
  }
});

// @route   PUT /api/admissions/:id
// @desc    Update admission details (e.g. fees update, status)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      paidFees,
      totalFees,
      duration,
      batchTime,
      joiningDate,
      paymentMode,
      paymentReference,
      remarks,
      status,
    } = req.body;

    const admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    if (totalFees !== undefined) admission.totalFees = Number(totalFees);
    if (paidFees !== undefined) admission.paidFees = Number(paidFees);
    if (duration) admission.duration = duration;
    if (batchTime) admission.batchTime = batchTime;
    if (joiningDate) admission.joiningDate = joiningDate;
    if (paymentMode) admission.paymentMode = paymentMode;
    if (paymentReference !== undefined) admission.paymentReference = paymentReference;
    if (remarks !== undefined) admission.remarks = remarks;
    if (status) admission.status = status;

    const updatedAdmission = await admission.save();

    return res.json({
      success: true,
      message: 'Admission details updated successfully',
      admission: updatedAdmission,
    });
  } catch (error) {
    console.error('Update admission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update admission' });
  }
});

// @route   DELETE /api/admissions/:id
// @desc    Delete admission and reset inquiry status
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    // Unlink inquiry
    if (admission.inquiryId) {
      await Inquiry.findByIdAndUpdate(admission.inquiryId, {
        isConverted: false,
        status: 'Follow-up',
        $unset: { admissionId: 1 },
      });
    }

    await Admission.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Admission record deleted and inquiry restored to Follow-up',
    });
  } catch (error) {
    console.error('Delete admission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete admission' });
  }
});

module.exports = router;
