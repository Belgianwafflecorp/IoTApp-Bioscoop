import db from '../db.js';

async function checkOverlap(db, hall_id, startTime, movieDuration, screeningIdToExclude = null) {
    const newScreeningStart = new Date(startTime); // This will parse ISO string (e.g., '2025-06-06T08:00:00.000Z') correctly as UTC
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
        // Append 'Z' to treat the retrieved MySQL DATETIME string as UTC
        const existingStart = new Date(existing.start_time + 'Z'); 
        const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60 * 1000);

        if (newScreeningStart < existingEnd && newScreeningEnd > existingStart) {
            return true; // Overlap detected
        }
    }
    return false; // No overlap
}

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

const createScreenings = async (req, res) => {
    try {
        const { movie_id, hall_id, start_time } = req.body; // start_time will be 'YYYY-MM-DDTHH:MM:SS.sssZ' (UTC ISO string)

        // Convert the ISO 8601 UTC string to MySQL's DATETIME format (YYYY-MM-DD HH:MM:SS) while preserving UTC.
        const dateObjUTC = new Date(start_time);
        const mysqlCompatibleUTC = dateObjUTC.toISOString().slice(0, 19).replace('T', ' ');

        const [movieResult] = await db.query('SELECT duration_minutes FROM movies WHERE movie_id = ?', [movie_id]);
        if (movieResult.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const movieDuration = movieResult[0].duration_minutes;

        // Pass the original UTC string for consistency in overlap check
        const hasOverlap = await checkOverlap(db, hall_id, start_time, movieDuration); 
        if (hasOverlap) {
            return res.status(409).json({ error: 'Screening overlaps with an existing screening in the same hall.' });
        }

        const [result] = await db.execute(
            'INSERT INTO screenings (movie_id, hall_id, start_time) VALUES (?, ?, ?)',
            [movie_id, hall_id, mysqlCompatibleUTC] // Use the formatted UTC string here
        );
        res.status(201).json({ message: 'Voorstelling aangemaakt', screening_id: result.insertId });
    } catch (error) {
        console.error('Failed to create screening:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateScreenings = async (req, res) => {
    const { id } = req.params;
    const { hall_id, start_time, movie_id } = req.body; // start_time will be 'YYYY-MM-DDTHH:MM:SS.sssZ' (UTC ISO string)

    if (!hall_id || !start_time || !movie_id) {
        return res.status(400).json({ error: 'hall_id, start_time, and movie_id are required' });
    }

    try {
        // Convert the ISO 8601 UTC string to MySQL's DATETIME format
        const dateObjUTC = new Date(start_time);
        const mysqlCompatibleUTC = dateObjUTC.toISOString().slice(0, 19).replace('T', ' ');

        const [movieResult] = await db.query('SELECT duration_minutes FROM movies WHERE movie_id = ?', [movie_id]);
        if (movieResult.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const movieDuration = movieResult[0].duration_minutes;

        // Pass the original UTC string for consistency in overlap check
        const hasOverlap = await checkOverlap(db, hall_id, start_time, movieDuration, id);
        if (hasOverlap) {
            return res.status(409).json({ error: 'Screening overlaps with an existing screening in the same hall.' });
        }

        const [result] = await db.query(
            `UPDATE screenings SET hall_id = ?, start_time = ? WHERE screening_id = ?`,
            [hall_id, mysqlCompatibleUTC, id] // Use the formatted UTC string here
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