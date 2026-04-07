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

// POST booking form
router.post('/booking', (req, res) => {
  const { firstName, lastName, email, phone, country, safari_type, duration_range, travel_month, travel_year, group_size, destinations, accommodation, requirements } = req.body;
  
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
  console.log('Country:', country);
  console.log('Safari Type:', safari_type);
  console.log('Duration:', duration_range, 'days');
  console.log('Travel:', travel_month, travel_year);
  console.log('Group Size:', group_size);
  console.log('Destinations:', destinations);
  console.log('Accommodation:', accommodation);
  console.log('Requirements:', requirements);
  console.log('---\n');

  res.json({ 
    success: true, 
    firstName,
    message: `Thank you, ${firstName}! Your safari enquiry has been received. Our team will contact you within 24 hours to craft your perfect Uganda adventure.`
  });
});

module.exports = router;
