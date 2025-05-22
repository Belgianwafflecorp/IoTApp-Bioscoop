import db from '../db.js';
import setupWebSocket from '../middleware/websocket.js';
import { sendReservationEmail } from '../middleware/mail.js';
import QRCode from 'qrcode';


// POST /reserve - reserve seats
const reserveTickets = async (req, res) => {
  try {
    const user_id = req.user.userId;
    const { screening_id, seat_ids } = req.body;

    if (!user_id || !screening_id || !Array.isArray(seat_ids)) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    // Insert reservations
    const values = seat_ids.map(seat_id => [user_id, screening_id, seat_id]);
    await db.query(
      'INSERT INTO reservations (user_id, screening_id, seat_id) VALUES ?',
      [values]
    );

    // WebSocket update
    const [allSeats] = await db.execute(`
      SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type
      FROM screenings sc
      JOIN halls h ON sc.hall_id = h.hall_id
      JOIN seats s ON h.hall_id = s.hall_id
      WHERE sc.screening_id = ?
    `, [screening_id]);

    const [takenSeats] = await db.execute(`
      SELECT seat_id FROM reservations WHERE screening_id = ?
    `, [screening_id]);

    const takenSeatIds = new Set(takenSeats.map(row => row.seat_id));
    const updatedSeatData = allSeats.map(seat => ({
      ...seat,
      isTaken: takenSeatIds.has(seat.seat_id)
    }));

    setupWebSocket.broadcastUpdate(screening_id, updatedSeatData);

    // Get latest reservation_id
    const [newReservations] = await db.execute(`
      SELECT reservation_id
      FROM reservations
      WHERE user_id = ? AND screening_id = ?
      ORDER BY reservation_id DESC LIMIT 1
    `, [user_id, screening_id]);
    const latestReservationId = newReservations[0]?.reservation_id;

    // Fetch user details
    const [[user]] = await db.execute(
      'SELECT email, username FROM users WHERE user_id = ?',
      [user_id]
    );
    const userEmail = user?.email;
    const username = user?.username || 'Unknown User';

    // Fetch screening info
    const [[screeningInfo]] = await db.execute(`
      SELECT 
        m.title AS movie, 
        sc.start_time AS datetime,
        h.name AS hall
      FROM screenings sc
      JOIN movies m ON sc.movie_id = m.movie_id
      JOIN halls h ON sc.hall_id = h.hall_id
      WHERE sc.screening_id = ?
    `, [screening_id]);

    // Fetch seat labels
    const placeholders = seat_ids.map(() => '?').join(',');
    const [seatData] = await db.execute(`
      SELECT seat_row, seat_number
      FROM seats
      WHERE seat_id IN (${placeholders})
    `, seat_ids);

    const formattedSeats = seatData.map(seat => `${seat.seat_row}${seat.seat_number}`);

    // Build rich QR payload
    const reservationDetails = {
      reservation_id: latestReservationId,
      username,
      movie: screeningInfo.movie,
      datetime: new Date(screeningInfo.datetime).toLocaleString(),
      hall: screeningInfo.hall,
      seats: formattedSeats
    };

    const qrPayload = JSON.stringify(reservationDetails);
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    // Send email (if user has email)
    if (userEmail) {
      await sendReservationEmail(userEmail, {
        ...reservationDetails,
        qrCodeDataUrl
      });
    } else {
      console.warn('User email not found, skipping email send.');
    }

    res.status(201).json({ message: 'Tickets reserved successfully' });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'One or more seats already reserved' });
    }
    console.error('Reservation error:', error);
    res.status(500).json({ error: error.message });
  }
};


// GET /my-reservations - Get all reservations for the logged-in user
const getMyReservations = async (req, res) => {
  try {
    const user_id = req.user.userId;

    const [reservations] = await db.execute(`
      SELECT 
        r.reservation_id,
        r.screening_id,
        r.seat_id,
        s.seat_row,
        s.seat_number,
        sc.start_time,
        m.title AS movie_title
      FROM reservations r
      JOIN seats s ON r.seat_id = s.seat_id
      JOIN screenings sc ON r.screening_id = sc.screening_id
      JOIN movies m ON sc.movie_id = m.movie_id
      WHERE r.user_id = ?
      ORDER BY sc.start_time DESC
    `, [user_id]);

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /screenings/:id/tickets - fetch available and taken seats
const getTicketsForScreening = async (req, res) => {
  try {
    const { id } = req.params;

    const [allSeats] = await db.execute(`
      SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type
      FROM screenings sc
      JOIN halls h ON sc.hall_id = h.hall_id
      JOIN seats s ON h.hall_id = s.hall_id
      WHERE sc.screening_id = ?
    `, [id]);

    const [takenSeats] = await db.execute(`
      SELECT seat_id
      FROM reservations
      WHERE screening_id = ?
    `, [id]);

    const takenSeatIds = new Set(takenSeats.map(row => row.seat_id));
    const seats = allSeats.map(seat => ({
      ...seat,
      isTaken: takenSeatIds.has(seat.seat_id)
    }));

    res.json(seats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export {
  reserveTickets,
  getMyReservations,
  getTicketsForScreening
};
