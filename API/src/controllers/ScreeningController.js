import db from '../db.js';

// GET /screenings - geplande voorstellingen ophalen
const getAllScreenings = async (req, res) => {
    try {
        const [screenings] = await db.execute(`
            SELECT 
                s.screening_id,
                m.title AS movie_title,
                m.duration_minutes,
                h.name AS hall_name,
                s.start_time
            FROM screenings s
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN halls h ON s.hall_id = h.hall_id
            ORDER BY s.start_time ASC
        `);
        res.json(screenings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /screenings/:id - get screening details by ID including movie info
const getScreeningById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`
      SELECT 
        s.screening_id,
        s.start_time,
        m.movie_id,
        m.title,
        m.genre,
        m.duration_minutes AS duration
      FROM screenings s
      JOIN movies m ON s.movie_id = m.movie_id
      WHERE s.screening_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Screening not found' });
    }

    // Format movie nested object to match frontend expectations
    const screening = rows[0];
    const screeningData = {
      screening_id: screening.screening_id,
      start_time: screening.start_time,
      movie: {
        movie_id: screening.movie_id,
        title: screening.title,
        genre: screening.genre,
        duration: screening.duration,
      }
    };

    res.json(screeningData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// POST /screenings - nieuwe voorstelling aanmaken
const createScreenings = async (req, res) => {
    try {
        const { movie_id, hall_id, start_time } = req.body;
        const [result] = await db.execute(
            'INSERT INTO screenings (movie_id, hall_id, start_time) VALUES (?, ?, ?)',
            [movie_id, hall_id, start_time]
        );
        res.status(201).json({ message: 'Voorstelling aangemaakt', screening_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /screenings/:id - voorstelling aanpassen
const updateScreenings = async (req, res) => {
    try {
        const { id } = req.params;
        const { movie_id, hall_id, start_time } = req.body;

        await db.execute(
            'UPDATE screenings SET movie_id = ?, hall_id = ?, start_time = ? WHERE screening_id = ?',
            [movie_id, hall_id, start_time, id]
        );

        res.json({ message: 'Voorstelling bijgewerkt' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /screenings/:id - voorstelling verwijderen
const deleteScreenings = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM screenings WHERE screening_id = ?', [id]);
        res.json({ message: 'Voorstelling verwijderd' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export {
    getAllScreenings,
    getScreeningById,
    createScreenings,
    updateScreenings,
    deleteScreenings
};
