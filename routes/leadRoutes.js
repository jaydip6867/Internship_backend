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

// Helper to extract values from varying Google Form / Apps Script payload formats
const extractVal = (body, ...keys) => {
  if (!body || typeof body !== 'object') return '';
  for (const k of keys) {
    if (body[k] !== undefined && body[k] !== null && body[k] !== '') {
      const val = body[k];
      return Array.isArray(val) ? String(val[0]).trim() : String(val).trim();
    }
  }
  return '';
};

// Sync toggle state - Default is now TRUE as user requested to start syncing records!
let isGoogleFormSyncActive = process.env.GOOGLE_FORM_SYNC_ACTIVE !== 'false'; // true by default
let lastWebhookPing = null;

// @route   GET /api/leads/sync-status
// @desc    Get Google Form webhook integration & sync status
// @access  Public / Protected
router.get('/sync-status', (req, res) => {
  return res.json({
    success: true,
    syncActive: isGoogleFormSyncActive,
    statusText: isGoogleFormSyncActive ? 'ACTIVE (Saving to Database)' : 'PAUSED / STANDBY (No Records Added)',
    message: isGoogleFormSyncActive
      ? 'Google Form sync is active. Submissions are saved to the database.'
      : 'Google Form integration is configured on standby. Webhook pings are received, but no records are added until enabled.',
    lastPing: lastWebhookPing,
  });
});

// @route   POST /api/leads/toggle-sync
// @desc    Enable or pause Google Form lead insertion
// @access  Private
router.post('/toggle-sync', protect, (req, res) => {
  if (req.body.active !== undefined) {
    isGoogleFormSyncActive = Boolean(req.body.active);
  } else {
    isGoogleFormSyncActive = !isGoogleFormSyncActive;
  }
  console.log(`🔄 [Google Form Integration] Sync active state toggled to: ${isGoogleFormSyncActive}`);
  return res.json({
    success: true,
    syncActive: isGoogleFormSyncActive,
    message: `Google Form lead sync is now ${isGoogleFormSyncActive ? 'ACTIVE (Will add new records)' : 'PAUSED (On Standby)'}`,
  });
});

