import { updateNavbarForRole } from './manager.js';

// --- Constants ---
const API_BASE_URL = 'http://localhost:3000/api';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500/';
const PLACEHOLDER_IMAGE_URL = './src/assets/placeholder.png';
const OVERVIEW_SNIPPET_LENGTH = 150; // Increased from 80 for better readability
const API_CHECK_MAX_ATTEMPTS = 10;
const API_CHECK_DELAY = 2000; // ms

// --- Global State ---
let allMovies = []; // Stores all fetched movies with their TMDB data
let genreMap = {};  // Stores genre ID to name mapping

// --- Utility Functions ---

// Checks if the API is reachable.
async function checkApiStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/movies`);
    return res.ok;
  } catch (error) {
    console.warn('API not ready yet, retrying...');
    return false;
  }
}

// Waits for the API to become available with retries.
async function waitForApi() {
  let attempts = 0;
  while (attempts < API_CHECK_MAX_ATTEMPTS) {
    if (await checkApiStatus()) {
      return;
    }
    attempts++;
    await new Promise(resolve => setTimeout(resolve, API_CHECK_DELAY));
  }
  throw new Error('API is not available after multiple attempts.');
}

// Fetches data from a given URL.
async function fetchData(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// Fetches TMDB movie data for a given movie title.
async function fetchTmdbMovieData(title) {
  if (!title) return null;
  const tmdbData = await fetchData(`${API_BASE_URL}/movies/tmdb/search?title=${encodeURIComponent(title)}`);
  return Array.isArray(tmdbData) && tmdbData.length > 0 ? tmdbData[0] : null;
}

// Gets genre names from an array of genre IDs.
function getGenreNames(genreIds) {
  if (!genreIds || !Array.isArray(genreIds)) return 'Unknown';
  const genreNames = $.map(genreIds, id => genreMap[Number(id)] || null).filter(Boolean);
  return genreNames.length > 0 ? genreNames.join(', ') : 'Unknown';
}

// --- Render Functions ---

// Renders a list of movies to the movie grid.
async function renderMovies(moviesToRender) {
  const $movieList = $('#movie-list');
  $movieList.empty(); // Clear existing movies

  if (moviesToRender.length === 0) {
    $movieList.html('<p>No movies found matching your criteria.</p>');
    return;
  }

  const movieCardsHtml = moviesToRender.map(movie => {
    const tmdbMovie = movie.tmdbData;
    if (!tmdbMovie || !tmdbMovie.title) return ''; // Skip if TMDB data is missing or incomplete

    const { title, overview, vote_average, poster_path, release_date, genre_ids, id: tmdbId } = tmdbMovie;
    const genreText = getGenreNames(genre_ids);
    const posterUrl = poster_path ? `${TMDB_IMAGE_BASE_URL}${poster_path}` : PLACEHOLDER_IMAGE_URL;
    const displayOverview = overview ? overview.slice(0, OVERVIEW_SNIPPET_LENGTH) + '...' : 'No description available.';

    // Store necessary data in data attributes for click handler
    return `
      <div class="movie-card"
           data-tmdb-id="${tmdbId}"
           data-local-title="${movie.title}"
           data-genre="${genreText}"
           data-score="${vote_average}"
           data-poster-url="${posterUrl}"
           data-release-date="${release_date || ''}"
           data-overview="${overview || ''}">
        <img src="${posterUrl}" alt="${title}" class="movie-poster" />
        <div class="movie-info">
          <h3>${title.toUpperCase()}</h3>
          <p class="movie-overview">${displayOverview} 
            <a href="#" class="read-more-link">read more</a>
          </p>
          <div class="rating">⭐ ${vote_average ? vote_average.toFixed(1) : 'N/A'}</div>
        </div>
      </div>
    `;
  }).join('');

  $movieList.html(movieCardsHtml);

  // Attach event listeners to the newly added movie cards
  $movieList.find('.movie-card .read-more-link, .movie-card .movie-poster').on('click', function(e) {
    e.preventDefault();
    const $card = $(this).closest('.movie-card');
    const tmdbId = $card.data('tmdb-id');
    const title = $card.find('h3').text(); // Use text from the card
    const posterUrl = $card.data('poster-url');
    const genreText = $card.data('genre');
    const releaseDate = $card.data('release-date');
    const overview = $card.data('overview');
    expandMovieCard(tmdbId, title, posterUrl, genreText, releaseDate, overview);
  });
}

// Expands a movie card to show detailed information.
async function expandMovieCard(tmdbId, title, posterUrl, genreText, releaseDate, overview) {
  $('.movie-card').hide(); // Hide all movie cards
  const $detailPanel = $('#movie-detail-panel').removeClass('hidden');

  let trailerEmbedHTML = '<p>No trailer available.</p>';
  try {
    const trailers = await fetchData(`${API_BASE_URL}/movies/${tmdbId}/videos`);
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
  } catch (err) {
    console.warn('Trailer fetch failed:', err);
  }

  let castHTML = '';
  try {
    const credits = await fetchData(`${API_BASE_URL}/movies/${tmdbId}/credits`);
    if (Array.isArray(credits.cast)) {
      const topCast = $.map(credits.cast.slice(0, 5), actor => actor.name).join(', ');
      castHTML = `<p><strong>Cast:</strong> ${topCast}</p>`;
    }
  } catch (err) {
    console.warn('Cast fetch failed:', err);
  }

  $detailPanel.html(`
    <div class="detail-left">
      <img src="${posterUrl}" alt="${title}" class="movie-poster-large" />
      <p><strong>Genres:</strong> ${genreText}</p>
      <p><strong>Release date:</strong> ${releaseDate || 'Unknown'}</p>
      <button class="show-less-btn">Back</button>
    </div>
    <div class="detail-right">
      <h2>${title}</h2>
      <p>${overview || 'No description available.'}</p>
      ${castHTML}
      <div class="trailer">${trailerEmbedHTML}</div>
    </div>
  `);

  $detailPanel.find('.show-less-btn').on('click', resetCards);
}

// Resets the view to show movie cards and hides the detail panel.
function resetCards() {
  $('#movie-detail-panel')
    .addClass('hidden')
    .empty();
  $('.movie-card').show();
}

// --- Filter and Sort Logic ---

// Applies filters and sorting to the movie list and re-renders it. 
function applyFiltersAndSort() {
  let filteredMovies = [...allMovies]; // Start with all movies

  const selectedGenre = $('#genre-filter').val();
  const selectedScore = parseFloat($('#score-filter').val());
  const selectedSort = $('#sort-filter').val();

  // Filter by genre
  if (selectedGenre) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData;
      if (!tmdbMovie || !tmdbMovie.genre_ids) return false;
      const movieGenreNames = getGenreNames(tmdbMovie.genre_ids);
      return movieGenreNames.includes(selectedGenre);
    });
  }

  // Filter by score
  if (!isNaN(selectedScore)) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData;
      return tmdbMovie && (tmdbMovie.vote_average || 0) >= selectedScore;
    });
  }

  // Sort movies
  filteredMovies.sort((a, b) => {
    const tmdbA = a.tmdbData;
    const tmdbB = b.tmdbData;

    // Ensure TMDB data exists for comparison
    if (!tmdbA && !tmdbB) return 0;
    if (!tmdbA) return 1; // Put movies without TMDB data at the end
    if (!tmdbB) return -1;

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
        return 0;
    }
  });

  renderMovies(filteredMovies);
}

// --- User Authentication/Session ---

//Logs out the user by removing the token and redirecting to the login page.
function logout() {
  localStorage.removeItem('token');
  window.location.href = './pages/login.html';
}

// Displays login status in the navbar and attaches logout handler.
//This is an exported function as it's used by manager.js.
export async function showLoginStatus() {
  const $loginBtn = $('#loginButton'); // Use ID for specific button
  if (!$loginBtn.length) return;

  const token = localStorage.getItem('token');
  if (token) {
    try {
      const data = await fetchData(`${API_BASE_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      $loginBtn.html(`<span class="user-info">👤 ${data.username}</span><button id="logoutBtn" class="logout-btn">Logout</button>`);
      $loginBtn.find('#logoutBtn').on('click', logout);
    } catch (err) {
      console.error('Failed to fetch user info or token invalid:', err);
      localStorage.removeItem('token'); // Invalidate token if fetch fails
      $loginBtn.text('Login'); // Reset button text
    }
  } else {
    $loginBtn.text('Login');
  }
}

