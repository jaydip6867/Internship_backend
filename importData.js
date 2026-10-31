const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Inquiry = require('./models/Inquiry');
const connectDB = require('./config/db');

dotenv.config();

const rawData = `DATE,NAME ,CONTACT NO.,COLLAGE,REFRENCE,INTRENSHIP,TAKEN BY ,SUGGESTED,REMARK,CALL DETAILS
29-10-26,MEVADA JANVI,7041152777,TMTBCA,WAHEEDA,UI/UX,,-,,
30-10-26,PRAJAPATI UTSAV,8866896964,SASCMA,SOCIAL MEDIA,WEB DEVLOPMENT,,-,JOIN TOMMOROW ,
30-10-26,MEVAWALA JIYA ,8780390820,J.P DAWER,-,ANDROID DEVELOPMENT,,-,WILL INFORM BY TOMORROW,
30-10-26,NINAMA NIRALI ,7383202599,TMTBCA,-,UI/UX,,-,JOIN TOMMOROW ,cnr(o1)
,LAD PRACHI,8155911023,TMTBCA,-,UI/UX,,-,JOIN TOMMOROW ,join after diwali(o1)
,PATEL PRACHI,9727927593,VVWU,-,FRONTEND ,,-,DONE,
30-10-26,HONEY MEHTA ,9638197195,SASCMA,GOGGLE ,WEB DEVLOPMENT,,-,,
30-10-26,VISHWAKARMA DIVYANSHI ,7990539221,VVWU ,,"SOFTWARE,DIGITAL MARKETING,WEB DESIGNING",,-,WILL JOIN TOMORROW,
30-10-26,PRAJAPATI AASHUM ,7990076177,VVWU,-,"WEB DESIGNING,DIGITAL MARKETING,WEB DEVELOPMENT ",,-,WILL JOIN TOMORROW,
,SHAIKH ASHIYA ,9313854730,VVWU,-,GRAPHIC DESIGNING,,UI/UX,WILL JOIN TOMORROW,
,SAIYED ROZINA ,6355462829,VVWU,-,GRAPHIC DESIGNING,,DIGITAL MARKETING,WILL JOIN TOMORROW,
30-10-26,RANA BHUMIKA ,9099617190,SASCMA,GOGGLE FORM,-,MISHAL SIR ,FRONTED DEVLOPER ,INFORM ON MONDAY,
30-10-26,PATEL OMI,9898953899,SASCMA ,GOGGLE FORM,FRONTEND ,MISHAL SIR ,FRONTED DEVLOPER ,WILL INFORM TOMORROW,
30-10-26,KEVADIYA KRISHA,9909615351,VVWU,DHRUVIT ,"UI/UX,WEB DEVELOPMENT ",MISHAL SIR ,WEB DEVELOPMENT ,WILL INFORM TOMORROW,
,DESAI VEDI ,9879591213,VVWU,DHRUVIT ,"UI/UX,WEB DEVELOPMENT ",MISHAL SIR ,WEB DEVELOPMENT ,WILL INFORM TOMORROW,
,CHAUHAN KRISHNA,7859809728,VVWU,DHRUVIT ,"UI/UX,WEB DEVELOPMENT ",MISHAL SIR ,WEB DEVELOPMENT ,WILL INFORM TOMORROW,
,HINGE MAYURI ,8758385332,VVWU,DHRUVIT ,"UI/UX,WEB DEVELOPMENT ",MISHAL SIR ,WEB DEVELOPMENT ,,
22-10-26,MIR FATIMA ,9409774722,TMTBCA,PANKAJ SIR ,SOFTWARE ENGENEERING,HARESH SIR,-,CALL TODAY,join after diwali (o1)
30-10-26,SWEETY CHAUDHARY ,7903047594,VVWU,KAJAL GUPTA,-,MISHAL SIR ,DIGITAL MARKETING ,JOIN TOMMOROW,cnr(o1)
,SANDHYA KASHYAP ,8780781930,VVWU,KAJAL GUPTA,-,MISHAL SIR ,DIGITAL MARKETING ,JOIN TOMMOROW,cnr(o1)
,KOIRI TANYA ,931605430,VVWU,KAJAL GUPTA,-,MISHAL SIR ,DIGITAL MARKETING ,JOIN TOMMOROW,cnr(o1)
29-10-26,VRUSHTI SHAH ,9586919971,VVWU ,SANJNA ,CYBER SECURITY ,HARESH SIR ,FRONTEND DEVELOPER ,JOIN AFTER DIWALI,
22-10-26,BEDSE DIVYANGI,9328206128,TMTBCA,PANKAJ SIR ,SOFTWARE ENGENEERING,HARESH SIR ,-,CALL TODAY,cnr(o1)
26-10-26,VERMA AMAN ,9453229535,Z.S PATEL,WP MSG,WEB DEVELOPMENT,HARESH SIR ,,,
26-10-26,CHIKHALIYA JENISHA ,8849343512,SASCMA,ONLINE ,AI/ML,,-,FOLLOW UP,cnr(o1)
26-10-26,SHARMA NEHA ,6355214467,SASCMA ,-,AI/ML,,-,FOLLOW UP,cnr(o1)
26-10-26,VIRANI MAYURI ,9265395570,SASCMA,-,PAYTHON ,,-,FOLLOW UP,coming on monday(o1)
26-10-26,DAVRA PRACHI ,8866041212,SASCMA ,ONLINE ,AI/ML,,-,FOLLOW UP,coming on monday(o1)
26-10-26,PATEL JATIN ,8799602695,Z.S PATEL,WP MSG,FULLSTACK DEVLOPMENT/WEB DEVELOPMENT ,MISHAL SIR ,FRONTEND ,FOLLOW UP,
24-10-26,PARDESHI NAMRATA ,9909147770,SASCMA ,-,UI/UX DESIGNING ,,-,FOLLOW UP,
28-10-26,PATEL DIYA ,8320404526,Z.S PATEL,WP MSG,WEB DESIGNING ,HARESH SIR ,-,FOLLOW UP,
27-10-26,PARMAR NENSI ,7069399347,TMTBCA,-,GRAPHIC DESIGNING,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,KARANKAL ANKITA ,8347183081,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,SHAH VISHVA ,9904501527,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,AHIRE RANI,8799063476,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,RAO POOJA ,7990252006,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,MORE SAMIKSHA ,6355038725,TMTBCA,-,GRAPHIC DESIGNING,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,JOSHI JIGYASA ,9023756395,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,PATIL PALLAVI ,8980979383,TMTBCA,-,WEB DEVELOPMENT ,HARESH SIR ,FRONTEND ,RE-VISIT ON 2ND NOV,
27-10-26,RACHA RUCHITHA ,8734891654,TMTBCA,-,WEB DEVELOPMENT,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
27-10-26,KASABWALA KRISHNA ,9924020291,TMTBCA,-,WEB DEVELOPMENT,HARESH SIR ,-,RE-VISIT ON 2ND NOV,
30-10-26,PATEL PRATHAM ,9328307910,VIVEKANAD ,-,DATA ANALYTICS ,HARESH SIR ,-,FOLLOW UP,
30-10-26,SHAIKH MOHAMMED SAMIR ,9313363249,VIVEKANAD ,-,DATA ANALYTICS ,HARESH SIR ,-,FOLLOW UP,
30-10-26,PATHAN MOHAMMED ALIKHAN,9978256555,VIVEKANAD ,-,DATA ANALYTICS ,HARESH SIR ,-,FOLLOW UP,
30-10-26,MIRZA MOHAMMED HUSSAIN,9586273922,VIVEKANAD ,-,DATA ANALYTICS ,HARESH SIR ,-,FOLLOW UP,
30-10-26,SHAH AYUSHI,8160652845,SASCMA,-,AI/ML,HARESH SIR ,-,FOLLOW UP,
30-10-26,PRAJAPATI KRISHNA ,7984882859,VVWU,CLG GRP MSG,UI/UX,MISHAL SIR ,,WILL INFORM BY TOMORROW,
,RATHOD PRATIKSHA,9824698411,VVWU,CLG GRP MSG,DIGITAL MARKETING WITH AI,MISHAL SIR ,,WILL INFORM BY TOMORROW,
,PIPALIYA NIDHI ,8200326418,VVWU,CLG GRP MSG,DIGITAL MARKETING WITH AI,MISHAL SIR ,,WILL INFORM BY TOMORROW,
31-10-26,JIGISHA SINGH ,9327154698,TMTBCA,-,FRONTEND ,HARESH SIR ,,SHE WILL INFORM BY TODAY EVNING,`;

