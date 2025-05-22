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
        console.log('Movie object:', movie);
        if (!movie.title) {
          console.warn('No title for movie:', movie);
          continue;
        }
        const url = `http://localhost:3000/api/movies/tmdb/search?title=${encodeURIComponent(movie.title)}`;
        console.log('Fetching TMDB with URL:', url);

        const tmdbRes = await fetch(url);
        console.log('TMDB fetch status:', tmdbRes.status);
        const tmdbData = await tmdbRes.json();

        console.log(`TMDB data for "${movie.title}":`, tmdbData);

        if (!Array.isArray(tmdbData) || !tmdbData[0]) {
          console.warn(`No TMDB results for "${movie.title}"`);
          continue;
        }

        const { title, overview, vote_average } = tmdbData[0];
        const card = document.createElement('div');
        card.classList.add('movie-card');
        card.innerHTML = `
          <h3>${title.toUpperCase()}</h3>
          <p>${overview.slice(0, 80)}... <a href="#">read more</a></p>
          <div class="rating">⭐ ${vote_average}</div>
        `;
        movieList.appendChild(card);
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
