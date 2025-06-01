import { showLoginStatus } from './scripts.js';

let socket;
let screeningId;
let selectedSeatIds = [];

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to book tickets.');
    window.location.href = '/pages/login.html';
    return;
  }

  await showLoginStatus();

  const urlParams = new URLSearchParams(window.location.search);
  screeningId = urlParams.get('screeningId');

  if (!screeningId) {
    alert('No screening selected');
    return;
  }

  setupWebSocket(screeningId);

  try {
    const [screeningRes, seatsRes] = await Promise.all([
      fetch(`http://localhost:3000/api/screenings/${screeningId}`),
      fetch(`http://localhost:3000/api/screenings/${screeningId}/tickets`)
    ]);

    if (!screeningRes.ok || !seatsRes.ok) throw new Error('Failed to load data');

    const screeningData = await screeningRes.json();
    const movieTitle = screeningData.movie.title;

    // Try to fetch poster from backend TMDB proxy
    try {
      const tmdbRes = await fetch(`http://localhost:3000/api/movies/details/${encodeURIComponent(movieTitle)}`);
      const tmdbData = await tmdbRes.json();

      if (tmdbData && tmdbData.poster_url) {
        document.getElementById('movie-poster').src = tmdbData.poster_url;
      } else {
        document.getElementById('movie-poster').src = '/resources/images/movie-placeholder.jpg';
      }
    } catch (err) {
      console.warn('Could not fetch poster from TMDB:', err);
      document.getElementById('movie-poster').src = '/resources/images/movie-placeholder.jpg';
    }



    const seats = await seatsRes.json();

    document.getElementById('movie-title').textContent = screeningData.movie.title;
    document.getElementById('start-time').textContent = formatTime(screeningData.start_time);
    document.getElementById('genre').textContent = screeningData.movie.genre;
    document.getElementById('duration').textContent = screeningData.movie.duration;
    document.getElementById('release').textContent = screeningData.movie.release_date;

    window.availableSeats = seats.filter(seat => !seat.isTaken);
    window.takenSeats = seats.filter(seat => seat.isTaken);

    updateSeatsDisplay();
  } catch (err) {
    console.error(err);
    alert('Failed to load screening information.');
  }

  document.getElementById('confirm-btn').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const reduced = parseInt(document.getElementById('reduced').value) || 0;
    const normal = parseInt(document.getElementById('normal').value) || 0;
    const premium = parseInt(document.getElementById('premium').value) || 0;
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
      alert('Selected seats do not match ticket counts.');
      return;
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

  const circle = document.querySelector('.circle');
  if (circle) {
    circle.style.cursor = 'pointer';
    circle.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
  }

  // Attach auto-selection to input changes
  ['reduced', 'normal', 'premium'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('change', handleTicketInputChange);
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
      window.availableSeats = msg.data.filter(seat => !seat.isTaken);
      window.takenSeats = msg.data.filter(seat => seat.isTaken);
      updateSeatsDisplay();
    }
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket closed.');
  });

  socket.addEventListener('error', (err) => {
    console.error('WebSocket error:', err);
  });
}

function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateSeatsDisplay() {
  const reducedSeats = window.availableSeats.filter(s => s.seat_type === 'reduced').length;
  const normalSeats = window.availableSeats.filter(s => s.seat_type === 'normal').length;
  const premiumSeats = window.availableSeats.filter(s => s.seat_type === 'premium').length;

  document.getElementById('seats-reduced').textContent = reducedSeats;
  document.getElementById('seats-normal').textContent = normalSeats;
  document.getElementById('seats-premium').textContent = premiumSeats;

  renderSeatGrid();
}

function renderSeatGrid() {
  const grid = document.getElementById('seat-grid');
  if (!grid) {
    console.error('Seat grid container not found.');
    return;
  }

  grid.innerHTML = '';

  const allSeats = [...window.availableSeats, ...window.takenSeats.map(s => ({ ...s, isTaken: true }))];

  // Sort seats by row and number
  allSeats.sort((a, b) => {
    if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
    return a.seat_row.localeCompare(b.seat_row);
  });

  // Group seats by row
  const rows = {};
  allSeats.forEach(seat => {
    if (!rows[seat.seat_row]) rows[seat.seat_row] = [];
    rows[seat.seat_row].push(seat);
  });

  // Render each row
  for (const rowLabel of Object.keys(rows)) {
    const labelEl = document.createElement('div');
    labelEl.className = 'seat-row-label';
    labelEl.textContent = `Row ${rowLabel}`;
    grid.appendChild(labelEl);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'seat-row';

    rows[rowLabel].forEach(seat => {
      const btn = document.createElement('div');
      btn.className = `seat ${seat.seat_type} ${seat.isTaken ? 'taken' : ''} ${selectedSeatIds.includes(seat.seat_id) ? 'selected' : ''}`;
      btn.textContent = seat.seat_number;

      if (!seat.isTaken) {
        btn.addEventListener('click', () => {
          const seatInput = document.getElementById(seat.seat_type);
          let count = parseInt(seatInput.value) || 0;

          if (selectedSeatIds.includes(seat.seat_id)) {
            selectedSeatIds = selectedSeatIds.filter(id => id !== seat.seat_id);
            seatInput.value = Math.max(count - 1, 0);
          } else {
            selectedSeatIds.push(seat.seat_id);
            seatInput.value = count + 1;
          }

          updateSeatsDisplay();
        });
      }

      rowDiv.appendChild(btn);
    });

    grid.appendChild(rowDiv);
  }
}


// Auto-select grouped seats when inputs change
function handleTicketInputChange() {
  const reduced = parseInt(document.getElementById('reduced').value) || 0;
  const normal = parseInt(document.getElementById('normal').value) || 0;
  const premium = parseInt(document.getElementById('premium').value) || 0;

  const foundSeats = findGroupedSeats(reduced, normal, premium);

  if (foundSeats.length === reduced + normal + premium) {
    selectedSeatIds = foundSeats.map(seat => seat.seat_id);
  } else {
    selectedSeatIds = [];
    alert('Could not find enough grouped seats for your selection.');
  }

  updateSeatsDisplay();
}

// Grouped seat finder
function findGroupedSeats(reduced, normal, premium) {
  const available = [...window.availableSeats];

  available.sort((a, b) => {
    if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
    return a.seat_row.localeCompare(b.seat_row);
  });

  const grouped = [];

  for (const seat of available) {
    if (seat.seat_type === 'reduced' && reduced > 0) {
      grouped.push(seat);
      reduced--;
    } else if (seat.seat_type === 'normal' && normal > 0) {
      grouped.push(seat);
      normal--;
    } else if (seat.seat_type === 'premium' && premium > 0) {
      grouped.push(seat);
      premium--;
    }

    if (reduced + normal + premium === 0) break;
  }

  return grouped;
}
