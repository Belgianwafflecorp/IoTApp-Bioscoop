import db from '../db.js';

// GET /movies - lijst van films
const getAllMovies = async (req, res) => {
    try {
        const [movies] = await db.execute('SELECT * FROM movies');
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /movies/:id - detail van één film
const getMovieById = async (req, res) => {
    try {
        const { id } = req.params;
        const [movie] = await db.execute('SELECT * FROM movies WHERE movie_id = ?', [id]);

        if (movie.length === 0) {
            return res.status(404).json({ error: 'Film niet gevonden' });
        }

        res.json(movie[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addMovie = async (req, res) => {
    try {
        const { title, description, duration_minutes, genre } = req.body;

        if (!title || !duration_minutes) {
            return res.status(400).json({ error: 'Title en duration velden zijn verplicht' });
        }

        const [result] = await db.execute('INSERT INTO movies (title, description, duration_minutes, genre) VALUES (?, ?, ?, ?)', [title, description, duration_minutes, genre]);

        res.status(201).json({ id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const editMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, duration_minutes, genre } = req.body;
        // Dynamic SQL for PATCH-like behavior 
        const fields = [];
        const params = [];
        if (title !== undefined) {
            fields.push('title = ?');
            params.push(title);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            params.push(description);
        }
        if (duration_minutes !== undefined) {
            fields.push('duration_minutes = ?');
            params.push(duration_minutes);
        }
        if (genre !== undefined) {
            fields.push('genre = ?');
            params.push(genre);
        }
        if (!fields.length) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        params.push(id);

        const [result] = await db.execute(
            `UPDATE movies SET ${fields.join(', ')} WHERE movie_id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Film niet gevonden' });
        }

        res.status(200).json({ message: 'Film succesvol bijgewerkt' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deleteMovie = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete movie from database
        const [result] = await db.execute('DELETE FROM movies WHERE movie_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Film niet gevonden' });
        }

        res.status(200).json({ message: 'Film succesvol verwijderd' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    getAllMovies,
    getMovieById,
    addMovie,
    editMovie,
    deleteMovie,
};
