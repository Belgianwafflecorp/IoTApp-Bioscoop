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

export {
    getAllMovies,
    getMovieById,
    
};
