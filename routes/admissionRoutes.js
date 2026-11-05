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

// @route   POST /api/admissions/bulk
// @desc    Bulk import admissions from Excel
// @access  Private
router.post('/bulk', protect, async (req, res) => {
  try {
    const { admissions } = req.body;
    if (!Array.isArray(admissions) || admissions.length === 0) {
      return res.status(400).json({ success: false, message: 'No admission records provided for import' });
    }

    let count = await Admission.countDocuments();
    const currentYear = new Date().getFullYear();
    const insertedAdmissions = [];

    for (const item of admissions) {
      const studentName = (
        item.studentName || 
        item['Student Name'] || 
        item['Name'] || 
        item['NAME'] || 
        ''
      ).trim();

      const contactNo = String(
        item.contactNo || 
        item['Contact Number'] || 
        item['Contact No'] || 
        item['Phone'] || 
        item['CONTACT NO'] || 
        ''
      ).trim();

      if (!studentName || !contactNo) continue;

      count += 1;
      const regNo = (
        item.registrationNo || 
        item['Registration No'] || 
        item['Reg No'] || 
        `INT-${currentYear}-${String(count).padStart(4, '0')}`
      ).trim();

      const company = (
        item.company || 
        item['Company'] || 
        item['Company Name'] || 
        'Creative Web Infotech'
      ).trim();

      const domain = (
        item.domain || 
        item['Domain'] || 
        item['Internship Track'] || 
        item['Track'] || 
        'Full Stack Web Development (MERN)'
      ).trim();

      const duration = (
        item.duration || 
        item['Duration'] || 
        '6 Months (Full Live Project Internship)'
      ).trim();

      const batchTime = (
        item.batchTime || 
        item['Batch Time'] || 
        item['Batch'] || 
        'Morning (9:00 AM - 1:00 PM)'
      ).trim();

      let admDate = new Date();
      if (item.admissionDate || item['Admission Date'] || item['Date']) {
        const p = new Date(item.admissionDate || item['Admission Date'] || item['Date']);
        if (!isNaN(p.getTime())) admDate = p;
      }

      let joinDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (item.joiningDate || item['Joining Date']) {
        const p = new Date(item.joiningDate || item['Joining Date']);
        if (!isNaN(p.getTime())) joinDate = p;
      }

      const totalFees = Number(item.totalFees || item['Total Fees'] || 15000);
      const paidFees = Number(item.paidFees || item['Paid Fees'] || item['Fees Paid'] || 5000);
      const remainingFees = Math.max(0, totalFees - paidFees);
      const paymentMode = (item.paymentMode || item['Payment Mode'] || 'UPI / GPay / PhonePe').trim();
      const paymentReference = (item.paymentReference || item['Payment Reference'] || item['Transaction ID'] || '').trim();
      const remarks = (item.remarks || item['Remarks'] || item['Notes'] || '').trim();
      const status = (item.status || item['Status'] || 'Active').trim();
      const collegeName = (item.collegeName || item['College Name'] || item['College'] || item['COLLAGE'] || '').trim();
      const email = (item.email || item['Email'] || '').trim().toLowerCase();

      // Create linked inquiry document
      const newInquiry = new Inquiry({
        studentName,
        contactNo,
        email,
        collegeName,
        degree: 'B.Tech / BE (Computer / IT)',
        semester: '6th Semester',
        interestedDomain: domain,
        reference: 'Walk-in / Direct Visit',
        takenBy: 'Haresh Sir',
        status: 'Converted to Admission',
        isConverted: true,
        inquiryDate: admDate,
        notes: remarks,
      });
      const savedInquiry = await newInquiry.save();

      // Create admission document
      const newAdmission = new Admission({
        inquiryId: savedInquiry._id,
        registrationNo: regNo,
        studentName,
        contactNo,
        email,
        collegeName,
        domain,
        company,
        duration,
        batchTime,
        admissionDate: admDate,
        joiningDate: joinDate,
        totalFees,
        paidFees,
        remainingFees,
        paymentMode,
        paymentReference,
        remarks,
        status,
      });
      const savedAdmission = await newAdmission.save();

      savedInquiry.admissionId = savedAdmission._id;
      await savedInquiry.save();

      insertedAdmissions.push(savedAdmission);
    }

    if (insertedAdmissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid admission records found. Make sure Student Name and Contact Number are present in the Excel file.',
      });
    }

    return res.status(201).json({
      success: true,
      message: `${insertedAdmissions.length} admissions imported successfully`,
      count: insertedAdmissions.length,
      admissions: insertedAdmissions,
    });
  } catch (error) {
    console.error('Bulk admission import error:', error);
    return res.status(500).json({ success: false, message: 'Failed to import admissions', error: error.message });
  }
});

// @route   PUT /api/admissions/:id
// @desc    Update admission details
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      studentName,
      contactNo,
      email,
      collegeName,
      domain,
      company,
      paidFees,
      totalFees,
      duration,
      batchTime,
      admissionDate,
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

    if (studentName) admission.studentName = studentName;
    if (contactNo) admission.contactNo = contactNo;
    if (email !== undefined) admission.email = email;
    if (collegeName !== undefined) admission.collegeName = collegeName;
    if (domain) admission.domain = domain;
    if (company) admission.company = company;

    if (totalFees !== undefined) admission.totalFees = Number(totalFees);
    if (paidFees !== undefined) admission.paidFees = Number(paidFees);
    if (duration) admission.duration = duration;
    if (batchTime) admission.batchTime = batchTime;
    if (admissionDate) admission.admissionDate = admissionDate;
    if (joiningDate) admission.joiningDate = joiningDate;
    if (paymentMode) admission.paymentMode = paymentMode;
    if (paymentReference !== undefined) admission.paymentReference = paymentReference;
    if (remarks !== undefined) admission.remarks = remarks;
    if (status) admission.status = status;

    const updatedAdmission = await admission.save();

    // Sync changes to the linked inquiry as well
    if (admission.inquiryId) {
      const inquiryUpdates = {};
      if (studentName) inquiryUpdates.studentName = studentName;
      if (contactNo) inquiryUpdates.contactNo = contactNo;
      if (email !== undefined) inquiryUpdates.email = email;
      if (collegeName !== undefined) inquiryUpdates.collegeName = collegeName;
      if (domain) inquiryUpdates.interestedDomain = domain;

      if (Object.keys(inquiryUpdates).length > 0) {
        await Inquiry.findByIdAndUpdate(admission.inquiryId, inquiryUpdates);
      }
    }

    return res.json({
      success: true,
      message: 'Admission details updated successfully',
      admission: updatedAdmission,
    });
  } catch (error) {
    console.error('Update admission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update admission', error: error.message });
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
