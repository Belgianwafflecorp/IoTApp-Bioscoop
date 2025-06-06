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

    // Sort screenings by start_time ascending to ensure chronological order
    screenings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const grouped = groupByMovie(screenings); // Changed to groupByMovie
    await renderScreeningsWithTmdb(grouped);
  } catch (error) {
    console.error('Failed to fetch screenings:', error);
    $('#screenings-container').html('<p>Failed to load screenings. Please try again later.</p>');
  }
}

/**
 * Groups screenings by movie title. Within each movie, screenings are further
 * grouped by date.
 * @param {Array} screenings - The array of screening objects.
 * @returns {Object} An object structured as { movie_title: { date_string: [screening, ...] } }.
 */
function groupByMovie(screenings) { // Renamed from groupByMovieAndDate
  const grouped = {};
  for (const screening of screenings) {
    const movieTitle = screening.movie_title;
    const dateString = getDateString(screening.start_time); // YYYY-MM-DD

    if (!grouped[movieTitle]) {
      grouped[movieTitle] = {}; // Initialize with an object for dates
    }
    if (!grouped[movieTitle][dateString]) {
      grouped[movieTitle][dateString] = [];
    }
    grouped[movieTitle][dateString].push(screening);
  }
  return grouped;
}

async function renderScreeningsWithTmdb(grouped) {
  const $container = $('#screenings-container').empty();

  for (const [movieTitle, dates] of Object.entries(grouped)) {
    let poster = '/resources/images/movie-placeholder.jpg';
    let overview = 'No description available.';
    let displayMovieTitle = movieTitle; // Use a separate variable for TMDB title if available

    try {
      const tmdbRes = await fetch(`http://localhost:3000/api/movies/details/${encodeURIComponent(movieTitle)}`);
      const tmdbData = await tmdbRes.json();
      console.log(`TMDB data for "${movieTitle}":`, tmdbData);

      if (tmdbData?.poster_url) {
        poster = tmdbData.poster_url;
      }
      if (tmdbData?.overview?.trim()) {
        overview = tmdbData.overview;
      }
      if (tmdbData?.title && tmdbData.title.trim().toLowerCase() !== 'undefined') {
        displayMovieTitle = tmdbData.title;
      }
    } catch (err) {
      console.warn(`TMDB fetch failed for "${movieTitle}":`, err);
    }

    // Build the HTML for all dates and their showings for this single movie
    let allDatesShowingsHTML = '';
    // Sort dates to ensure chronological order within the card
    const sortedDates = Object.keys(dates).sort((a, b) => new Date(a) - new Date(b));

    for (const dateString of sortedDates) {
      const showsOnDate = dates[dateString];
      const formattedDate = formatDate(dateString); // e.g., "Today", "Tomorrow", "Thursday, June 6, 2025"

      const dailyShowingsHTML = showsOnDate.map(show => `
        <div class="show-item">
          <strong>${show.hall_name}</strong>:
          <span class="badge" data-id="${show.screening_id}">
            ${formatTime(show.start_time)}
          </span>
        </div>
      `).join('');

      allDatesShowingsHTML += `
        <div class="date-group">
          <h5 class="screening-date">${formattedDate}</h5>
          <div class="showings-list">
            ${dailyShowingsHTML}
          </div>
        </div>
      `;
    }

    const card = `
      <div class="screening-card">
        <img src="${poster}" alt="${displayMovieTitle}" />
        <div class="screening-info">
          <h4 class="movie-title">${displayMovieTitle}</h4>
          <p class="overview">Overview: ${overview}</p>
          <div class="labels">
            <span class="label">4K HD</span>
            <span class="label">4D</span>
          </div>
          <div class="screening-details">
            ${allDatesShowingsHTML}
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

/**
 * Formats a date-time string to display only the time (e.g., "14:00").
 * @param {string} dateTime - The date-time string.
 * @returns {string} The formatted time string.
 */
function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a date string (YYYY-MM-DD) or a date-time string into a human-readable date.
 * If the date is today or tomorrow, it will display "Today" or "Tomorrow".
 * @param {string} dateString - The date string (YYYY-MM-DD) or full dateTime string.
 * @returns {string} The formatted date string (e.g., "Today", "Tomorrow", "Saturday, June 8, 2025").
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Normalize dates to just the day part for comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tm = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (d.getTime() === t.getTime()) {
    return 'Today';
  } else if (d.getTime() === tm.getTime()) {
    return 'Tomorrow';
  } else {
    // For other days, format as "Day, Month Day, Year"
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Extracts the date part (YYYY-MM-DD) from a date-time string.
 * @param {string} dateTime - The date-time string.
 * @returns {string} The date part in YYYY-MM-DD format.
 */
function getDateString(dateTime) {
  const date = new Date(dateTime);
  return date.toISOString().split('T')[0]; // Gets YYYY-MM-DD
}