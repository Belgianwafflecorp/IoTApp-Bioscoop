import { updateNavbarForRole } from './manager.js';

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // Replace with your real API key

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

  try {
    // Wait for API to be ready
    await waitForApi();

    // Fetch movie data after the API is ready
    const res = await fetch(`http://localhost:3000/api/movies`);
    const data = await res.json();

    console.log(data);

    data.forEach(movie => {
      const card = document.createElement('div');
      card.classList.add('movie-card');

      card.innerHTML = `
        <h3>${movie.title.toUpperCase()}</h3>
        <p>${movie.description.slice(0, 80)}... <a href="#">read more</a></p>
        <div class="stars">⭐⭐⭐☆☆</div>
      `;

      movieList.appendChild(card);
    });
  } catch (error) {
    movieList.innerHTML = `<p>Error loading movies. Please try again later.</p>`;
    console.error(error);
  }
});

function logout() {
  localStorage.removeItem('token');  // Clear the JWT
  window.location.href = '/pages/login.html'; 
}