// Function to parse CSV lines with quoted values
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    row.push(currentVal.trim());
    result.push(row);
  }
  return result;
}

// Convert "DD-MM-YY" to valid Date
function parseDate(dateStr, lastValidDate) {
  if (!dateStr || dateStr === '-') {
    return lastValidDate || new Date(2026, 9, 30); // Default late Oct 2026
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based month
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return lastValidDate || new Date();
}

async function importRecords() {
  await connectDB();

  const rows = parseCSV(rawData);
  console.log(`Found ${rows.length} records to import.`);

  let lastDate = new Date(2026, 9, 30);
  let importedCount = 0;

  for (const row of rows) {
    // DATE,NAME ,CONTACT NO.,COLLAGE,REFRENCE,INTRENSHIP,TAKEN BY ,SUGGESTED,REMARK,CALL DETAILS
    const rawDate = row[0];
    const name = row[1];
    const contact = row[2];
    const college = row[3];
    const reference = row[4];
    const internship = row[5];
    const takenBy = row[6];
    const suggested = row[7];
    const remark = row[8];
    const callDetails = row[9];

    if (!name || !contact) continue;

    const inquiryDate = parseDate(rawDate, lastDate);
    if (rawDate && rawDate !== '-') {
      lastDate = inquiryDate;
    }

    // Clean reference
    let cleanRef = 'Direct / Walk-in';
    let cleanRefDetails = '';
    if (reference && reference !== '-') {
      cleanRef = reference.toUpperCase();
      cleanRefDetails = reference;
    }

    // Clean domain
    let domain = internship && internship !== '-' ? internship : (suggested && suggested !== '-' ? suggested : 'Web Development');

    // Build notes
    const notesParts = [];
    if (takenBy && takenBy !== '-') notesParts.push(`Taken By: ${takenBy}`);
    if (suggested && suggested !== '-') notesParts.push(`Suggested Course: ${suggested}`);
    const notes = notesParts.join(' | ');

    // Determine initial status & followup
    let status = 'New';
    const followups = [];

    const remarkUpper = (remark || '').toUpperCase();
    const callUpper = (callDetails || '').toUpperCase();

    if (remarkUpper || callUpper) {
      status = 'Follow-up';

      let followupStatus = 'Interested';
      if (remarkUpper.includes('JOIN') || remarkUpper.includes('DONE')) {
        followupStatus = 'Ready for Admission';
      } else if (callUpper.includes('CNR') || callUpper.includes('COLD')) {
        followupStatus = 'Cold/No Response';
      } else if (remarkUpper.includes('INFORM') || remarkUpper.includes('CALL')) {
        followupStatus = 'Callback Requested';
      } else if (remarkUpper.includes('RE-VISIT')) {
        followupStatus = 'Visited Campus';
      }

      // Combine remarks
      let combinedRemarks = remark || '';
      if (callDetails && callDetails !== '-') {
        combinedRemarks += (combinedRemarks ? ' | Call Log: ' : '') + callDetails;
      }

      // Estimate next followup date if mentioned
      let nextDate = null;
      if (remarkUpper.includes('TOMORROW') || remarkUpper.includes('TOMMOROW')) {
        nextDate = new Date(inquiryDate);
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (remarkUpper.includes('2ND NOV')) {
        nextDate = new Date(2026, 10, 2);
      } else if (remarkUpper.includes('MONDAY') || callUpper.includes('MONDAY')) {
        nextDate = new Date(2026, 10, 2);
      } else if (callUpper.includes('AFTER DIWALI')) {
        nextDate = new Date(2026, 10, 5);
      }

      followups.push({
        date: inquiryDate,
        status: followupStatus,
        remarks: combinedRemarks.trim() || 'Initial counseling followup',
        nextFollowupDate: nextDate,
        recordedBy: takenBy && takenBy !== '-' ? takenBy : 'Admin',
      });
    }

    // Upsert or create
    const existing = await Inquiry.findOne({ contactNo: contact.trim() });
    if (existing) {
      existing.studentName = name.trim();
      existing.collegeName = college && college !== '-' ? college.trim() : existing.collegeName;
      existing.interestedDomain = domain;
      existing.reference = cleanRef;
      existing.referenceDetails = cleanRefDetails;
      existing.notes = notes || existing.notes;
      existing.status = status;
      if (followups.length > 0) {
        existing.followups = followups;
      }
      await existing.save();
      console.log(`Updated inquiry: ${name} (${contact})`);
    } else {
      const newInquiry = new Inquiry({
        studentName: name.trim(),
        contactNo: contact.trim(),
        collegeName: college && college !== '-' ? college.trim() : '',
        degree: 'BCA / B.Tech / VVWU',
        semester: '6th Semester',
        interestedDomain: domain,
        reference: cleanRef,
        referenceDetails: cleanRefDetails,
        notes: notes,
        status: status,
        inquiryDate: inquiryDate,
        followups: followups,
      });
      await newInquiry.save();
      console.log(`Added inquiry: ${name} (${contact}) with ${followups.length} followup(s)`);
    }

    importedCount++;
  }

  console.log(`\n🎉 Successfully imported/updated ${importedCount} records into MongoDB!`);
  process.exit(0);
}

importRecords().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
