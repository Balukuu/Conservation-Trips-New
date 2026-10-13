'use strict';

/*
 * Outgoing enquiry email. Configure with SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS (and optionally CONTACT_EMAIL for the recipient) in .env.
 */

const nodemailer = require('nodemailer');

const FALLBACK_RECIPIENT = 'info@tripsandadventures.co.ug';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_USER !== 'your@email.com');
}

// Built once and reused: a transport holds the connection settings, so creating
// one per request would just repeat the setup (and any TLS handshake) every time.
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465; STARTTLS upgrade otherwise
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

/**
 * rows: [[label, value], …] — values are plain text; they're escaped here.
 * Resolves when the message was accepted by the SMTP server.
 */
async function sendEnquiry({ subject, fromName, replyTo, rows }) {
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;padding:20px;border:1px solid #eee">' +
    '<h2 style="color:#2D6A2D;margin:0 0 16px">New safari enquiry</h2>' +
    '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">' +
    rows.map(([label, value]) =>
      '<tr>' +
      `<td style="vertical-align:top;color:#555;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td>` +
      `<td style="white-space:pre-wrap">${escapeHtml(value)}</td>` +
      '</tr>'
    ).join('') +
    '</table></div>';

  await getTransporter().sendMail({
    // Send from the authenticated mailbox (providers reject other senders) and
    // let "Reply" go to the customer.
    from: { name: fromName, address: process.env.SMTP_USER },
    replyTo,
    to: process.env.CONTACT_EMAIL || FALLBACK_RECIPIENT,
    subject,
    text,
    html
  });
}

module.exports = { isConfigured, sendEnquiry, escapeHtml, FALLBACK_RECIPIENT };
