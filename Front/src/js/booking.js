import { showLoginStatus } from './scripts.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to book tickets.');
    window.location.href = '/pages/login.html';
    return;
  }

  await showLoginStatus();

  const urlParams = new URLSearchParams(window.location.search);
  const screeningId = urlParams.get('screeningId');

  if (!screeningId) {
    alert('No screening selected');
    return;
  }

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

    // Optionally store seats for later use
    window.availableSeats = seats.filter(seat => !seat.isTaken);

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

    const selectedSeats = availableSeats.slice(0, totalTickets);
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
        fetch('http://localhost:3000/api/my-reservations', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
            })
            .then(res => res.json())
            .then(data => console.log('My Reservations:', data))
            .catch(err => console.error(err));
        //window.location.href = '/index.html';
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

document.addEventListener('DOMContentLoaded', () => {
  const circle = document.querySelector('.circle');
  circle.style.cursor = 'pointer'; // Make it obvious it’s clickable

  circle.addEventListener('click', () => {
    window.location.href = '/index.html';
  });
});

function formatTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

