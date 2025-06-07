// Movies.js - Controller for movie-related API endpoints

import fetch from 'node-fetch'; // Add this at the top if not present

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // You can change size if needed

// GET / - Get popular movies from TMDB
export const getMovies = async (req, res) => {
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

// GET /search - Search movies from TMDB using title
export const searchMovies = async (req, res) => {
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

// GET /:id - Get movie details from TMDB using TMDB movie ID
export const getMovieDetails = async (req, res) => {
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

// GET /genres - Get genre list from TMDB
export const getTMDBGenres = async (req, res) => {
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

export const getMovieByTitle = async (req, res) => {
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

// GET /:id/videos - Fetch trailers for a movie
export const getMovieVideos = async (req, res) => {
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

// GET /:id/credits - Fetch cast and crew for a movie
export const getMovieCredits = async (req, res) => {
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