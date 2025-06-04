import db from '../db.js';

// Helper function to check for overlaps
async function checkOverlap(db, hall_id, startTime, movieDuration, screeningIdToExclude = null) {
  const newScreeningStart = new Date(startTime);
  const newScreeningEnd = new Date(newScreeningStart.getTime() + movieDuration * 60 * 1000);

  const [existingScreenings] = await db.query(
    `SELECT s.screening_id, s.start_time, m.duration_minutes
     FROM screenings s
     JOIN movies m ON s.movie_id = m.movie_id
     WHERE s.hall_id = ?`,
    [hall_id]
  );

  for (const existing of existingScreenings) {
    if (screeningIdToExclude && existing.screening_id === screeningIdToExclude) {
      continue;
    }
    const existingStart = new Date(existing.start_time);
    const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60 * 1000);

    if (newScreeningStart < existingEnd && newScreeningEnd > existingStart) {
      return true; // Overlap detected
    }
  }
  return false; // No overlap
}

// GET /screenings - geplande voorstellingen ophalen
const getAllScreenings = async (req, res) => {
    try {
      const [screenings] = await db.execute(`
          SELECT 
            s.screening_id,
            m.title AS movie_title,
            m.duration_minutes,
            h.name AS hall_name,
            s.hall_id,
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

      // Get movie duration
      const [movieResult] = await db.query('SELECT duration_minutes FROM movies WHERE movie_id = ?', [movie_id]);
      if (movieResult.length === 0) {
        return res.status(404).json({ error: 'Movie not found' });
      }
      const movieDuration = movieResult[0].duration_minutes;

      // Check for overlap before creating
      const hasOverlap = await checkOverlap(db, hall_id, start_time, movieDuration);
      if (hasOverlap) {
        return res.status(409).json({ error: 'Screening overlaps with an existing screening in the same hall.' });
      }

      const [result] = await db.execute(
        'INSERT INTO screenings (movie_id, hall_id, start_time) VALUES (?, ?, ?)',
        [movie_id, hall_id, start_time]
      );
      res.status(201).json({ message: 'Voorstelling aangemaakt', screening_id: result.insertId });
    } catch (error) {
      console.error('Failed to create screening:', error);
      res.status(500).json({ error: error.message });
    }
};

// PUT /screenings/:id - voorstelling aanpassen
const updateScreenings = async (req, res) => {
  const { id } = req.params;
  const { hall_id, start_time, movie_id } = req.body; // Ensure movie_id is included

  if (!hall_id || !start_time || !movie_id) {
    return res.status(400).json({ error: 'hall_id, start_time, and movie_id are required' });
  }

  try {
    // Get movie duration
    const [movieResult] = await db.query('SELECT duration_minutes FROM movies WHERE movie_id = ?', [movie_id]);
    if (movieResult.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    const movieDuration = movieResult[0].duration_minutes;

    // Check for overlap before updating
    const hasOverlap = await checkOverlap(db, hall_id, start_time, movieDuration, id);
    if (hasOverlap) {
      return res.status(409).json({ error: 'Screening overlaps with an existing screening in the same hall.' });
    }

    const [result] = await db.query(
      `UPDATE screenings SET hall_id = ?, start_time = ? WHERE screening_id = ?`,
      [hall_id, start_time, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Screening not found' });
    }
    res.json({ message: 'Screening updated' });
  } catch (err) {
    console.error('Failed to update screening:', err);
    res.status(500).json({ error: 'Failed to update screening' });
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