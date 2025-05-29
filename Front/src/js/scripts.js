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

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/pages/login.html';
}

export async function showLoginStatus() {
  const loginBtn = document.querySelector('.login-btn');
  if (!loginBtn) return;

  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('http://localhost:3000/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        loginBtn.innerHTML = `
          <span class="user-info">👤 ${data.username}</span>
          <button id="logoutBtn" class="logout-btn">Logout</button>
        `;
        loginBtn.querySelector('#logoutBtn')?.addEventListener('click', logout);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  }
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
    const res = await fetch('http://localhost:3000/api/movies');
    const data = await res.json();

    for (const movie of data) {
      if (!movie.title) continue;

      const tmdbRes = await fetch(`http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`);
      const tmdbData = await tmdbRes.json();

      if (!Array.isArray(tmdbData) || !tmdbData[0]) continue;

      const tmdbMovie = tmdbData[0];
      const { title, overview, vote_average, poster_path, id: tmdbId } = tmdbMovie;

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
          <p>${overview ? overview.slice(0, 80) : 'No description available'}... 
            <a href="#" class="read-more-link">read more</a>
          </p>
          <div class="rating">⭐ ${vote_average ?? 'N/A'}</div>
        </div>
      `;

      card.querySelector('.read-more-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await expandMovieCard(card, tmdbId, movie.title);
      });

      movieList.appendChild(card);
    }
  } catch (error) {
    movieList.innerHTML = `<p>Error loading movies. Please try again later.</p>`;
    console.error('Outer catch:', error);
  }
});

async function expandMovieCard(card, tmdbId, title) {
  document.querySelectorAll('.movie-card').forEach(c => {
    if (c !== card) c.style.display = 'none';
  });

  try {
    // Correct API call using tmdbId instead of title
    const detailsRes = await fetch(`http://localhost:3000/api/movies/tmdb/${tmdbId}`);
    const details = await detailsRes.json();
    console.log(`tmdbId: ${tmdbId}, details:`, details);
    const { overview, release_date, vote_average, poster_path, runtime } = details;

    // Get trailer using the correct tmdbId passed into the function
    let trailerEmbedHTML = '';
    try {
      const trailerRes = await fetch(`http://localhost:3000/api/movies/${tmdbId}/videos`);
      const trailers = await trailerRes.json();

      const trailer = trailers.find(t => t.site === 'YouTube' && t.type === 'Trailer');
      if (trailer) {
        trailerEmbedHTML = `
          <div class="trailer-container">
            <h4>Watch Trailer</h4>
            <iframe width="100%" height="315"
              src="https://www.youtube.com/embed/${trailer.key}"
              title="YouTube trailer" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen>
            </iframe>
          </div>
        `;
      }
    } catch (trailerErr) {
      console.warn('Failed to load trailer:', trailerErr);
    }

    const posterUrl = poster_path
      ? `https://image.tmdb.org/t/p/w500/${poster_path}`
      : './src/assets/placeholder.png';

    card.innerHTML = `
      <img src="${posterUrl}" alt="${title}" class="movie-poster" />
      <div class="movie-info">
        <h2>${title}</h2>
        <p><strong>Runtime:</strong> ${runtime ?? 'N/A'} mins</p>
        <p><strong>Release Date:</strong> ${release_date ?? 'Unknown'}</p>
        <p><strong>Rating:</strong> ⭐ ${vote_average ?? 'N/A'}</p>
        <p>${overview || 'No description available.'}</p>
        ${trailerEmbedHTML}
        <button class="show-less-btn">Show less</button>
      </div>
    `;

    card.querySelector('.show-less-btn').addEventListener('click', resetCards);
  } catch (err) {
    console.error('Failed to fetch expanded movie info:', err);
    card.innerHTML += '<p>Error loading additional details.</p>';
  }
}



function resetCards() {
  const movieList = document.getElementById('movie-list');
  movieList.innerHTML = ''; // Clear existing cards
  document.dispatchEvent(new Event('DOMContentLoaded')); // Re-trigger initial load
}
