// mail.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
});

export async function sendReservationEmail(toEmail, reservationDetails) {
  const { movie, datetime, hall, seats, qrCodeDataUrl } = reservationDetails;

  // Define a unique content ID for the QR code image
  const qrCodeCid = 'qrcode@cinema.com'; // Use any unique string you like

  const mailOptions = {
    from: '"Cinema Booking" <olivierwesterman@gmail.com>',
    to: toEmail,
    subject: 'Your Reservation Confirmation',
    html: `
      <h2>Reservation Confirmed</h2>
      <p>Thank you for your reservation. Here are the details:</p>
      <ul>
        <li><strong>Movie:</strong> ${movie}</li>
        <li><strong>Date & Time:</strong> ${datetime}</li>
        <li><strong>Hall:</strong> ${hall}</li>
        <li><strong>Seats:</strong> ${seats.join(', ')}</li>
      </ul>
      <p>Please present this QR code at the entrance:</p>
      <img src="cid:${qrCodeCid}" alt="QR Code" width="200" height="200"/>
    `, // IMPORTANT: src="cid:..."
    attachments: [
      {
        filename: 'qrcode.png', // The name of the file
        content: qrCodeDataUrl.split('base64,')[1], // Extract base64 data without the 'data:image/png;base64,' part
        encoding: 'base64', // Specify that the content is base64 encoded
        cid: qrCodeCid, // Link this attachment to the img tag in HTML using its cid
        contentType: 'image/png' // Specify the content type
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reservation email sent to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}