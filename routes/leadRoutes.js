const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Inquiry = require('../models/Inquiry');
const { protect } = require('../middleware/authMiddleware');

// Helper to clean and normalize phone numbers
const cleanPhone = (val) => {
  if (!val) return '';
  let str = String(val).trim().replace(/\.0+$/, '').replace(/[^0-9]/g, '');
  if (str.length === 12 && str.startsWith('91')) {
    str = str.slice(2);
  } else if (str.length === 11 && str.startsWith('0')) {
    str = str.slice(1);
  }
  return str || String(val).trim();
};

// @route   POST /api/leads/public
// @desc    Submit new lead via Google Form (Public)
// @access  Public
router.post('/public', async (req, res) => {
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
      city,
      preferredBatch,
      duration,
      notes,
    } = req.body;

    if (!contactNo) {
      return res.status(400).json({
        success: false,
        message: 'Contact / Mobile number is required.',
      });
    }

    const cleanedContact = cleanPhone(contactNo);
    const cleanedName = (studentName || `Student - ${cleanedContact.slice(-4)}`).trim();

    // Check if a lead already exists with this phone number
    let existingLead = await Lead.findOne({
      $or: [
        { contactNo: cleanedContact },
        { contactNo: contactNo.trim() },
      ],
    });

    if (existingLead) {
      // Append additional note if submitted again
      existingLead.notes = existingLead.notes 
        ? `${existingLead.notes} | Re-submitted on ${new Date().toLocaleDateString()}` 
        : `Re-submitted on ${new Date().toLocaleDateString()}`;
      if (city) existingLead.city = city;
      if (interestedDomain) existingLead.interestedDomain = interestedDomain;
      await existingLead.save();

      return res.status(200).json({
        success: true,
        message: 'Thank you! Your response has been updated. Our counselor will contact you shortly.',
        lead: existingLead,
        alreadyExisted: true,
      });
    }

    const newLead = new Lead({
      studentName: cleanedName,
      contactNo: cleanedContact,
      alternateContactNo: alternateContactNo ? cleanPhone(alternateContactNo) : '',
      email: (email || '').trim().toLowerCase(),
      collegeName: (collegeName || '').trim(),
      degree: (degree || 'B.Tech / BE (Computer / IT)').trim(),
      semester: (semester || '6th Semester').trim(),
      interestedDomain: (interestedDomain || 'Full Stack Web Development (MERN)').trim(),
      city: (city || 'Surat').trim(),
      preferredBatch: (preferredBatch || 'Morning (9:00 AM - 1:00 PM)').trim(),
      duration: (duration || '6 Months (Full Live Project Internship)').trim(),
      notes: (notes || '').trim(),
      source: 'Google Form',
      status: 'New Lead',
      isConvertedToInquiry: false,
    });

    const savedLead = await newLead.save();

    return res.status(201).json({
      success: true,
      message: 'Your response has been recorded. Our counselor will contact you shortly.',
      lead: savedLead,
    });
  } catch (error) {
    console.error('Submit lead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record application. Please try again.',
      error: error.message,
    });
  }
});

// @route   GET /api/leads
// @desc    Get all leads with search and filter
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, domain } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (domain && domain !== 'All') {
      query.interestedDomain = domain;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { studentName: searchRegex },
        { contactNo: searchRegex },
        { email: searchRegex },
        { collegeName: searchRegex },
        { city: searchRegex },
        { notes: searchRegex },
      ];
    }

    const leads = await Lead.find(query)
      .populate('inquiryId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message,
    });
  }
});

// @route   POST /api/leads/:id/convert-to-inquiry
// @desc    Convert/Set Lead into Official Inquiry
// @access  Private
router.post('/:id/convert-to-inquiry', protect, async (req, res) => {
  try {
    const {
      takenBy,
      degree,
      semester,
      interestedDomain,
      notes,
      status,
    } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead record not found' });
    }

    // Check if inquiry already exists for this lead
    if (lead.isConvertedToInquiry && lead.inquiryId) {
      const existingInquiry = await Inquiry.findById(lead.inquiryId);
      if (existingInquiry) {
        return res.status(200).json({
          success: true,
          message: 'This lead is already converted to an inquiry.',
          inquiry: existingInquiry,
          lead,
        });
      }
    }

    // Create official Inquiry record
    const counselor = (takenBy || 'Haresh Sir').trim();
    const finalDomain = (interestedDomain || lead.interestedDomain || 'Full Stack Web Development (MERN)').trim();
    const finalDegree = (degree || lead.degree || 'B.Tech / BE (Computer / IT)').trim();
    const finalSemester = (semester || lead.semester || '6th Semester').trim();
    const finalStatus = (status || 'New').trim();

    const locationInfo = lead.city ? `City: ${lead.city}` : '';
    const batchInfo = lead.preferredBatch ? `Batch: ${lead.preferredBatch}` : '';
    const durationInfo = lead.duration ? `Duration: ${lead.duration}` : '';
    const combinedRefDetails = [locationInfo, batchInfo, durationInfo].filter(Boolean).join(' | ') || 'Google Form Online Lead';

    const newInquiry = new Inquiry({
      studentName: lead.studentName,
      contactNo: lead.contactNo,
      alternateContactNo: lead.alternateContactNo || '',
      email: lead.email || '',
      collegeName: lead.collegeName || '',
      degree: finalDegree,
      semester: finalSemester,
      interestedDomain: finalDomain,
      reference: 'Google Form Lead',
      referenceDetails: combinedRefDetails,
      notes: notes || lead.notes || '',
      takenBy: counselor,
      status: finalStatus,
      inquiryDate: new Date(),
      isConverted: false,
    });

    const savedInquiry = await newInquiry.save();

    // Update Lead status & reference
    lead.isConvertedToInquiry = true;
    lead.status = 'Converted to Inquiry';
    lead.inquiryId = savedInquiry._id;
    lead.assignedTo = counselor;
    lead.convertedAt = new Date();
    await lead.save();

    return res.status(201).json({
      success: true,
      message: `Lead successfully set to Inquiry and assigned to ${counselor}!`,
      inquiry: savedInquiry,
      lead,
    });
  } catch (error) {
    console.error('Convert lead to inquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to convert lead to inquiry',
      error: error.message,
    });
  }
});

// @route   PUT /api/leads/:id
// @desc    Update lead details or status (e.g. Reject / Junk)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const {
      studentName,
      contactNo,
      email,
      collegeName,
      degree,
      semester,
      interestedDomain,
      city,
      status,
      notes,
    } = req.body;

    if (studentName) lead.studentName = studentName;
    if (contactNo) lead.contactNo = cleanPhone(contactNo);
    if (email !== undefined) lead.email = email;
    if (collegeName !== undefined) lead.collegeName = collegeName;
    if (degree !== undefined) lead.degree = degree;
    if (semester !== undefined) lead.semester = semester;
    if (interestedDomain) lead.interestedDomain = interestedDomain;
    if (city !== undefined) lead.city = city;
    if (status) lead.status = status;
    if (notes !== undefined) lead.notes = notes;

    const updatedLead = await lead.save();

    return res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Update lead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lead', error: error.message });
  }
});

// @route   DELETE /api/leads/:id
// @desc    Delete a lead
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await Lead.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
});

module.exports = router;
