//script.js

import { updateNavbarForRole } from './manager.js';

// ============================================================================
// Configuration and Global State
// ============================================================================

/** Base URL for all API endpoints */
const BASE_API_URL = `http://localhost:3000/api`;

/** Cache for all fetched movies with their TMDB data */
let allMovies = []; 

/** Map of genre IDs to genre names for quick lookup */
let genreMap = {};  

// ============================================================================
// API Health Check and Connection Management
// ============================================================================

/**
 * Checks if the API server is responding
 * @returns {Promise<boolean>} True if API is accessible, false otherwise
 */
async function checkApiStatus() {
  try {
    const res = await fetch(`${BASE_API_URL}/movies`);
    return res.ok;
  } catch (error) {
    console.error('API connection failed:', error);
  }
  return false;
}

/**
 * Waits for API to become available with exponential backoff
 * Attempts multiple connections before giving up
 * @throws {Error} When API remains unavailable after maximum attempts
 */
async function waitForApi() {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 2000; // 2 seconds between attempts

  while (attempts < maxAttempts) {
    if (await checkApiStatus()) return;
    attempts++;
    console.log(`API connection attempt ${attempts} failed, retrying in ${delay / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('API is not available after multiple attempts');
}

// ============================================================================
// Movie Rendering and Display Logic
// ============================================================================

/**
 * Renders a list of movies to the DOM with TMDB data enrichment
 * Each movie gets poster, title, overview, rating, and genre information
 * @param {Array} moviesToRender - Array of movie objects to display
 */
async function renderMovies(moviesToRender) {
  const $movieList = $('#movie-list');
  $movieList.empty(); // Clear existing content to prevent duplicates

  // Handle empty results gracefully
  if (moviesToRender.length === 0) {
    $movieList.html('<p>No movies found matching your criteria.</p>');
    return;
  }

  // Process each movie and create its card
  for (const movie of moviesToRender) {
    if (!movie.title) continue; // Skip movies without titles

    // Fetch enriched movie data from TMDB API
    const tmdbRes = await fetch(`${BASE_API_URL}/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
    const tmdbData = await tmdbRes.json();

    // Skip if no TMDB data available
    if (!Array.isArray(tmdbData) || !tmdbData[0]) continue;

    const tmdbMovie = tmdbData[0];
    const { title, overview, vote_average, poster_path, release_date, genre_ids, id: tmdbId } = tmdbMovie;

    // Convert genre IDs to readable genre names
    let genreText = 'Unknown';
    if (genre_ids && Array.isArray(genre_ids)) {
      const genreNames = $.map(genre_ids, function(id) {
        return genreMap[Number(id)] || null;
      }).filter(Boolean);
      genreText = genreNames.length > 0 ? genreNames.join(', ') : 'Unknown';
    }

    // Generate poster URL with fallback to placeholder
    const posterUrl = poster_path
      ? `https://image.tmdb.org/t/p/w500/${poster_path}`
      : './src/assets/placeholder.png';

    // Create movie card HTML with all necessary data attributes for filtering
    const $card = $(`
      <div class="movie-card" data-tmdb-id="${tmdbId}" data-local-title="${movie.title}" data-genre="${genreText}" data-score="${vote_average}">
        <img src="${posterUrl}" alt="${title}" class="movie-poster" />
        <div class="movie-info">
          <h3>${title.toUpperCase()}</h3>
          <p class="movie-overview">${overview ? overview.slice(0, 80) : 'No description available'}... 
            <a href="#" class="read-more-link">read more</a>
          </p>
          <div class="rating">⭐ ${vote_average ? vote_average.toFixed(1) : 'N/A'}</div>
        </div>
      </div>
    `);

    // Attach click handlers for expanding movie details
    $card.find('.read-more-link, .movie-poster').on('click', async function(e) {
      e.preventDefault();
      await expandMovieCard($card, tmdbId, title, posterUrl, genreText, release_date, overview);
    });

    $movieList.append($card);
  }
}

// ============================================================================
// Filtering and Sorting Logic
// ============================================================================

/**
 * Applies user-selected filters and sorting to the movie collection
 * Filters by genre and minimum score, then sorts by selected criteria
 */
function applyFiltersAndSort() {
  let filteredMovies = [...allMovies]; // Create copy to avoid mutating original

  // Get current filter values from UI
  const selectedGenre = $('#genre-filter').val();
  const selectedScore = parseFloat($('#score-filter').val());
  const selectedSort = $('#sort-filter').val();

  // Apply genre filter if selected
  if (selectedGenre) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData && movie.tmdbData[0];
      if (!tmdbMovie || !tmdbMovie.genre_ids) return false;
      
      // Convert genre IDs to names and check if selected genre is included
      const movieGenreNames = $.map(tmdbMovie.genre_ids, function(id) {
        return genreMap[Number(id)] || null;
      }).filter(Boolean);
      return movieGenreNames.includes(selectedGenre);
    });
  }

  // Apply minimum score filter if set
  if (!isNaN(selectedScore)) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData && movie.tmdbData[0];
      return tmdbMovie && tmdbMovie.vote_average >= selectedScore;
    });
  }

  // Apply sorting based on user selection
  filteredMovies.sort((a, b) => {
    const tmdbA = a.tmdbData && a.tmdbData[0];
    const tmdbB = b.tmdbData && b.tmdbData[0];

    if (!tmdbA || !tmdbB) return 0; // Handle missing TMDB data gracefully

    switch (selectedSort) {
      case 'title-asc':
        return tmdbA.title.localeCompare(tmdbB.title);
      case 'title-desc':
        return tmdbB.title.localeCompare(tmdbA.title);
      case 'score-desc':
        return (tmdbB.vote_average || 0) - (tmdbA.vote_average || 0);
      case 'score-asc':
        return (tmdbA.vote_average || 0) - (tmdbB.vote_average || 0);
      default:
        return 0; // No sorting
    }
  });

  // Re-render the filtered and sorted movies
  renderMovies(filteredMovies);
}

