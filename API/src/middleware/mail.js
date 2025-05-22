// mail.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  }
});

export async function sendReservationEmail(toEmail, reservationDetails) {
  const mailOptions = {
    from: '"Cinema Booking" <no-reply@cinema.com>',
    to: toEmail,
    subject: 'Your Reservation Confirmation',
    html: `
      <h2>Reservation Confirmed</h2>
      <p>Thank you for your reservation. Here are the details:</p>
      <ul>
        <li><strong>Movie:</strong> ${reservationDetails.movie}</li>
        <li><strong>Date & Time:</strong> ${reservationDetails.datetime}</li>
        <li><strong>Hall:</strong> ${reservationDetails.hall}</li>
        <li><strong>Seats:</strong> ${reservationDetails.seats.join(', ')}</li>
      </ul>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reservation email sent to ${toEmail}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
