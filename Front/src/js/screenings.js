import { showLoginStatus } from './scripts.js';


addEventListener('DOMContentLoaded', async () => {
  await showLoginStatus();


  const circle = document.querySelector('.circle');
  circle.style.cursor = 'pointer'; // Make it obvious it’s clickable

  circle.addEventListener('click', () => {
    window.location.href = '../index.html'; // Redirect to home page
  });

});

async function fetchScreenings() {
  try {
    const res = await fetch('http://localhost:3000/api/screenings');
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error(data.error || 'Invalid data received');
    }

    renderScreenings(data);
  } catch (error) {
    console.error('Failed to fetch screenings:', error);
  }
}


function groupByMovie(screenings) {
  const grouped = {};
  for (const screening of screenings) {
    const key = screening.movie_title;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(screening);
  }
  return grouped;
}

function renderScreenings(screenings) {
  const container = document.getElementById('screenings-container');
  container.innerHTML = '';

  const grouped = groupByMovie(screenings);

  for (const [title, shows] of Object.entries(grouped)) {
    const showingsHTML = shows.map(show => `
      <div>
        <strong>${show.hall_name}</strong>:
        <span class="badge" onclick="window.location.href='booking.html?screeningId=${show.screening_id}'">
  ${formatTime(show.start_time)}
</span>

      </div>
    `).join('');

    const card = `
      <div class="screening-card">
        <img src=".\src\resources\images\movie-placeholder.jpg" alt="${title}" />
        <div class="screening-info">
          <h4 class="movie-title">${title}</h4>
          ${showingsHTML}
          <p class="overview">Overview: simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.</p>
          <div class="labels">
            <span class="label">4K HD</span>
            <span class="label">4D</span>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += card;
    container.querySelectorAll('.badge').forEach(badge => {badge.style.cursor = 'pointer';});
  }
}

function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', fetchScreenings);
