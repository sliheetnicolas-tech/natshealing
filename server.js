const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;

// SMTP config — uses Gmail App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || '4natshealing@gmail.com',
    pass: process.env.SMTP_PASS || ''
  }
});

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function handleBooking(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { sessionType, firstName, lastName, email, phone, message, preferredDays, timePreference, paymentMethod } = data;

      // Email to Nat
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2d2d2d; color: #d4a574; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Session Booking Request</h1>
          </div>
          <div style="padding: 24px; background: #fff;">
            <h2 style="color: #d4a574; border-bottom: 2px solid #f0ebe5; padding-bottom: 8px;">Session Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #666;">Session Type:</td><td style="padding: 8px 0;">${sessionType}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Method:</td><td style="padding: 8px 0;">${paymentMethod}</td></tr>
            </table>

            <h2 style="color: #d4a574; border-bottom: 2px solid #f0ebe5; padding-bottom: 8px; margin-top: 24px;">Client Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #666;">Name:</td><td style="padding: 8px 0;">${firstName} ${lastName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td><td style="padding: 8px 0;">${phone || 'Not provided'}</td></tr>
            </table>

            <h2 style="color: #d4a574; border-bottom: 2px solid #f0ebe5; padding-bottom: 8px; margin-top: 24px;">Schedule Preferences</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #666;">Preferred Days:</td><td style="padding: 8px 0;">${preferredDays}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #666;">Time of Day:</td><td style="padding: 8px 0;">${timePreference}</td></tr>
            </table>

            ${message ? `
            <h2 style="color: #d4a574; border-bottom: 2px solid #f0ebe5; padding-bottom: 8px; margin-top: 24px;">Client Message</h2>
            <p style="background: #faf9f7; padding: 16px; border-radius: 8px; line-height: 1.6; color: #444;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            ` : ''}
          </div>
          <div style="background: #f5f3f0; padding: 16px; text-align: center; font-size: 13px; color: #999;">
            Sent from natshealing.com booking form
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Nat's Healing Website" <${process.env.SMTP_USER || '4natshealing@gmail.com'}>`,
        to: '4natshealing@gmail.com',
        replyTo: email,
        subject: `New Booking: ${sessionType} — ${firstName} ${lastName}`,
        html: emailHtml
      });

      // Confirmation email to client
      const confirmHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2d2d2d; color: #d4a574; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Booking Request Received ✨</h1>
          </div>
          <div style="padding: 24px; background: #fff; line-height: 1.7;">
            <p>Hi ${firstName},</p>
            <p>Thank you for booking a <strong>${sessionType}</strong> with Nat's Healing!</p>
            <p>Here's what happens next:</p>
            <ol style="padding-left: 20px;">
              <li>Nat will review your request and reach out within 24 hours</li>
              <li>You'll receive a confirmed session time that works for both of you</li>
              <li>Payment details for <strong>${paymentMethod}</strong> will be included in the confirmation</li>
              <li>A Zoom link will be sent before your session</li>
            </ol>
            <p>If you have any questions, just reply to this email.</p>
            <p style="margin-top: 24px;">Warmly,<br><strong>Nat's Healing</strong></p>
          </div>
          <div style="background: #f5f3f0; padding: 16px; text-align: center; font-size: 13px; color: #999;">
            natshealing.com — Reprogram. Restore. Reclaim.
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Nat's Healing" <${process.env.SMTP_USER || '4natshealing@gmail.com'}>`,
        to: email,
        subject: `Your Booking Request — Nat's Healing`,
        html: confirmHtml
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      console.log(`✅ Booking: ${sessionType} from ${firstName} ${lastName} (${email})`);

    } catch (err) {
      console.error('❌ Booking error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to process booking' }));
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/book') {
    handleBooking(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`🌿 Nat's Healing server running on port ${PORT}`);
});