// @route   POST /api/leads/sync-batch
// @desc    Batch sync all rows from Google Sheet Apps Script (Adds ONLY to New Leads page / Lead collection)
// @access  Public (Webhook)
router.post('/sync-batch', async (req, res) => {
  try {
    const items = req.body.leads || req.body.rows || req.body.data || (Array.isArray(req.body) ? req.body : []);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No lead rows provided in request body.',
      });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of items) {
      let studentName = '';
      let contactNo = '';
      let email = '';
      let collegeName = '';
      let degree = '';
      let semester = '';
      let interestedDomain = '';
      let internshipType = '';
      let internshipMode = '';
      let notes = '';

      if (Array.isArray(row)) {
        studentName = row[1] || '';
        contactNo = row[2] || '';
        email = row[3] || '';
        collegeName = row[4] || '';
        degree = row[5] || '';
        semester = row[6] || '';
        interestedDomain = row[7] || '';
        internshipType = row[8] || '';
        internshipMode = row[9] || '';
        notes = row[10] || '';
      } else if (typeof row === 'object') {
        studentName = extractVal(row, 'studentName', 'Student Full Name', 'name', 'Student Name', 'Full Name');
        contactNo = extractVal(row, 'contactNo', 'Mobile / WhatsApp Number', 'Mobile Number', 'WhatsApp Number', 'phone', 'contact');
        email = extractVal(row, 'email', 'Email Address', 'Email', 'emailAddress');
        collegeName = extractVal(row, 'collegeName', 'College / University Name', 'College Name', 'University', 'college');
        degree = extractVal(row, 'degree', 'Current Course', 'Course', 'degree');
        semester = extractVal(row, 'semester', 'Current Academic Year', 'Academic Year', 'Semester', 'year');
        interestedDomain = extractVal(row, 'interestedDomain', 'Preferred Internship Domain', 'Domain', 'track');
        internshipType = extractVal(row, 'internshipType', 'Internship Program Preference', 'Program Preference', 'type');
        internshipMode = extractVal(row, 'internshipMode', 'Preferred Internship Mode', 'Mode', 'internshipMode');
        notes = extractVal(row, 'notes', 'Any Questions? (Optional)', 'Questions', 'remarks', 'comments');
      }

      const cleanedContact = cleanPhone(contactNo);
      const cleanedName = String(studentName || '').trim();

      // Skip header row or empty entries
      if (
        cleanedName.toLowerCase().includes('student full name') ||
        String(contactNo).toLowerCase().includes('mobile') ||
        (!cleanedName && !cleanedContact)
      ) {
        skippedCount++;
        continue;
      }

      // Check duplicate by contact number in Lead collection
      let existingLead = null;
      if (cleanedContact) {
        existingLead = await Lead.findOne({
          $or: [
            { contactNo: cleanedContact },
            { contactNo: String(contactNo).trim() },
          ],
        });
      }

      if (existingLead) {
        if (collegeName && !existingLead.collegeName) existingLead.collegeName = collegeName;
        if (degree && !existingLead.degree) existingLead.degree = degree;
        if (semester && !existingLead.semester) existingLead.semester = semester;
        if (interestedDomain && !existingLead.interestedDomain) existingLead.interestedDomain = interestedDomain;
        if (internshipType && !existingLead.internshipType) existingLead.internshipType = internshipType;
        if (internshipMode && !existingLead.internshipMode) existingLead.internshipMode = internshipMode;
        await existingLead.save();
        updatedCount++;
      } else {
        const newLead = new Lead({
          studentName: cleanedName || (cleanedContact ? `Student - ${cleanedContact.slice(-4)}` : 'Google Form Applicant'),
          contactNo: cleanedContact || '9999999999',
          email: String(email || '').trim().toLowerCase(),
          collegeName: String(collegeName || '').trim(),
          degree: String(degree || 'BCA').trim(),
          semester: String(semester || '3rd Year').trim(),
          interestedDomain: String(interestedDomain || 'Full Stack Web Development').trim(),
          internshipType: String(internshipType || 'Free Internship').trim(),
          internshipMode: String(internshipMode || 'Offline (Surat)').trim(),
          city: 'Surat',
          notes: String(notes || '').trim(),
          source: 'Google Sheet Sync',
          status: 'New Lead',
          isConvertedToInquiry: false,
        });

        await newLead.save();
        addedCount++;
      }
    }

    console.log(`✅ [Google Sheet Batch Sync] ${addedCount} leads added to New Leads, ${updatedCount} updated, ${skippedCount} skipped.`);

    return res.json({
      success: true,
      message: `${addedCount} leads added to New Leads page successfully.${updatedCount > 0 ? ` (${updatedCount} updated)` : ''}`,
      addedCount,
      updatedCount,
      skippedCount,
      totalProcessed: items.length,
    });
  } catch (error) {
    console.error('Batch sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to batch sync leads from Google Sheet',
      error: error.message,
    });
  }
});

