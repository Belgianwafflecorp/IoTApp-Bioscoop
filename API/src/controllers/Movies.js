const TMDB_API_KEY = process.env.TMDB_API_KEY;


// GET / get popular movies from TMDB
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
    res.json(results);

  } catch (error) {
    console.error('TMDB fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch movies'
    });
  }
};

const searchMovies = async (req, res) => {
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
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&include_adult=true&language=en-US&page=1`
    );

    if (!response.ok) {
      const error = new Error(`TMDB API error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    const { results } = await response.json();
    res.json(results);

  } catch (error) {
    console.error('TMDB fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to search movies'
    });
  }
};

const getMovieDetails = async (req, res) => {
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
    res.json(data);

  } catch (error) {
    console.error('TMDB fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch movie details'
    });
  }
};

export default {
  getMovies,
  searchMovies,
  getMovieDetails
};
