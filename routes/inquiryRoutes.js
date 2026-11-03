const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Admission = require('../models/Admission');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/inquiries/today-due
// @desc    Get all inquiries with follow-up due today or overdue
// @access  Private
router.get('/today-due', protect, async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const allInquiries = await Inquiry.find({
      isConverted: false,
      status: { $nin: ['Converted to Admission', 'Cancelled', 'Not Interested'] },
    })
      .populate('admissionId')
      .sort({ createdAt: -1 });

    const dueInquiries = allInquiries.filter((inq) => {
      if (!inq.followups || inq.followups.length === 0) return false;
      const latest = inq.followups[0];
      return latest && latest.nextFollowupDate && new Date(latest.nextFollowupDate) <= endOfToday;
    });

    return res.json({
      success: true,
      count: dueInquiries.length,
      inquiries: dueInquiries,
    });
  } catch (error) {
    console.error('Fetch today-due inquiries error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving today due follow-ups' });
  }
});

// @route   GET /api/inquiries/stats
// @desc    Get dashboard metrics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const totalInquiries = await Inquiry.countDocuments();
    const totalAdmissions = await Admission.countDocuments();
    const newInquiries = await Inquiry.countDocuments({ status: 'New' });
    const followupCount = await Inquiry.countDocuments({ status: 'Follow-up' });

    // Inquiries today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayInquiries = await Inquiry.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // Domain breakdown
    const domainStats = await Inquiry.aggregate([
      {
        $group: {
          _id: '$interestedDomain',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Status breakdown
    const statusStats = await Inquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Total fees collected & pending
    const feesAggregate = await Admission.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalFees' },
          totalCollected: { $sum: '$paidFees' },
          totalPending: { $sum: '$remainingFees' },
        },
      },
    ]);

    const financial = feesAggregate[0] || {
      totalRevenue: 0,
      totalCollected: 0,
      totalPending: 0,
    };

    // Count inquiries with follow-up due today or overdue
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const unconvertedInqs = await Inquiry.find({
      isConverted: false,
      status: { $nin: ['Converted to Admission', 'Cancelled', 'Not Interested'] },
    }).select('followups');

    const todayDueCount = unconvertedInqs.filter((inq) => {
      if (!inq.followups || inq.followups.length === 0) return false;
      const latest = inq.followups[0];
      return latest && latest.nextFollowupDate && new Date(latest.nextFollowupDate) <= endOfToday;
    }).length;

    return res.json({
      success: true,
      stats: {
        totalInquiries,
        totalAdmissions,
        newInquiries,
        followupCount,
        todayInquiries,
        todayDueCount,
        conversionRate: totalInquiries > 0 ? ((totalAdmissions / totalInquiries) * 100).toFixed(1) : 0,
        domainStats,
        statusStats,
        financial,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
});

// @route   GET /api/inquiries
// @desc    Get all inquiries with search & filter
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, domain, fromDate, toDate, includeConverted } = req.query;
    let query = {};

    // Exclude inquiries that have already been converted to admission
    if (includeConverted === 'true') {
      if (status && status !== 'All') {
        query.status = status;
      }
    } else {
      query.isConverted = { $ne: true };
      query.status = { $ne: 'Converted to Admission' };
      if (status && status !== 'All' && status !== 'Converted to Admission') {
        query.status = status;
      }
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { studentName: { $regex: search, $options: 'i' } },
          { contactNo: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { collegeName: { $regex: search, $options: 'i' } },
        ]
      });
    }

    if (domain && domain !== 'All') {
      query.interestedDomain = domain;
    }

    if (fromDate || toDate) {
      query.inquiryDate = {};
      if (fromDate) query.inquiryDate.$gte = new Date(fromDate);
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        query.inquiryDate.$lte = toD;
      }
    }

    const inquiries = await Inquiry.find(query)
      .populate('admissionId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    console.error('Fetch inquiries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inquiries' });
  }
});