// @route   POST /api/leads/bulk
// @desc    Bulk import leads from Excel/CSV (adds ONLY to Lead collection / New Leads page)
// @access  Private
router.post('/bulk', protect, async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No lead records provided for import' });
    }

    const existingLeads = await Lead.find({}, { contactNo: 1 });
    const existingPhoneSet = new Set();
    existingLeads.forEach((l) => {
      const p = cleanPhone(l.contactNo);
      if (p) existingPhoneSet.add(p);
    });

    const batchPhoneSet = new Set();
    let skippedDuplicates = 0;
    const docsToInsert = [];

    for (const item of leads) {
      const rawContact = item.contactNo || 
        item.phone || 
        item['Mobile / WhatsApp Number'] || 
        item['Mobile Number'] || 
        item['WhatsApp Number'] || 
        item['Contact No'] || 
        item['Phone'] || 
        item['Mobile'] || 
        '';

      const cleaned = cleanPhone(rawContact);
      if (!cleaned) continue;

      if (existingPhoneSet.has(cleaned) || batchPhoneSet.has(cleaned)) {
        skippedDuplicates++;
        continue;
      }

      batchPhoneSet.add(cleaned);

      const studentName = String(
        item.studentName || 
        item['Student Full Name'] || 
        item['Student Name'] || 
        item['Name'] || 
        `Student - ${cleaned.slice(-4)}`
      ).trim();

      const email = String(item.email || item['Email Address'] || item['Email'] || '').trim().toLowerCase();
      const collegeName = String(item.collegeName || item['College / University Name'] || item['College'] || '').trim();
      const degree = String(item.degree || item['Current Course'] || item['Course'] || 'BCA').trim();
      const semester = String(item.semester || item['Current Academic Year'] || item['Semester'] || '3rd Year').trim();
      const interestedDomain = String(item.interestedDomain || item['Preferred Internship Domain'] || item['Domain'] || 'Full Stack Web Development').trim();
      const internshipType = String(item.internshipType || item['Internship Program Preference'] || item['Option'] || 'free (interview crack mandatory.)').trim();
      const internshipMode = String(item.internshipMode || item['Preferred Internship Mode'] || 'Offline (Surat)').trim();
      const notes = String(item.notes || item['Any Questions? (Optional)'] || item['Notes'] || '').trim();

      docsToInsert.push({
        studentName,
        contactNo: cleaned,
        email,
        collegeName,
        degree,
        semester,
        interestedDomain,
        internshipType,
        internshipMode,
        city: 'Surat',
        notes,
        source: 'Excel Import',
        status: 'New Lead',
        isConvertedToInquiry: false,
      });
    }

    if (docsToInsert.length === 0) {
      return res.json({
        success: true,
        message: `No new leads were added.${skippedDuplicates > 0 ? ` All ${skippedDuplicates} records already exist in New Leads.` : ''}`,
        count: 0,
        skippedDuplicates,
      });
    }

    const inserted = await Lead.insertMany(docsToInsert);
    return res.status(201).json({
      success: true,
      count: inserted.length,
      skippedDuplicates,
      message: `${inserted.length} leads imported successfully into New Leads page.${skippedDuplicates > 0 ? ` (${skippedDuplicates} existing phone numbers were skipped)` : ''}`,
    });
  } catch (error) {
    console.error('Bulk lead import error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to import leads',
      error: error.message,
    });
  }
});

