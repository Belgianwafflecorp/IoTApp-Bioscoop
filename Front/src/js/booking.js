import { showLoginStatus } from './scripts.js';

let socket;
let screeningId;
let selectedSeatIds = [];

$(document).ready(async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to book tickets.');
    window.location.href = '/pages/login.html';
    return;
  }

  await showLoginStatus();

  const urlParams = new URLSearchParams(window.location.search);
  screeningId = urlParams.get('screeningId');
  if (!screeningId) return alert('No screening selected');

  setupWebSocket(screeningId);

  try {
    const [screeningRes, seatsRes] = await Promise.all([
      fetch(`http://localhost:3000/api/screenings/${screeningId}`),
      fetch(`http://localhost:3000/api/screenings/${screeningId}/tickets`)
    ]);

    if (!screeningRes.ok || !seatsRes.ok) throw new Error('Failed to load data');

    const screeningData = await screeningRes.json();
    const movieTitle = screeningData.movie.title;

    try {
      const tmdbRes = await fetch(`http://localhost:3000/api/movies/details/${encodeURIComponent(movieTitle)}`);
      const tmdbData = await tmdbRes.json();
      $('#movie-poster').attr('src', tmdbData?.poster_url || '/resources/images/movie-placeholder.jpg');
    } catch {
      $('#movie-poster').attr('src', '/resources/images/movie-placeholder.jpg');
    }

    const seats = await seatsRes.json();
    $('#movie-title').text(screeningData.movie.title);
    // Display the date of the screening
    $('#screening-date').text(formatDate(screeningData.start_time));
    $('#start-time').text(formatTime(screeningData.start_time));
    $('#genre').text(screeningData.movie.genre);
    $('#duration').text(screeningData.movie.duration);
    $('#release').text(screeningData.movie.release_date);

    window.availableSeats = seats.filter(s => !s.isTaken);
    window.takenSeats = seats.filter(s => s.isTaken);

    updateSeatsDisplay();
  } catch (err) {
    console.error(err);
    alert('Failed to load screening information.');
  }

  $('#confirm-btn').on('click', async () => {
    const reduced = parseInt($('#reduced').val()) || 0;
    const normal = parseInt($('#normal').val()) || 0;
    const premium = parseInt($('#premium').val()) || 0;
    const totalRequested = reduced + normal + premium;

    let seatIdsToReserve = [...selectedSeatIds];

    if (seatIdsToReserve.length === 0) {
      const available = window.availableSeats;
      const reducedSeats = available.filter(s => s.seat_type === 'reduced').slice(0, reduced);
      const normalSeats = available.filter(s => s.seat_type === 'normal').slice(0, normal);
      const premiumSeats = available.filter(s => s.seat_type === 'premium').slice(0, premium);
      seatIdsToReserve = [...reducedSeats, ...normalSeats, ...premiumSeats].map(s => s.seat_id);
    }

    if (seatIdsToReserve.length !== totalRequested) {
      return alert('Selected seats do not match ticket counts.');
    }

    try {
      const res = await fetch('http://localhost:3000/api/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: null,
          screening_id: screeningId,
          seat_ids: seatIdsToReserve
        })
      });

      if (res.ok) {
        alert('Reservation successful!');
        selectedSeatIds = [];
      } else {
        const data = await res.json();
        alert(`Reservation failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error during reservation.');
    }
  });

  $('.circle').css('cursor', 'pointer').on('click', () => {
    window.location.href = '/index.html';
  });

  ['#reduced', '#normal', '#premium'].forEach(id => {
    $(id).on('change', handleTicketInputChange);
  });
});

function setupWebSocket(screeningId) {
  socket = new WebSocket('ws://localhost:3000');

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'subscribe', screeningId }));
  });

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'update' && Array.isArray(msg.data)) {
      window.availableSeats = msg.data.filter(s => !s.isTaken);
      window.takenSeats = msg.data.filter(s => s.isTaken);
      updateSeatsDisplay();
    }
  });

  socket.addEventListener('close', () => console.log('WebSocket closed.'));
  socket.addEventListener('error', (err) => console.error('WebSocket error:', err));
}

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

function updateSeatsDisplay() {
  $('#seats-reduced').text(window.availableSeats.filter(s => s.seat_type === 'reduced').length);
  $('#seats-normal').text(window.availableSeats.filter(s => s.seat_type === 'normal').length);
  $('#seats-premium').text(window.availableSeats.filter(s => s.seat_type === 'premium').length);
  renderSeatGrid();
}

function renderSeatGrid() {
  const $grid = $('#seat-grid');
  if (!$grid.length) return console.error('Seat grid container not found.');

  $grid.empty();

  const allSeats = [...window.availableSeats, ...window.takenSeats.map(s => ({ ...s, isTaken: true }))];

  allSeats.sort((a, b) => {
    if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
    return a.seat_row.localeCompare(b.seat_row);
  });

  const rows = {};
  allSeats.forEach(seat => {
    if (!rows[seat.seat_row]) rows[seat.seat_row] = [];
    rows[seat.seat_row].push(seat);
  });

  for (const rowLabel in rows) {
    $grid.append(`<div class="seat-row-label">Row ${rowLabel}</div>`);
    const $row = $('<div class="seat-row"></div>');

    rows[rowLabel].forEach(seat => {
      const isSelected = selectedSeatIds.includes(seat.seat_id);
      const $btn = $(`<div class="seat ${seat.seat_type} ${seat.isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}">${seat.seat_number}</div>`);

      if (!seat.isTaken) {
        $btn.on('click', () => {
          const $input = $(`#${seat.seat_type}`);
          let count = parseInt($input.val()) || 0;

          if (selectedSeatIds.includes(seat.seat_id)) {
            selectedSeatIds = selectedSeatIds.filter(id => id !== seat.seat_id);
            $input.val(Math.max(count - 1, 0));
          } else {
            selectedSeatIds.push(seat.seat_id);
            $input.val(count + 1);
          }

          updateSeatsDisplay();
        });
      }

      $row.append($btn);
    });

    $grid.append($row);
  }
}

function handleTicketInputChange() {
  const reduced = parseInt($('#reduced').val()) || 0;
  const normal = parseInt($('#normal').val()) || 0;
  const premium = parseInt($('#premium').val()) || 0;

  const foundSeats = findGroupedSeats(reduced, normal, premium);

  if (foundSeats.length === reduced + normal + premium) {
    selectedSeatIds = foundSeats.map(seat => seat.seat_id);
  } else {
    selectedSeatIds = [];
    alert('Could not find enough grouped seats for your selection.');
  }

  updateSeatsDisplay();
}

function findGroupedSeats(reduced, normal, premium) {
  const available = [...window.availableSeats];

  available.sort((a, b) => {
    if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
    return a.seat_row.localeCompare(b.seat_row);
  });

  const grouped = [];

  for (const seat of available) {
    if (seat.seat_type === 'reduced' && reduced > 0) {
      grouped.push(seat); reduced--;
    } else if (seat.seat_type === 'normal' && normal > 0) {
      grouped.push(seat); normal--;
    } else if (seat.seat_type === 'premium' && premium > 0) {
      grouped.push(seat); premium--;
    }
    if (reduced + normal + premium === 0) break;
  }

  return grouped;
}