// @route   GET /api/inquiries/today-due
// @desc    Get all inquiries with follow-up due today or overdue
// @access  Private
router.get('/today-due', protect, async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const allInquiries = await Inquiry.find({
      isConverted: false,
      status: { $nin: ['Converted to Admission', 'Cancelled', 'Not Interested'] },
    })
      .populate('admissionId')
      .sort({ createdAt: -1 });

    const dueInquiries = allInquiries.filter((inq) => {
      if (!inq.followups || inq.followups.length === 0) return false;
      const latest = inq.followups[0];
      return latest && latest.nextFollowupDate && new Date(latest.nextFollowupDate) <= endOfToday;
    });

    return res.json({
      success: true,
      count: dueInquiries.length,
      inquiries: dueInquiries,
    });
  } catch (error) {
    console.error('Fetch today-due inquiries error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving today due follow-ups' });
  }
});

// @route   GET /api/inquiries/:id
// @desc    Get single inquiry details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).populate('admissionId');
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    return res.json({ success: true, inquiry });
  } catch (error) {
    console.error('Fetch inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inquiry details' });
  }
});

// @route   POST /api/inquiries
// @desc    Create new inquiry
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      studentName,
      contactNo,
      alternateContactNo,
      email,
      collegeName,
      degree,
      semester,
      interestedDomain,
      reference,
      referenceDetails,
      notes,
      inquiryDate,
      takenBy,
    } = req.body;

    if (!studentName || !contactNo || !interestedDomain) {
      return res.status(400).json({
        success: false,
        message: 'Student name, contact number, and interested domain are required',
      });
    }

    const inquiry = new Inquiry({
      studentName,
      contactNo,
      alternateContactNo: alternateContactNo || '',
      email: email || '',
      collegeName: collegeName || '',
      degree: degree || 'B.Tech/BE',
      semester: semester || '',
      interestedDomain,
      reference: reference || 'Walk-in',
      referenceDetails: referenceDetails || '',
      notes: notes || '',
      takenBy: takenBy || 'Haresh Sir',
      inquiryDate: inquiryDate || new Date(),
      status: 'New',
    });

    const savedInquiry = await inquiry.save();
    return res.status(201).json({
      success: true,
      message: 'Inquiry added successfully',
      inquiry: savedInquiry,
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create inquiry', error: error.message });
  }
});

