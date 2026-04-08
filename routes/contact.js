const express = require('express');
const router = express.Router();
const tours = require('../data/tours.json');

// GET contact page
router.get('/', (req, res) => {
  res.render('contact', {
    meta: {
      title: 'Contact & Book | Conservation Trips & Adventures Uganda',
      description: 'Plan your Uganda safari with Conservation Trips & Adventures. Contact us for custom itineraries, gorilla permits, booking enquiries. We respond within 24 hours.',
      keywords: 'contact Conservation Trips Adventures, safari booking Uganda, gorilla permit booking, custom safari enquiry',
      ogImage: '/images/safari.png',
      ogUrl: 'https://tripsandadventures.co.ug/contact'
    },
    tours
  });
});

// POST contact form
router.post('/', (req, res) => {
  const { name, email, phone, message, safari_type, duration, travel_date, group_size } = req.body;
  
  console.log('\n📩 New Contact Form Submission:');
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Phone:', phone);
  console.log('Safari Type:', safari_type);
  console.log('Duration:', duration);
  console.log('Travel Date:', travel_date);
  console.log('Group Size:', group_size);
  console.log('Message:', message);
  console.log('---\n');

  // Optional nodemailer setup (uncomment and configure .env):
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  transporter.sendMail({
    from: email,
    to: process.env.CONTACT_EMAIL,
    subject: `Safari Enquiry from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
  });
  */

  res.json({ 
    success: true, 
    message: `Thank you ${name}! We've received your enquiry and will be in touch within 24 hours.` 
  });
});

const nodemailer = require('nodemailer');

// POST booking form
router.post('/booking', async (req, res) => {
  const { 
    firstName, lastName, email, phone, country, 
    safari_type, duration_range, travel_month, travel_year, 
    group_size, destinations, accommodation, requirements 
  } = req.body;
  
  // Basic validation
  if (!firstName || !email || !safari_type) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  console.log('\n🦍 New Booking Enquiry:');
  console.log('Name:', firstName, lastName);
  console.log('Email:', email);
  console.log('Phone:', phone);
  console.log('--- Details ---\n');

  try {
    // 1. Configure the transporter
    // SMTP credentials must be set in .env
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // 2. Format the email content
    const destString = Array.isArray(destinations) ? destinations.join(', ') : destinations;
    
    const mailOptions = {
      from: `"${firstName} ${lastName}" <${process.env.SMTP_USER}>`, // Recommended to send from your authenticated user
      replyTo: email,
      to: process.env.CONTACT_EMAIL || 'info@tripsandadventures.co.ug',
      subject: `New Safari Enquiry: ${safari_type} from ${firstName} ${lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #2D6A2D;">New Safari Enquiry 🦍</h2>
          <p><strong>Customer:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Country:</strong> ${country || 'Not provided'}</p>
          <hr>
          <h3 style="color: #2D6A2D;">Trip Details</h3>
          <p><strong>Safari Type:</strong> ${safari_type}</p>
          <p><strong>Duration:</strong> ${duration_range || 'Not specified'}</p>
          <p><strong>Travel Date:</strong> ${travel_month} ${travel_year}</p>
          <p><strong>Group Size:</strong> ${group_size}</p>
          <p><strong>Preferred Destinations:</strong> ${destString || 'None selected'}</p>
          <p><strong>Accommodation:</strong> ${accommodation || 'No preference'}</p>
          <hr>
          <h3 style="color: #2D6A2D;">Additional Info</h3>
          <p>${requirements || 'No special requirements noted.'}</p>
        </div>
      `
    };

    // 3. Send the email
    // Note: In development without real credentials, this will fail.
    // I'll wrap it so it still "succeeds" for the user experience in Dev, but logs the error.
    if (process.env.NODE_ENV === 'production' || (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your@email.com')) {
      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully.');
    } else {
      console.log('⚠️  Email skipped (Development mode or missing SMTP credentials)');
    }

    res.json({ 
      success: true, 
      firstName,
      message: `Thank you, ${firstName}! Your safari enquiry has been received. Our team will contact you within 24 hours to craft your perfect Uganda adventure.`
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Still return success if it's the server's fault (to keep customer UX), or return error.
    // Given the user's "Failed to send" issue, they probably WANT to know if the email failed.
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send enquiry. Please contact us directly at info@tripsandadventures.co.ug' 
    });
  }
});

module.exports = router;
