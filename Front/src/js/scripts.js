import { updateNavbarForRole } from './manager.js';

// Function to check if the API is ready
async function checkApiStatus() {
  try {
    const res = await fetch('http://localhost:3000/api/movies');
    if (res.ok) {
      return true;
    }
  } catch (error) {
    console.error('API not ready yet:', error);
  }
  return false;
}

// Retry function with delay
async function waitForApi() {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 2000; // 2 seconds

  while (attempts < maxAttempts) {
    const apiReady = await checkApiStatus();
    if (apiReady) {
      return;
    }

    attempts++;
    console.log(`Attempt ${attempts} failed, retrying in ${delay / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('API is not available after multiple attempts');
}



document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired');
  const loginBtn = document.querySelector('.login-btn');

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

        // Replace login button with user info + logout button
        loginBtn.outerHTML = `
          <span class="user-info">👤 ${data.username}</span>
          <button id="logoutBtn" class="logout-btn">Logout</button>
        `;

        // Attach logout event
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Check if the user is a manager
        await updateNavbarForRole();

      } else {
        // Invalid or expired token — clear it
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  }
  const movieList = document.getElementById('movie-list');
  if (!movieList) {
    console.warn('No #movie-list element found; skipping movie rendering');
    return;
  }

  try {
    // Wait for API to be ready
    await waitForApi();

    // Fetch genre list from your API
    const genresRes = await fetch('http://localhost:3000/api/movies/tmdb/genres');
    const genresJson = await genresRes.json();
    // genresJson is already an array!
    const genreMap = {};
    if (Array.isArray(genresJson)) {
      genresJson.forEach(g => {
        genreMap[g.id] = g.name;
      });
    }

    // Fetch movie data after the API is ready
    const res = await fetch(`http://localhost:3000/api/movies`);
    const data = await res.json();

    console.log(data);

    console.log('Testing simple forEach');
    data.forEach(movie => {
      console.log('Simple forEach movie:', movie.title);
    });

    for (const movie of data) {
      try {
        if (!movie.title) {
          console.warn('No title for movie:', movie);
          continue;
        }

        const url = `http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`;
        const tmdbRes = await fetch(url);
        const tmdbData = await tmdbRes.json();

        if (!Array.isArray(tmdbData) || !tmdbData[0]) {
          console.warn(`No TMDB results for "${movie.title}"`);
          continue;
        }

        const tmdbMovie = tmdbData[0];
        const { title, overview, vote_average, poster_path, release_date, genre_ids } = tmdbMovie;

        // Use genre_ids from TMDB and map them to genre names using genreMap
        let genreText = 'Unknown';
        if (genre_ids && Array.isArray(genre_ids)) {
          const genreNames = genre_ids
            .map(id => genreMap[Number(id)]) // Ensure id is a number
            .filter(Boolean); // Remove undefined
          genreText = genreNames.length > 0 ? genreNames.join(', ') : 'Unknown';
        }

        const card = document.createElement('div');
        card.classList.add('movie-card');

        const posterUrl = poster_path
          ? `https://image.tmdb.org/t/p/w500/${poster_path}`
          : './src/assets/placeholder.png';

        card.innerHTML = `
          <img src="${posterUrl}" alt="${title}" class="movie-poster" />
          <div class="movie-info">
            <h3>${title.toUpperCase()}</h3>
            <p class="movie-overview">${overview ? overview.slice(0, 80) : 'No description available'}... <a href="#" class="read-more">read more</a></p>
            <div class="rating">⭐ ${vote_average ?? 'N/A'}</div>
            <div class="extra-info" style="display:none;">
              <p><strong>Overview:</strong> ${overview}</p>
              <p><strong></p>
              <p><strong></p>

              <p><strong>Genres:</strong> ${genreText}</p>
              <p><strong></p>
              <p><strong></p>
              <p><strong>Release date:</strong> ${release_date ?? 'Unknown'}</p>
            </div>
          </div>
        `;
        movieList.appendChild(card);

        // Add event listener for "read more"
        const readMoreLink = card.querySelector('.read-more');
        readMoreLink.addEventListener('click', function (e) {
          e.preventDefault();
          card.classList.toggle('expanded');
          const extraInfo = card.querySelector('.extra-info');
          const overviewP = card.querySelector('.movie-overview');
          if (card.classList.contains('expanded')) {
            extraInfo.style.display = 'block';
            overviewP.style.display = 'none';
            card.style.maxWidth = '600px'; // or any size you want
          } else {
            extraInfo.style.display = 'none';
            overviewP.style.display = 'block';
            card.style.maxWidth = ''; // reset
          }
        });
      } catch (err) {
        console.error(`Failed to fetch TMDB data for "${movie.title}"`, err);
      }
    }
  } catch (error) {
    movieList.innerHTML = `<p>Error loading movies. Please try again later.</p>`;
    console.error('Outer catch:', error);
  }
});

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
