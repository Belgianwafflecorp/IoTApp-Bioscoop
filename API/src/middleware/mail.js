// mail.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

export async function sendReservationEmail(toEmail, reservationDetails) {
  const { movie, datetime, hall, seats, qrCodeDataUrl, bookingUrl } = reservationDetails;

  const mailOptions = {
    from: `"Cinema Booking" <${process.env.GMAIL_USER}>`,
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
      <img src="${qrCodeDataUrl}" alt="QR Code" />
      <p>Or <a href="${bookingUrl}">click here to view your reservation online</a>.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reservation email sent to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
