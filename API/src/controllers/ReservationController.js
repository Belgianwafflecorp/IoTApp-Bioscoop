import db from '../db.js';
import setupWebSocket from '../middleware/websocket.js';


// POST /reserve - reserve seats
const reserveTickets = async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { screening_id, seat_ids } = req.body;

        if (!user_id || !screening_id || !Array.isArray(seat_ids)) {
            return res.status(400).json({ error: 'Invalid request payload' });
        }

        const values = seat_ids.map(seat_id => [user_id, screening_id, seat_id]);
        await db.query(
            'INSERT INTO reservations (user_id, screening_id, seat_id) VALUES ?',
            [values]
        );

        res.status(201).json({ message: 'Tickets reserved successfully' });

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

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'One or more seats already reserved' });
        }
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