// @route   POST /api/leads/google-form-webhook
// @route   POST /api/leads/webhook
// @desc    Instant webhook trigger from Google Forms / Google Sheet Apps Script
// @access  Public (Webhook)
const handleGoogleFormWebhook = async (req, res) => {
  try {
    const body = req.body || {};

    // Extract fields from Google Form / Sheet payload (supporting both e.namedValues and direct JSON)
    const studentName = extractVal(body, 'studentName', 'Student Full Name', 'name', 'Student Name', 'Full Name');
    const contactNo = extractVal(body, 'contactNo', 'Mobile / WhatsApp Number', 'Mobile Number', 'WhatsApp Number', 'phone', 'contact');
    const email = extractVal(body, 'email', 'Email Address', 'Email', 'emailAddress');
    const collegeName = extractVal(body, 'collegeName', 'College / University Name', 'College Name', 'University', 'college');
    const degree = extractVal(body, 'degree', 'Current Course', 'Course', 'degree');
    const semester = extractVal(body, 'semester', 'Current Academic Year', 'Academic Year', 'Semester', 'year');
    const interestedDomain = extractVal(body, 'interestedDomain', 'Preferred Internship Domain', 'Domain', 'track');
    const internshipType = extractVal(body, 'internshipType', 'Internship Program Preference', 'Program Preference', 'type');
    const internshipMode = extractVal(body, 'internshipMode', 'Preferred Internship Mode', 'Mode', 'internshipMode');
    const notes = extractVal(body, 'notes', 'Any Questions? (Optional)', 'Questions', 'remarks', 'comments');

    const cleanedContact = cleanPhone(contactNo);
    const cleanedName = (studentName || (cleanedContact ? `Student - ${cleanedContact.slice(-4)}` : 'Google Form Applicant')).trim();

    // Record last ping for connection status check
    lastWebhookPing = {
      receivedAt: new Date(),
      studentName: cleanedName,
      contactNo: cleanedContact,
      email,
      domain: interestedDomain,
      internshipType,
      syncActive: isGoogleFormSyncActive,
    };

    // If sync is not active (as requested by user until told to run), do NOT add records to DB!
    if (!isGoogleFormSyncActive) {
      console.log(`ℹ️ [Google Form Webhook] Webhook ping received from Google Form for "${cleanedName}" (${cleanedContact || 'No contact'}). Sync is currently PAUSED on standby as requested. No record added to database.`);
      return res.status(200).json({
        success: true,
        syncActive: false,
        message: 'Google Form webhook integration is connected and verified. Lead sync is currently PAUSED on standby as configured. No record was added to database.',
        receivedAt: new Date(),
        preview: {
          studentName: cleanedName,
          contactNo: cleanedContact,
          interestedDomain,
          internshipType,
          internshipMode,
        },
      });
    }

    // --- When Sync IS Active: Process & Save to Database ---
    if (!cleanedContact && !email) {
      return res.status(400).json({
        success: false,
        message: 'Contact number or email is required to register lead.',
      });
    }

    // Check duplicate by contact number
    let existingLead = null;
    if (cleanedContact) {
      existingLead = await Lead.findOne({
        $or: [
          { contactNo: cleanedContact },
          { contactNo: contactNo.trim() },
        ],
      });
    }

    if (existingLead) {
      existingLead.notes = existingLead.notes 
        ? `${existingLead.notes} | Google Form re-submitted on ${new Date().toLocaleDateString()}` 
        : `Google Form re-submitted on ${new Date().toLocaleDateString()}`;
      if (collegeName) existingLead.collegeName = collegeName;
      if (degree) existingLead.degree = degree;
      if (semester) existingLead.semester = semester;
      if (interestedDomain) existingLead.interestedDomain = interestedDomain;
      if (internshipType) existingLead.internshipType = internshipType;
      if (internshipMode) existingLead.internshipMode = internshipMode;
      await existingLead.save();

      console.log(`✅ [Google Form Webhook] Updated existing lead for ${cleanedName} (${cleanedContact})`);
      return res.status(200).json({
        success: true,
        syncActive: true,
        message: 'Existing lead updated successfully from Google Form',
        lead: existingLead,
        alreadyExisted: true,
      });
    }

    const newLead = new Lead({
      studentName: cleanedName,
      contactNo: cleanedContact,
      email: (email || '').trim().toLowerCase(),
      collegeName: (collegeName || '').trim(),
      degree: (degree || 'BCA').trim(),
      semester: (semester || '3rd Year').trim(),
      interestedDomain: (interestedDomain || 'Full Stack Web Development').trim(),
      internshipType: (internshipType || 'Free Internship').trim(),
      internshipMode: (internshipMode || 'Offline (Surat)').trim(),
      city: 'Surat',
      notes: (notes || '').trim(),
      source: 'Google Form (Official)',
      status: 'New Lead',
      isConvertedToInquiry: false,
    });

    const savedLead = await newLead.save();
    console.log(`✅ [Google Form Webhook] Successfully created new lead for ${cleanedName} (${cleanedContact})`);

    return res.status(201).json({
      success: true,
      syncActive: true,
      message: 'New lead recorded successfully from Google Form',
      lead: savedLead,
    });
  } catch (error) {
    console.error('Google Form webhook error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process Google Form webhook',
      error: error.message,
    });
  }
};

router.post('/google-form-webhook', handleGoogleFormWebhook);
router.post('/webhook', handleGoogleFormWebhook);

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
      internshipType,
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
      if (internshipType) existingLead.internshipType = internshipType;
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
      internshipType: (internshipType || 'free (interview crack mandatory.)').trim(),
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

    const typeInfo = lead.internshipType ? `Preference: ${lead.internshipType}` : '';
    const locationInfo = lead.city ? `City: ${lead.city}` : '';
    const batchInfo = lead.preferredBatch ? `Batch: ${lead.preferredBatch}` : '';
    const durationInfo = lead.duration ? `Duration: ${lead.duration}` : '';
    const combinedRefDetails = [typeInfo, locationInfo, batchInfo, durationInfo].filter(Boolean).join(' | ') || 'Google Form Online Lead';

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
