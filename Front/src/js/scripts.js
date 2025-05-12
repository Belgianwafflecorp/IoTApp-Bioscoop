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
