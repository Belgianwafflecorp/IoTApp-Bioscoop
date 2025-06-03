import { showLoginStatus } from './scripts.js';

$(document).ready(async () => {
  await showLoginStatus();

  $('.circle').css('cursor', 'pointer').on('click', () => {
    window.location.href = '../index.html';
  });

  await fetchAndRenderScreenings();
});

async function fetchAndRenderScreenings() {
  try {
    const res = await fetch('http://localhost:3000/api/screenings');
    const screenings = await res.json();

    if (!Array.isArray(screenings)) {
      throw new Error(screenings.error || 'Invalid screenings data');
    }

    const grouped = groupByMovie(screenings);
    await renderScreeningsWithTmdb(grouped);
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

async function renderScreeningsWithTmdb(grouped) {
  const $container = $('#screenings-container').empty();

  for (const [title, shows] of Object.entries(grouped)) {
    let poster = '/resources/images/movie-placeholder.jpg';
    let overview = 'No description available.';
    let movieTitle = title;

    try {
      const tmdbRes = await fetch(`http://localhost:3000/api/movies/details/${encodeURIComponent(title)}`);
      const tmdbData = await tmdbRes.json();
      console.log(`TMDB data for "${title}":`, tmdbData);

      if (tmdbData?.poster_url) {
        poster = tmdbData.poster_url;
      }

      if (tmdbData?.overview?.trim()) {
        overview = tmdbData.overview;
      }

      if (tmdbData?.title && tmdbData.title.trim().toLowerCase() !== 'undefined') {
        movieTitle = tmdbData.title;
      }
    } catch (err) {
      console.warn(`TMDB fetch failed for "${title}":`, err);
    }

    const showingsHTML = shows.map(show => `
      <div>
        <strong>${show.hall_name}</strong>:
        <span class="badge" data-id="${show.screening_id}">
          ${formatTime(show.start_time)}
        </span>
      </div>
    `).join('');

    const card = `
      <div class="screening-card">
        <img src="${poster}" alt="${movieTitle}" />
        <div class="screening-info">
          <h4 class="movie-title">${movieTitle}</h4>
          ${showingsHTML}
          <p class="overview">Overview: ${overview}</p>
          <div class="labels">
            <span class="label">4K HD</span>
            <span class="label">4D</span>
          </div>
        </div>
      </div>
    `;

    $container.append(card);
  }

  // Delegate badge click handling after badges are added
  $container.on('click', '.badge', function () {
    const screeningId = $(this).data('id');
    window.location.href = `booking.html?screeningId=${screeningId}`;
  });

  $('.badge').css('cursor', 'pointer');
}

function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