// --- Initialization ---

$(async function() {
  console.log('DOM ready and scripts.js initializing...');

  // Attach event listeners for direct page navigation from buttons
  $('#loginButton').on('click', function() {
    // Only navigate if the user is not already logged in (i.e., button still says "Login")
    if ($(this).text().trim() === 'Login') {
      window.location.href = './pages/login.html';
    }
  });
  $('#bookNowButton').on('click', function() {
    window.location.href = './pages/screenings.html';
  });

  await showLoginStatus(); // Update login status immediately
  const token = localStorage.getItem('token');
  if (token) {
    // This call is redundant if showLoginStatus handles the display.
    // Assuming updateNavbarForRole does more than just show username, keep for now.
    await updateNavbarForRole(); 
  }


  const $movieList = $('#movie-list');
  if (!$movieList.length) {
    console.warn('No #movie-list element found; skipping movie rendering setup.');
    return;
  }

  try {
    await waitForApi();

    // Fetch genre list and populate filter
    const genresJson = await fetchData(`${API_BASE_URL}/movies/tmdb/genres`);
    if (Array.isArray(genresJson)) {
      const $genreFilter = $('#genre-filter');
      $.each(genresJson, function(_, g) {
        genreMap[g.id] = g.name;
        $genreFilter.append($('<option></option>').attr('value', g.name).text(g.name));
      });
    }

    // Fetch local movie data
    const localMovies = await fetchData(`${API_BASE_URL}/movies`);

    // Fetch TMDB data for all movies concurrently and combine
    const moviePromises = localMovies.map(async movie => {
      const tmdbData = await fetchTmdbMovieData(movie.title);
      return tmdbData ? { ...movie, tmdbData: tmdbData } : null;
    });

    allMovies = (await Promise.all(moviePromises)).filter(Boolean); // Store enriched movie data

    // Initial rendering of movies
    renderMovies(allMovies);

    // Attach event listeners for filters and sort
    $('#genre-filter, #score-filter, #sort-filter').on('change', applyFiltersAndSort);
    $('#clear-filters-btn').on('click', function() {
      $('#genre-filter').val('');
      $('#score-filter').val('');
      $('#sort-filter').val('title-asc'); // Reset to default sort
      applyFiltersAndSort();
    });

  } catch (error) {
    $movieList.html('<p>Error loading movies. Please try again later.</p>');
    console.error('Initialization error:', error);
  }
});