import { updateNavbarForRole } from './manager/manager.js';

let allMovies = []; // Store all fetched movies
let genreMap = {}; // Store genre ID to name mapping

// Utility functions remain similar but with jQuery syntax
async function checkApiStatus() {
  try {
    const res = await fetch('http://localhost:3000/api/movies');
    return res.ok;
  } catch (error) {
    console.error('API not ready yet:', error);
  }
  return false;
}

async function waitForApi() {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 2000;

  while (attempts < maxAttempts) {
    if (await checkApiStatus()) return;
    attempts++;
    console.log(`Attempt ${attempts} failed, retrying in ${delay / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('API is not available after multiple attempts');
}

// Function to render movies
async function renderMovies(moviesToRender) {
  const $movieList = $('#movie-list');
  $movieList.empty(); // Clear existing movies

  if (moviesToRender.length === 0) {
    $movieList.html('<p>No movies found matching your criteria.</p>');
    return;
  }

  // Use a traditional for loop or $.each to correctly handle async operations inside
  for (const movie of moviesToRender) {
    if (!movie.title) continue;

    const tmdbRes = await fetch(`http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
    const tmdbData = await tmdbRes.json();

    if (!Array.isArray(tmdbData) || !tmdbData[0]) continue;

    const tmdbMovie = tmdbData[0];
    const { title, overview, vote_average, poster_path, release_date, genre_ids, id: tmdbId } = tmdbMovie;

    let genreText = 'Unknown';
    if (genre_ids && Array.isArray(genre_ids)) {
      const genreNames = $.map(genre_ids, function(id) {
        return genreMap[Number(id)] || null;
      }).filter(Boolean);
      genreText = genreNames.length > 0 ? genreNames.join(', ') : 'Unknown';
    }

    const posterUrl = poster_path
      ? `https://image.tmdb.org/t/p/w500/${poster_path}`
      : './src/assets/placeholder.png';

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

    $card.find('.read-more-link, .movie-poster').on('click', async function(e) {
      e.preventDefault();
      await expandMovieCard($card, tmdbId, title, posterUrl, genreText, release_date, overview);
    });

    $movieList.append($card);
  }
}

// Function to apply filters and sorting
function applyFiltersAndSort() {
  let filteredMovies = [...allMovies]; // Start with all movies

  const selectedGenre = $('#genre-filter').val();
  const selectedScore = parseFloat($('#score-filter').val());
  const selectedSort = $('#sort-filter').val();

  // Filter by genre
  if (selectedGenre) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData && movie.tmdbData[0];
      if (!tmdbMovie || !tmdbMovie.genre_ids) return false;
      const movieGenreNames = $.map(tmdbMovie.genre_ids, function(id) {
        return genreMap[Number(id)] || null;
      }).filter(Boolean);
      return movieGenreNames.includes(selectedGenre);
    });
  }

  // Filter by score
  if (!isNaN(selectedScore)) {
    filteredMovies = filteredMovies.filter(movie => {
      const tmdbMovie = movie.tmdbData && movie.tmdbData[0];
      return tmdbMovie && tmdbMovie.vote_average >= selectedScore;
    });
  }

  // Sort movies
  filteredMovies.sort((a, b) => {
    const tmdbA = a.tmdbData && a.tmdbData[0];
    const tmdbB = b.tmdbData && b.tmdbData[0];

    if (!tmdbA || !tmdbB) return 0; // Handle cases where TMDB data might be missing

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

// Document ready handler
$(async function() {
  console.log('DOM ready with jQuery');
  await showLoginStatus();

  const token = localStorage.getItem('token');
  if (token) await updateNavbarForRole();

  const $movieList = $('#movie-list');
  if (!$movieList.length) {
    console.warn('No #movie-list element found; skipping movie rendering');
    return;
  }

  try {
    await waitForApi();

    // Fetch genre list and populate filter
    const genresRes = await fetch('http://localhost:3000/api/movies/tmdb/genres');
    const genresJson = await genresRes.json();
    if (Array.isArray(genresJson)) {
      const $genreFilter = $('#genre-filter');
      $.each(genresJson, function(index, g) {
        genreMap[g.id] = g.name;
        $genreFilter.append($('<option></option>').attr('value', g.name).text(g.name));
      });
    }

    // Fetch movie data and store it
    const res = await fetch(`http://localhost:3000/api/movies`);
    const data = await res.json();

    // Fetch TMDB data for all movies and store it
    const moviePromises = data.map(async movie => {
      if (!movie.title) return null;
      const tmdbRes = await fetch(`http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
      const tmdbData = await tmdbRes.json();
      return { ...movie, tmdbData: tmdbData };
    });

    allMovies = (await Promise.all(moviePromises)).filter(Boolean); // Filter out nulls

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
    console.error('Error loading movies:', error);
  }
});

// Expanded movie card function (remains the same)
async function expandMovieCard($card, tmdbId, title, posterUrl, genreText, release_date, overview) {
  // Hide all movie cards
  $('.movie-card').hide();

  const $detailPanel = $('#movie-detail-panel').removeClass('hidden');

  let trailerEmbedHTML = '';
  try {
    const trailerRes = await fetch(`http://localhost:3000/api/movies/${tmdbId}/videos`);
    const trailers = await trailerRes.json();
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

  // Fetch cast info
  let castHTML = '';
  try {
    const castRes = await fetch(`http://localhost:3000/api/movies/${tmdbId}/credits`);
    const credits = await castRes.json();
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

  $detailPanel.find('.show-less-btn').on('click', resetCards);
}

function resetCards() {
  $('#movie-detail-panel')
    .addClass('hidden')
    .empty();
  $('.movie-card').show();
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/pages/login.html';
}

export async function showLoginStatus() {
  const $loginBtn = $('.login-btn');
  if (!$loginBtn.length) return;

  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('http://localhost:3000/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();

        $loginBtn.html(`<span class="user-info">👤 ${data.username}</span><button id="logoutBtn" class="logout-btn">Logout</button>`);

        $loginBtn.find('#logoutBtn').on('click', logout);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  }
}