// ============================================================================
// Application Initialization
// ============================================================================

/**
 * Main initialization function that runs when DOM is ready
 * Sets up the application, loads data, and attaches event handlers
 */
$(async function() {
  console.log('DOM ready with jQuery - initializing movie application');
  
  // Initialize user authentication status
  await showLoginStatus();

  // Update navigation if user is logged in
  const token = localStorage.getItem('token');
  if (token) await updateNavbarForRole();

  // Check if we're on a page that needs movie functionality
  const $movieList = $('#movie-list');
  if (!$movieList.length) {
    console.warn('No movie list container found; skipping movie functionality');
    return;
  }

  try {
    // Wait for API to be available before proceeding
    await waitForApi();

    // Load and populate genre filter dropdown
    const genresRes = await fetch(`${BASE_API_URL}/movies/tmdb/genres`);
    const genresJson = await genresRes.json();
    
    if (Array.isArray(genresJson)) {
      const $genreFilter = $('#genre-filter');
      
      // Build genre lookup map and populate dropdown
      $.each(genresJson, function(index, g) {
        genreMap[g.id] = g.name;
        $genreFilter.append($('<option></option>').attr('value', g.name).text(g.name));
      });
    }

    // Load initial movie data from our API
    const res = await fetch(`${BASE_API_URL}/movies`);
    const data = await res.json();

    // Enrich each movie with TMDB data for display
    const moviePromises = data.map(async movie => {
      if (!movie.title) return null; // Skip movies without titles
      
      const tmdbRes = await fetch(`${BASE_API_URL}/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
      const tmdbData = await tmdbRes.json();
      
      // Combine local movie data with TMDB enrichment
      return { ...movie, tmdbData: tmdbData };
    });

    // Wait for all TMDB data to load and filter out failed requests
    allMovies = (await Promise.all(moviePromises)).filter(Boolean);

    // Display all movies initially
    renderMovies(allMovies);

    // Set up event handlers for filtering and sorting
    $('#genre-filter, #score-filter, #sort-filter').on('change', applyFiltersAndSort);
    
    // Clear all filters and reset to default state
    $('#clear-filters-btn').on('click', function() {
      $('#genre-filter').val('');
      $('#score-filter').val('');
      $('#sort-filter').val('title-asc'); // Reset to alphabetical sorting
      applyFiltersAndSort();
    });

  } catch (error) {
    // Display user-friendly error message
    $movieList.html('<p>Error loading movies. Please try again later.</p>');
    console.error('Failed to initialize movie application:', error);
  }
});

// ============================================================================
// Movie Detail Expansion Logic
// ============================================================================

/**
 * Expands a movie card to show detailed information including trailer and cast
 * Hides the movie grid and shows a detailed view with additional TMDB data
 * @param {jQuery} $card - The jQuery object of the clicked movie card
 * @param {number} tmdbId - TMDB movie ID for fetching additional data
 * @param {string} title - Movie title
 * @param {string} posterUrl - URL to movie poster image
 * @param {string} genreText - Comma-separated genre names
 * @param {string} release_date - Movie release date
 * @param {string} overview - Movie plot summary
 */
async function expandMovieCard($card, tmdbId, title, posterUrl, genreText, release_date, overview) {
  // Hide the movie grid to show detailed view
  $('.movie-card').hide();

  // Show the detail panel
  const $detailPanel = $('#movie-detail-panel').removeClass('hidden');

  // Attempt to load movie trailer from TMDB
  let trailerEmbedHTML = '';
  try {
    const trailerRes = await fetch(`${BASE_API_URL}/movies/tmdb/${tmdbId}/videos`);
    if (trailerRes.ok) {
      const trailers = await trailerRes.json();
      
      // Find the first YouTube trailer
      const trailer = $.grep(trailers, t => t.site === 'YouTube' && t.type === 'Trailer')[0];
      
      if (trailer) {
        trailerEmbedHTML = `
          <iframe width="100%" height="315"
            src="https://www.youtube.com/embed/${trailer.key}"
            title="YouTube trailer" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        `;
      }
    } else {
      console.warn('Failed to fetch trailer:', trailerRes.status, trailerRes.statusText);
    }
  } catch (err) {
    console.warn('Trailer loading failed:', err);
  }

  // Attempt to load cast information from TMDB
  let castHTML = '';
  try {
    const castRes = await fetch(`${BASE_API_URL}/movies/tmdb/${tmdbId}/credits`);
    if (castRes.ok) {
      const credits = await castRes.json();
      
      // Display top 5 cast members if available
      if (Array.isArray(credits.cast) && credits.cast.length > 0) {
        const topCast = $.map(credits.cast.slice(0, 5), actor => actor.name).join(', ');
        castHTML = `<p><strong>Cast:</strong> ${topCast}</p>`;
      }
    } else {
      console.warn('Failed to fetch cast:', castRes.status, castRes.statusText);
    }
  } catch (err) {
    console.warn('Cast loading failed:', err);
  }

  // Build and insert the detailed movie view
  $detailPanel.html(`
    <div class="detail-left">
      <img src="${posterUrl}" alt="${title}" class="movie-poster-large" />
      <p><strong>Genres:</strong> ${genreText}</p>
      <p><strong>Release date:</strong> ${release_date ?? 'Unknown'}</p>
      <button class="show-less-btn">Back</button>
    </div>
    <div class="detail-right">
      <h2>${title}</h2>
      <p>${overview || 'No description available.'}</p>
      ${castHTML}
      <div class="trailer">${trailerEmbedHTML || '<p>No trailer available.</p>'}</div>
    </div>
  `);

  // Attach handler to return to movie grid
  $detailPanel.find('.show-less-btn').on('click', resetCards);
}

/**
 * Closes the detailed movie view and returns to the movie grid
 */
function resetCards() {
  $('#movie-detail-panel')
    .addClass('hidden')
    .empty();
  $('.movie-card').show();
}

// ============================================================================
// Authentication Management
// ============================================================================

/**
 * Logs out the current user by removing token and redirecting to login
 */
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/pages/login.html';
}

/**
 * Updates the login button to show user status or login option
 * Fetches current user information if token exists
 */
export async function showLoginStatus() {
  const $loginBtn = $('.login-btn');
  if (!$loginBtn.length) return; // No login button found

  const token = localStorage.getItem('token');
  if (token) {
    try {
      // Verify token and get user information
      const res = await fetch(`${BASE_API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();

        // Replace login button with user info and logout option
        $loginBtn.html(`<span class="user-info">👤 ${data.username}</span><button id="logoutBtn" class="logout-btn">Logout</button>`);

        // Attach logout handler
        $loginBtn.find('#logoutBtn').on('click', logout);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user information:', err);
    }
  }
}