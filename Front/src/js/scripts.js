import { updateNavbarForRole } from './manager.js';

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

    // Fetch genre list
    const genresRes = await fetch('http://localhost:3000/api/movies/tmdb/genres');
    const genresJson = await genresRes.json();
    const genreMap = {};
    if (Array.isArray(genresJson)) {
      $.each(genresJson, function(index, g) {
        genreMap[g.id] = g.name;
      });
    }

    // Fetch movie data
    const res = await fetch(`http://localhost:3000/api/movies`);
    const data = await res.json();

    $.each(data, async function(index, movie) {
      if (!movie.title) return;

      const tmdbRes = await fetch(`http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
      const tmdbData = await tmdbRes.json();

      if (!Array.isArray(tmdbData) || !tmdbData[0]) return;

      const tmdbMovie = tmdbData[0];
      const { title, overview, vote_average, poster_path, release_date, genre_ids, id: tmdbId } = tmdbMovie;

      // Genre mapping
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
        <div class="movie-card" data-tmdb-id="${tmdbId}" data-local-title="${movie.title}">
          <img src="${posterUrl}" alt="${title}" class="movie-poster" />
          <div class="movie-info">
            <h3>${title.toUpperCase()}</h3>
            <p class="movie-overview">${overview ? overview.slice(0, 80) : 'No description available'}... 
              <a href="#" class="read-more-link">read more</a>
            </p>
            <div class="rating">⭐ ${vote_average ?? 'N/A'}</div>
          </div>
        </div>
      `);

      $card.find('.read-more-link, .movie-poster').on('click', async function(e) {
        e.preventDefault();
        await expandMovieCard($card, tmdbId, title, posterUrl, genreText, release_date, overview);
      });

      $movieList.append($card);
    });
  } catch (error) {
    $movieList.html('<p>Error loading movies. Please try again later.</p>');
    console.error('Error loading movies:', error);
  }
});

// Expanded movie card function
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

        $loginBtn.html(`
          <span class="user-info">👤 ${data.username}</span>
          <button id="logoutBtn" class="logout-btn">Logout</button>
        `);

        $loginBtn.find('#logoutBtn').on('click', logout);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  }
}