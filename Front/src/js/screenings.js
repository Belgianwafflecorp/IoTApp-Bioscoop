import { showLoginStatus } from './scripts.js';
import { API_URL } from '../apiConfig.js';

// Initialize the page when DOM is ready
$(document).ready(async () => {
  // Display current user login status in the header
  await showLoginStatus();

  // Enable navigation back to home page when clicking the cinema logo
  $('.circle').css('cursor', 'pointer').on('click', () => {
    window.location.href = '../index.html';
  });

  // Load and display all movie screenings from the database
  await fetchAndRenderScreenings();
});

/**
 * Retrieves screening data from the API and renders it on the page.
 * Handles network errors and displays user-friendly error messages.
 */
async function fetchAndRenderScreenings() {
  try {
    const res = await fetch(`${API_URL}/screenings`);
    const screenings = await res.json();

    // Validate API response structure
    if (!Array.isArray(screenings)) {
      throw new Error(screenings.error || 'Invalid screenings data');
    }

    // Ensure screenings are displayed in chronological order
    screenings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Organize screenings by movie title, then by date for better UI presentation
    const grouped = groupByMovie(screenings);
    
    // Render the organized data with enhanced movie information from TMDB
    await renderScreeningsWithTmdb(grouped);
  } catch (error) {
    console.error('Failed to fetch screenings:', error);
    // Display user-friendly error message when screening data cannot be loaded
    $('#screenings-container').html('<p>Failed to load screenings. Please try again later.</p>');
  }
}

/**
 * Organizes screening data into a hierarchical structure for efficient rendering.
 * Creates a nested object where movies contain dates, and dates contain screening times.
 * 
 * @param {Array} screenings - Array of screening objects from the database
 * @returns {Object} Nested structure: { movie_title: { date_string: [screening_objects] } }
 * 
 * Example return structure:
 * {
 *   "Avatar": {
 *     "2025-06-07": [screening1, screening2],
 *     "2025-06-08": [screening3]
 *   }
 * }
 */
function groupByMovie(screenings) {
  const grouped = {};
  
  for (const screening of screenings) {
    const movieTitle = screening.movie_title;
    const dateString = getDateString(screening.start_time); // Extract YYYY-MM-DD format

    // Initialize movie entry if it doesn't exist
    if (!grouped[movieTitle]) {
      grouped[movieTitle] = {};
    }
    
    // Initialize date array for this movie if it doesn't exist
    if (!grouped[movieTitle][dateString]) {
      grouped[movieTitle][dateString] = [];
    }
    
    // Add screening to the appropriate movie and date grouping
    grouped[movieTitle][dateString].push(screening);
  }
  
  return grouped;
}

/**
 * Renders movie screening cards with enhanced information from The Movie Database (TMDB).
 * Each card displays movie poster, description, and organized showtimes by date.
 * 
 * @param {Object} grouped - Nested object of movies organized by date and screenings
 */
async function renderScreeningsWithTmdb(grouped) {
  const $container = $('#screenings-container').empty();

  // Process each movie and its associated screening dates
  for (const [movieTitle, dates] of Object.entries(grouped)) {
    // Set default values for movie information
    let poster = '/resources/images/movie-placeholder.jpg';
    let overview = 'No description available.';
    let displayMovieTitle = movieTitle;

    try {
      const tmdbRes = await fetch(`${API_URL}/movies/details/${encodeURIComponent(movieTitle)}`);
      const tmdbData = await tmdbRes.json();
      console.log(`TMDB data for "${movieTitle}":`, tmdbData);

      // Update movie information with TMDB data if available
      if (tmdbData?.poster_url) {
        poster = tmdbData.poster_url;
      }
      if (tmdbData?.overview?.trim()) {
        overview = tmdbData.overview;
      }
      // Use TMDB title if it's more descriptive than database title
      if (tmdbData?.title && tmdbData.title.trim().toLowerCase() !== 'undefined') {
        displayMovieTitle = tmdbData.title;
      }
    } catch (err) {
      // Log TMDB fetch failures but continue with default values
      console.warn(`TMDB fetch failed for "${movieTitle}":`, err);
    }

    // Build HTML for all screening dates and times for this movie
    let allDatesShowingsHTML = '';
    
    // Sort dates chronologically to maintain consistent user experience
    const sortedDates = Object.keys(dates).sort((a, b) => new Date(a) - new Date(b));

    // Generate HTML for each date's screenings
    for (const dateString of sortedDates) {
      const showsOnDate = dates[dateString];
      const formattedDate = formatDate(dateString); // Convert to user-friendly format

      // Create individual screening time badges for each show
      const dailyShowingsHTML = showsOnDate.map(show => `
        <div class="show-item">
          <strong>${show.hall_name}</strong>:
          <span class="badge" data-id="${show.screening_id}">
            ${formatTime(show.start_time)}
          </span>
        </div>
      `).join('');

      // Group all showings for this date under a date header
      allDatesShowingsHTML += `
        <div class="date-group">
          <h5 class="screening-date">${formattedDate}</h5>
          <div class="showings-list">
            ${dailyShowingsHTML}
          </div>
        </div>
      `;
    }

    // Construct the complete movie card with poster, details, and showtimes
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
    
    // Add the completed card to the main container
    $container.append(card);
  }

  // Set up click handlers for screening time badges after all cards are rendered
  $container.on('click', '.badge', function () {
    const screeningId = $(this).data('id');
    // Navigate to booking page with selected screening ID
    window.location.href = `booking.html?screeningId=${screeningId}`;
  });

  // Add visual cursor indication for clickable screening time badges
  $('.badge').css('cursor', 'pointer');
}

/**
 * Converts a full datetime string to display format showing only hours and minutes.
 * 
 * @param {string} dateTime - ISO datetime string from database
 * @returns {string} Time in HH:MM format (e.g., "14:30", "09:15")
 */
function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Converts date strings into user-friendly display format with relative dates.
 * Provides contextual labels like "Today" and "Tomorrow" for better UX.
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format or full datetime string
 * @returns {string} Human-readable date (e.g., "Today", "Tomorrow", "Saturday, June 8, 2025")
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Normalize all dates to midnight for accurate day-only comparison
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowNormalized = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  // Return contextual labels for immediate dates
  if (targetDate.getTime() === todayNormalized.getTime()) {
    return 'Today';
  } else if (targetDate.getTime() === tomorrowNormalized.getTime()) {
    return 'Tomorrow';
  } else {
    // Format future dates as full readable strings
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Extracts the date portion from a datetime string in YYYY-MM-DD format.
 * Used for grouping screenings by calendar date regardless of time.
 * 
 * @param {string} dateTime - Full datetime string from database
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getDateString(dateTime) {
  const date = new Date(dateTime);
  return date.toISOString().split('T')[0]; // Extract date part before 'T' separator
}