// @route   PUT /api/inquiries/:id
// @desc    Update inquiry details
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      studentName,
      contactNo,
      alternateContactNo,
      email,
      collegeName,
      degree,
      semester,
      interestedDomain,
      reference,
      referenceDetails,
      notes,
      status,
      inquiryDate,
      takenBy,
    } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    if (studentName) inquiry.studentName = studentName;
    if (contactNo) inquiry.contactNo = contactNo;
    if (alternateContactNo !== undefined) inquiry.alternateContactNo = alternateContactNo;
    if (email !== undefined) inquiry.email = email;
    if (collegeName !== undefined) inquiry.collegeName = collegeName;
    if (degree !== undefined) inquiry.degree = degree;
    if (semester !== undefined) inquiry.semester = semester;
    if (interestedDomain) inquiry.interestedDomain = interestedDomain;
    if (reference !== undefined) inquiry.reference = reference;
    if (referenceDetails !== undefined) inquiry.referenceDetails = referenceDetails;
    if (notes !== undefined) inquiry.notes = notes;
    if (inquiryDate) inquiry.inquiryDate = inquiryDate;
    if (takenBy) inquiry.takenBy = takenBy;

    if (status) {
      inquiry.status = status;
      if (status === 'Converted to Admission') {
        inquiry.isConverted = true;

        // Check if admission record already exists for this inquiry
        let existingAdmission = null;
        if (inquiry.admissionId) {
          existingAdmission = await Admission.findById(inquiry.admissionId);
        }

        if (!existingAdmission) {
          const count = await Admission.countDocuments();
          const regNo = `INT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

          const newAdmission = new Admission({
            inquiryId: inquiry._id,
            registrationNo: regNo,
            studentName: inquiry.studentName,
            email: inquiry.email,
            contactNo: inquiry.contactNo,
            collegeName: inquiry.collegeName,
            domain: inquiry.interestedDomain,
            company: req.body.company || 'Creative Web Infotech',
            duration: req.body.duration || '6 Months (Full Live Project Internship)',
            batchTime: req.body.batchTime || 'Morning (9:00 AM - 1:00 PM)',
            admissionDate: req.body.admissionDate || new Date(),
            joiningDate: req.body.joiningDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalFees: Number(req.body.totalFees || 15000),
            paidFees: Number(req.body.paidFees || 5000),
            paymentMode: req.body.paymentMode || 'UPI / GPay / PhonePe',
            paymentReference: req.body.paymentReference || '',
            remarks: req.body.admissionRemarks || inquiry.notes || '',
            status: 'Active',
          });

          const savedAdmission = await newAdmission.save();
          inquiry.admissionId = savedAdmission._id;
        } else {
          if (req.body.company) existingAdmission.company = req.body.company;
          if (req.body.totalFees !== undefined) existingAdmission.totalFees = Number(req.body.totalFees);
          if (req.body.paidFees !== undefined) existingAdmission.paidFees = Number(req.body.paidFees);
          await existingAdmission.save();
        }
      } else {
        if (inquiry.isConverted) {
          inquiry.isConverted = false;
          if (inquiry.admissionId) {
            await Admission.findByIdAndDelete(inquiry.admissionId);
            inquiry.admissionId = undefined;
          }
        }
      }
    }

    const updatedInquiry = await inquiry.save();
    return res.json({
      success: true,
      message: 'Inquiry updated successfully',
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('Update inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update inquiry' });
  }
});

// @route   DELETE /api/inquiries/:id
// @desc    Delete inquiry
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // If an admission was created for this inquiry, delete it as well or unlink
    if (inquiry.admissionId) {
      await Admission.findByIdAndDelete(inquiry.admissionId);
    }

    await Inquiry.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Inquiry and related data deleted successfully',
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete inquiry' });
  }
});

// @route   POST /api/inquiries/:id/followup
// @desc    Add follow-up to inquiry
// @access  Private
router.post('/:id/followup', protect, async (req, res) => {
  try {
    const { date, status, remarks, nextFollowupDate, recordedBy } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up remarks are required',
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const followup = {
      date: date || new Date(),
      status: status || 'Interested',
      remarks,
      nextFollowupDate: nextFollowupDate || null,
      recordedBy: recordedBy || req.admin?.name || 'Haresh Sir',
    };

    inquiry.followups.unshift(followup);

    // If status is not already converted, update status to Follow-up or Not Interested
    if (!inquiry.isConverted) {
      if (status === 'Not Interested') {
        inquiry.status = 'Not Interested';
      } else {
        inquiry.status = 'Follow-up';
      }
    }

    await inquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Follow-up added successfully',
      followups: inquiry.followups,
      inquiry,
    });
  } catch (error) {
    console.error('Add followup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add follow-up' });
  }
});

// @route   POST /api/inquiries/:id/convert-admission
// @desc    Convert inquiry to Admission
// @access  Private
router.post('/:id/convert-admission', protect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const {
      company,
      duration,
      batchTime,
      admissionDate,
      joiningDate,
      totalFees,
      paidFees,
      paymentMode,
      paymentReference,
      remarks,
    } = req.body;

    if (!joiningDate || totalFees === undefined || totalFees === null) {
      return res.status(400).json({
        success: false,
        message: 'Joining date and total fees are required',
      });
    }

    // Generate unique Registration Number e.g. INT-2026-0001
    const count = await Admission.countDocuments();
    const regNo = `INT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newAdmission = new Admission({
      inquiryId: inquiry._id,
      registrationNo: regNo,
      company: company || 'Creative Web Infotech',
      studentName: inquiry.studentName,
      email: inquiry.email,
      contactNo: inquiry.contactNo,
      collegeName: inquiry.collegeName,
      domain: inquiry.interestedDomain,
      duration: duration || '6 Months',
      batchTime: batchTime || 'Morning',
      admissionDate: admissionDate || new Date(),
      joiningDate,
      totalFees: Number(totalFees),
      paidFees: Number(paidFees || 0),
      paymentMode: paymentMode || 'UPI / GPay / PhonePe',
      paymentReference: paymentReference || '',
      remarks: remarks || '',
      status: 'Active',
    });

    const savedAdmission = await newAdmission.save();

    // Update inquiry status
    inquiry.isConverted = true;
    inquiry.status = 'Converted to Admission';
    inquiry.admissionId = savedAdmission._id;
    await inquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Inquiry successfully converted to Admission!',
      admission: savedAdmission,
      inquiry,
    });
  } catch (error) {
    console.error('Convert admission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to convert to admission',
      error: error.message,
    });
  }
});

module.exports = router;
