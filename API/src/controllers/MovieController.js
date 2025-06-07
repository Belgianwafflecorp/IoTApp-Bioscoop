// MovieController.js - Combines database operations and TMDB API interactions for movies

import db from '../db.js';
import fetch from 'node-fetch'; // Required for TMDB API calls

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // You can change size if needed






// --- Database Operations ---

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

// POST /movies - nieuwe film toevoegen
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

// PATCH /movies/:id - film bijwerken
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

// DELETE /movies/:id - film verwijderen
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









// --- TMDB API Operations ---

// GET /movies/tmdb - Get popular movies from TMDB
const getMoviesTMDB = async (req, res) => {
    if (!TMDB_API_KEY) {
        return res.status(500).json({ 
            error: 'TMDB API key not configured on server' 
        });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const { results } = await response.json();

        const moviesWithPosters = results.map(movie => ({
            ...movie,
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null
        }));

        res.json(moviesWithPosters);

    } catch (error) {
        console.error('TMDB fetch error:', error);
        res.status(error.status || 500).json({
            error: error.message || 'Failed to fetch movies'
        });
    }
};

// GET /movies/tmdb/search - Search movies from TMDB using title
const searchMoviesTMDB = async (req, res) => {
    const { title } = req.query;

    if (!TMDB_API_KEY) {
        return res.status(500).json({
            error: 'TMDB API key not configured on server'
        });
    }

    if (!title) {
        return res.status(400).json({
            error: 'Missing "title" query parameter'
        });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&include_adult=true&language=en-US&page=1`
        );

        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const { results } = await response.json();

        const moviesWithPosters = results.map(movie => ({
            ...movie,
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null
        }));

        res.json(moviesWithPosters);

    } catch (error) {
        console.error('TMDB fetch error:', error);
        res.status(error.status || 500).json({
            error: error.message || 'Failed to search movies'
        });
    }
};

// GET /movies/tmdb/:id - Get movie details from TMDB using TMDB movie ID
const getMovieDetailsTMDB = async (req, res) => {
    const { id } = req.params;

    if (!TMDB_API_KEY) {
        return res.status(500).json({ 
            error: 'TMDB API key not configured on server' 
        });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        const movieWithPoster = {
            ...data,
            poster_url: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : null
        };

        res.json(movieWithPoster);

    } catch (error) {
        console.error('TMDB fetch error:', error);
        res.status(error.status || 500).json({
            error: error.message || 'Failed to fetch movie details'
        });
    }
};

// GET /movies/tmdb/genres - Get genre list from TMDB
const getTMDBGenres = async (req, res) => {
    if (!TMDB_API_KEY) {
        return res.status(500).json({ error: 'TMDB API key not configured on server' });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
        );

        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        res.json(data.genres);

    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to fetch genres from TMDB' });
    }
};

const getMovieByTitleTMDB = async (req, res) => {
    const titleQuery = req.params.title.toLowerCase();
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(titleQuery)}`
        );
        if (!response.ok) throw new Error('TMDB search failed');

        const { results } = await response.json();
        if (!results.length) return res.status(404).json({ error: 'Movie not found' });

        // Try to find best matching movie by title (case insensitive)
        let movie = results.find(m => 
            m.title.toLowerCase() === titleQuery || m.original_title.toLowerCase() === titleQuery
        );

        // If no exact match, fallback to first result
        if (!movie) movie = results[0];

        res.json({
            ...movie,
            poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /movies/tmdb/:id/videos - Fetch trailers for a movie
const getMovieVideosTMDB = async (req, res) => {
    const { id } = req.params;

    if (!TMDB_API_KEY) {
        return res.status(500).json({ error: 'TMDB API key not configured on server' });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        // Filter for official YouTube trailers
        const trailers = data.results.filter(
            v => v.type === 'Trailer' && v.site === 'YouTube'
        );

        res.json(trailers);

    } catch (err) {
        console.error('Video fetch error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch trailers' });
    }
};

// GET /movies/tmdb/:id/credits - Fetch cast and crew for a movie
const getMovieCreditsTMDB = async (req, res) => {
    const { id } = req.params;

    if (!TMDB_API_KEY) {
        return res.status(500).json({ error: 'TMDB API key not configured on server' });
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) {
            const error = new Error(`TMDB API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error('Credits fetch error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch credits' });
    }
};

export {
    getAllMovies,
    getMovieById,
    addMovie,
    editMovie,
    deleteMovie,
    getMoviesTMDB,
    searchMoviesTMDB,
    getMovieDetailsTMDB,
    getTMDBGenres,
    getMovieByTitleTMDB,
    getMovieVideosTMDB,
    getMovieCreditsTMDB
};