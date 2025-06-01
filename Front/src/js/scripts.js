import { updateNavbarForRole } from './manager.js';

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

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired');
  await showLoginStatus();

  const token = localStorage.getItem('token');
  if (token) await updateNavbarForRole();

  const movieList = document.getElementById('movie-list');
  if (!movieList) {
    console.warn('No #movie-list element found; skipping movie rendering');
    return;
  }

  try {
    await waitForApi();

    // Fetch genre list from your API
    const genresRes = await fetch('http://localhost:3000/api/movies/tmdb/genres');
    const genresJson = await genresRes.json();
    const genreMap = {};
    if (Array.isArray(genresJson)) {
      genresJson.forEach(g => {
        genreMap[g.id] = g.name;
      });
    }

    // Fetch movie data after the API is ready
    const res = await fetch(`http://localhost:3000/api/movies`);
    const data = await res.json();

    for (const movie of data) {
      if (!movie.title) continue;

      const tmdbRes = await fetch(`http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
      const tmdbData = await tmdbRes.json();

      if (!Array.isArray(tmdbData) || !tmdbData[0]) continue;

      const tmdbMovie = tmdbData[0];
      const { title, overview, vote_average, poster_path, release_date, genre_ids, id: tmdbId } = tmdbMovie;

      // Use genre_ids from TMDB and map them to genre names using genreMap
      let genreText = 'Unknown';
      if (genre_ids && Array.isArray(genre_ids)) {
        const genreNames = genre_ids
          .map(id => genreMap[Number(id)])
          .filter(Boolean);
        genreText = genreNames.length > 0 ? genreNames.join(', ') : 'Unknown';
      }

      const card = document.createElement('div');
      card.classList.add('movie-card');
      card.dataset.tmdbId = tmdbId;
      card.dataset.localTitle = movie.title;

      const posterUrl = poster_path
        ? `https://image.tmdb.org/t/p/w500/${poster_path}`
        : './src/assets/placeholder.png';

      card.innerHTML = `
        <img src="${posterUrl}" alt="${title}" class="movie-poster" />
        <div class="movie-info">
          <h3>${title.toUpperCase()}</h3>
          <p class="movie-overview">${overview ? overview.slice(0, 80) : 'No description available'}... 
            <a href="#" class="read-more-link">read more</a>
          </p>
          <div class="rating">⭐ ${vote_average ?? 'N/A'}</div>
        </div>
      `;

      card.querySelector('.read-more-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await expandMovieCard(card, tmdbId, title, posterUrl, genreText, release_date, overview);
      });

      card.querySelector('.movie-poster').addEventListener('click', async (e) => {
        e.preventDefault();
        await expandMovieCard(card, tmdbId, title, posterUrl, genreText, release_date, overview);
      });

      movieList.appendChild(card);
    }
  } catch (error) {
    movieList.innerHTML = `<p>Error loading movies. Please try again later.</p>`;
    console.error('Outer catch:', error);
  }
});

// Expands the card to fullscreen with left/middle/right layout
async function expandMovieCard(card, tmdbId, title, posterUrl, genreText, release_date, overview) {
  // Hide all movie cards
  document.querySelectorAll('.movie-card').forEach(c => c.style.display = 'none');

  const detailPanel = document.getElementById('movie-detail-panel');
  detailPanel.classList.remove('hidden');

  let trailerEmbedHTML = '';
  try {
    const trailerRes = await fetch(`http://localhost:3000/api/movies/${tmdbId}/videos`);
    const trailers = await trailerRes.json();
    const trailer = trailers.find(t => t.site === 'YouTube' && t.type === 'Trailer');
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
      const topCast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
      castHTML = `<p><strong>Cast:</strong> ${topCast}</p>`;
    }
  } catch (err) {
    console.warn('Cast fetch failed:', err);
  }

  detailPanel.innerHTML = `
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
  `;

  detailPanel.querySelector('.show-less-btn').addEventListener('click', resetCards);
}


function resetCards() {
  const detailPanel = document.getElementById('movie-detail-panel');
  detailPanel.classList.add('hidden');
  detailPanel.innerHTML = '';

  document.querySelectorAll('.movie-card').forEach(c => {
    c.style.display = '';
  });
}


function logout() {
  localStorage.removeItem('token');  // Clear the JWT
  window.location.href = '/pages/login.html';
}

export async function showLoginStatus() {
  const loginBtn = document.querySelector('.login-btn');
  if (!loginBtn) {
    // No login button on this page — safe to skip
    return;
  }

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

        // Instead of outerHTML, update content inside the loginBtn element safely:
        loginBtn.innerHTML = `
          <span class="user-info">👤 ${data.username}</span>
          <button id="logoutBtn" class="logout-btn">Logout</button>
        `;

        // Attach logout event listener
        const logoutBtn = loginBtn.querySelector('#logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', logout);
        }
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  }
}
