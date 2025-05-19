import { showLoginStatus } from './scripts.js';

let socket;
let screeningId;

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

  // Connect WebSocket once
  setupWebSocket(screeningId);

  // Fetch screening info
  try {
    const [screeningRes, seatsRes] = await Promise.all([
      fetch(`http://localhost:3000/api/screenings/${screeningId}`),
      fetch(`http://localhost:3000/api/screenings/${screeningId}/tickets`)
    ]);

    if (!screeningRes.ok || !seatsRes.ok) throw new Error('Failed to load data');

    const screeningData = await screeningRes.json();
    const seats = await seatsRes.json();

    // Fill in screening info
    document.getElementById('movie-title').textContent = screeningData.movie.title;
    document.getElementById('start-time').textContent = formatTime(screeningData.start_time);
    document.getElementById('genre').textContent = screeningData.movie.genre;
    document.getElementById('duration').textContent = screeningData.movie.duration;
    document.getElementById('release').textContent = screeningData.movie.release_date;

    window.availableSeats = seats.filter(seat => !seat.isTaken);
    updateSeatsDisplay();

  } catch (err) {
    console.error(err);
    alert('Failed to load screening information.');
  }

  document.getElementById('confirm-btn').addEventListener('click', async () => {
    const reduced = parseInt(document.getElementById('reduced').value) || 0;
    const normal = parseInt(document.getElementById('normal').value) || 0;
    const premium = parseInt(document.getElementById('premium').value) || 0;

    const totalTickets = reduced + normal + premium;

    if (totalTickets <= 0) {
      alert('Please select at least one ticket.');
      return;
    }

    const availableSeats = window.availableSeats || [];

    if (availableSeats.length < totalTickets) {
      alert('Not enough seats available.');
      return;
    }

    const available = window.availableSeats;

    const selectedSeats = [
    ...available.filter(s => s.seat_type === 'reduced').slice(0, reduced),
    ...available.filter(s => s.seat_type === 'normal').slice(0, normal),
    ...available.filter(s => s.seat_type === 'premium').slice(0, premium)
    ];

    if (selectedSeats.length < totalTickets) {
    alert('Not enough seats of requested types available.');
    return;
    }

    const seatIds = selectedSeats.map(seat => seat.seat_id);

    try {
      const res = await fetch('http://localhost:3000/api/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: null, // server uses token
          screening_id: screeningId,
          seat_ids: seatIds
        })
      });

      if (res.ok) {
        alert('Reservation successful!');
        const data = await fetch('http://localhost:3000/api/my-reservations', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());
        console.log('My Reservations:', data);
      } else {
        const data = await res.json();
        alert(`Reservation failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error sending reservation request.');
    }
  });
});

// WebSocket setup (placed *outside* of click handler)
function setupWebSocket(screeningId) {
  socket = new WebSocket('ws://localhost:3000');

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'subscribe', screeningId }));
  });

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'update' && Array.isArray(msg.data)) {
      window.availableSeats = msg.data.filter(seat => !seat.isTaken);
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

// Format screening time
function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Update seat display
function updateSeatsDisplay() {
    const reducedSeats = window.availableSeats.filter(s => s.seat_type === 'reduced').length;
    const normalSeats = window.availableSeats.filter(s => s.seat_type === 'normal').length;
    const premiumSeats = window.availableSeats.filter(s => s.seat_type === 'premium').length;

    document.getElementById('seats-reduced').textContent = reducedSeats;
    document.getElementById('seats-normal').textContent = normalSeats;
    document.getElementById('seats-premium').textContent = premiumSeats;
    }

// Go home button
document.addEventListener('DOMContentLoaded', () => {
  const circle = document.querySelector('.circle');
  circle.style.cursor = 'pointer';
  circle.addEventListener('click', () => {
    window.location.href = '/index.html';
  });
});
