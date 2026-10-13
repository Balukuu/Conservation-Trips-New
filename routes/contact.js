'use strict';

const express = require('express');
const pages = require('../lib/pages');
const mail = require('../lib/mail');
const rateLimit = require('../lib/rate-limit');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_FAILED = `We couldn't send your enquiry. Please contact us directly at ${mail.FALLBACK_RECIPIENT}`;

// Visitors can fix a typo and resubmit; a script can't hammer the mailbox.
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: 'Too many enquiries from your connection just now. Please wait a few minutes, or reach us by phone or WhatsApp.'
});

/* ─── Input hygiene ───
   Everything arriving here is untrusted. `line` is for single-line fields, and
   `block` for free text that may legitimately contain line breaks. Both coerce
   to a capped plain string; escaping for HTML happens where the email is built. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function coerce(value) {
  if (Array.isArray(value)) value = value.join(', ');
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
const line = (value, max = 120) => coerce(value).replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
const block = (value, max = 3000) => coerce(value).replace(CONTROL, '').trim().slice(0, max);
const orNone = (value, none = 'Not provided') => value || none;

/* ─── Enquiry builders: request body -> { error } | email description ─── */

// Multi-step form on /contact
function bookingEnquiry(body) {
  const firstName = line(body.firstName, 60);
  const lastName = line(body.lastName, 60);
  const email = line(body.email, 254);
  const safariType = line(body.safari_type, 60);

  if (!firstName || !email || !safariType) return { error: 'Please fill in all required fields.' };
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };

  const name = `${firstName} ${lastName}`.trim();
  const travelDate = [line(body.travel_month, 20), line(body.travel_year, 4)].filter(Boolean).join(' ');
  const destinations = (Array.isArray(body.destinations) ? body.destinations : [body.destinations])
    .slice(0, 12).map(d => line(d, 60)).filter(Boolean).join(', ');

  return {
    summary: `booking enquiry (${safariType})`,
    subject: `New Safari Enquiry: ${safariType} from ${name}`,
    fromName: name,
    replyTo: { name, address: email },
    rows: [
      ['Customer', name],
      ['Email', email],
      ['Phone', orNone(line(body.phone, 40))],
      ['Country', orNone(line(body.country, 80))],
      ['Safari type', safariType],
      ['Duration', orNone(line(body.duration_range, 40), 'Not specified')],
      ['Travel date', orNone(travelDate, 'Not specified')],
      ['Group size', orNone(line(body.group_size, 10), 'Not specified')],
      ['Preferred destinations', orNone(destinations, 'None selected')],
      ['Accommodation', orNone(line(body.accommodation, 40), 'No preference')],
      ['Heard about us via', orNone(line(body.heard, 60))],
      ['Special requirements', orNone(block(body.requirements), 'None noted')]
    ]
  };
}

// Sidebar form on each tour page
function quickEnquiry(body) {
  const name = line(body.name, 120);
  const email = line(body.email, 254);

  if (!name || !email) return { error: 'Please fill in all required fields.' };
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };

  const tour = line(body.tour, 160);

  return {
    summary: `tour enquiry (${tour || 'no tour named'})`,
    subject: `Tour enquiry: ${tour || 'Safari'} from ${name}`,
    fromName: name,
    replyTo: { name, address: email },
    rows: [
      ['Tour', orNone(tour, 'Not specified')],
      ['Customer', name],
      ['Email', email],
      ['Phone', orNone(line(body.phone, 40))],
      ['Travel date', orNone(line(body.travel_date, 20), 'Not specified')],
      ['Group size', orNone(line(body.group_size, 10), 'Not specified')],
      ['Special requests', orNone(block(body.message), 'None noted')]
    ]
  };
}

function deliver(build) {
  return async function handler(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const enquiry = build(body);

    if (enquiry.error) return res.status(400).json({ success: false, message: enquiry.error });

    if (!mail.isConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`Dropped ${enquiry.summary}: SMTP_HOST / SMTP_USER / SMTP_PASS are not set.`);
        return res.status(503).json({ success: false, message: SEND_FAILED });
      }
      // Local development: accept the form without sending, so the UI can be exercised.
      console.log(`⚠️  ${enquiry.summary} accepted but not emailed (SMTP not configured)`);
      return res.json({ success: true });
    }

    try {
      await mail.sendEnquiry(enquiry);
      res.json({ success: true });
    } catch (err) {
      console.error(`Could not email ${enquiry.summary}:`, err.message);
      res.status(500).json({ success: false, message: SEND_FAILED });
    }
  };
}

router.get('/', (req, res) => {
  res.render('contact', pages.contact());
});

router.post('/booking', limiter, deliver(bookingEnquiry));
// One URL for both forms, for static builds that point FORM_ENDPOINT at this
// server (both forms post to the same endpoint there). The booking form is the
// one that sends firstName / safari_type.
router.post('/submit', limiter, deliver(body =>
  body.firstName || body.safari_type ? bookingEnquiry(body) : quickEnquiry(body)
));
// "/" is the pre-existing path the tour-page form used; "/enquiry" is its proper
// name and what the front end posts to now (it sits under /contact/ so one
// proxy rule covers both forms).
router.post(['/enquiry', '/'], limiter, deliver(quickEnquiry));

module.exports = router;
