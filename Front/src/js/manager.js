const API_BASE = 'http://localhost:3000';
let tmdbGenres = {};

async function fetchTMDBGenres() {
  try {
    const res = await fetch(`${API_BASE}/api/movies/tmdb/genres`);
    if (!res.ok) return;
    const genres = await res.json();
    tmdbGenres = {};
    genres.forEach(g => {
      tmdbGenres[Number(g.id)] = g.name;
    });
  } catch (err) {
    console.error('Failed to fetch TMDB genres:', err);
  }
}

$(document).ready(() => {
  if ($('#tmdb-search-form').length) fetchTMDBGenres();
});

// Navbar manager tab injection
export async function updateNavbarForRole() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;

    const user = await res.json();
    if (user.role === 'manager') {
      if (!$('.nav-links #manager-tab').length) {
        $('.nav-links').append(`<a href="/pages/manager.html" id="manager-tab" class="manager-tab">Manager</a>`);
      }
    }
  } catch (err) {
    console.error('Failed to fetch user info:', err);
  }
}

// Redirect non-managers from manager.html
$(document).ready(async () => {
  if (window.location.pathname.endsWith('manager.html')) {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '../index.html');

    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return (window.location.href = '../index.html');
      const data = await res.json();
      if (data.role !== 'manager') window.location.href = '../index.html';
    } catch {
      window.location.href = '../index.html';
    }
  }
});

let allUsers = [];

async function fetchAndRenderUsers(searchTerm = '') {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/getAllUsers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allUsers = await res.json();
    renderUsersTable(searchTerm);
  } catch (err) {
    console.error('Failed to fetch users:', err);
  }
}

function renderUsersTable(searchTerm = '', customList = null) {
  const $tbody = $('#users-table tbody');
  $tbody.empty();

  let filtered = customList || allUsers;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(user =>
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      String(user.user_id).includes(term)
    );
  }

  filtered.forEach(user => {
    const $tr = $(`
      <tr>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>
          ${
            user.username !== 'manager'
              ? `
                <select data-user-id="${user.user_id}">
                  <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                  <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>manager</option>
                </select>
                <button class="delete-user-btn" data-user-id="${user.user_id}">Delete</button>
              `
              : ''
          }
        </td>
      </tr>
    `);
    $tbody.append($tr);
  });

  $tbody.find('select').on('change', async function () {
    const userId = $(this).data('user-id');
    const newRole = $(this).val();
    await changeUserRole(userId, newRole);
    await fetchAndRenderUsers($('#user-search-input').val());
  });

  $tbody.find('.delete-user-btn').on('click', async function () {
    const userId = $(this).data('user-id');
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
      await fetchAndRenderUsers($('#user-search-input').val());
    }
  });
}

// Search, reset, show managers
$(document).ready(() => {
  $('#user-search-btn').on('click', () => {
    renderUsersTable($('#user-search-input').val());
  });
  $('#user-search-reset').on('click', () => {
    $('#user-search-input').val('');
    renderUsersTable('');
  });
  $('#show-managers-btn').on('click', () => {
    const managers = allUsers.filter(user => user.role === 'manager');
    renderUsersTable('', managers);
  });
});

async function changeUserRole(userId, newRole) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/changeUserRole`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ user_id: userId, new_role: newRole })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.message || 'Failed to change role');
    }
  } catch (err) {
    alert('Failed to change role');
    console.error(err);
  }
}

async function deleteUser(userId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/deleteUser/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
    }
  } catch (err) {
    alert('Failed to delete user');
    console.error(err);
  }
}

if (window.location.pathname.endsWith('manager.html')) {
  $(document).ready(() => fetchAndRenderUsers());
}

// Tab switching
$(document).ready(() => {
  function showSection($section) {
    $('#user-management-section, #movie-management-section, #screenings-management-section').hide();
    $section.show();
  }

  $('#user-management-tab').on('click', () => showSection($('#user-management-section')));
  $('#movie-management-tab').on('click', async () => {showSection($('#movie-management-section')); await fetchAndRenderMovies();});
  $('#screenings-management-tab').on('click', async () => {
    showSection($('#screenings-management-section'));
    await fetchMoviesForScreenings();
    await fetchAndRenderScreenings();
  });
});

// --- TMDB Movie Management ---
$('#tmdb-search-form').on('submit', async function (e) {
  e.preventDefault();
  const query = $('#tmdb-search-input').val().trim();
  if (!query) return;

  if (!Object.keys(tmdbGenres).length) {
    await fetchTMDBGenres();
  }

  const res = await fetch(`${API_BASE}/api/movies/tmdb/search?title=${encodeURIComponent(query)}`);
  const results = await res.json();
  renderTMDBResults(results);
});

async function fetchTMDBRuntime(movieId) {
  try {
    const res = await fetch(`${API_BASE}/api/movies/tmdb/details/${movieId}`);
    if (!res.ok) return null;
    const details = await res.json();
    return details.runtime || null;
  } catch {
    return null;
  }
}

function renderTMDBResults(results) {
  const $container = $('#tmdb-results');
  $container.empty();

  if (!results.length) {
    $container.text('No results found.');
    return;
  }

  const $ul = $('<ul></ul>');

  results.forEach(async movie => {
    const genreNames = (movie.genre_ids || [])
      .map(id => tmdbGenres[Number(id)])
      .filter(Boolean)
      .join(', ');

    const duration = await fetchTMDBRuntime(movie.id);

    const $li = $(`
      <li>
        <strong>${movie.title}</strong> (${movie.release_date?.split('-')[0] || 'N/A'})<br>
        <em>${movie.overview || ''}</em><br>
        <span><b>Genres:</b> ${genreNames || 'Unknown'}</span><br>
        <span><b>Release Date:</b> ${movie.release_date || 'Unknown'}</span><br>
        <span><b>Duration:</b> ${duration ? duration + ' min' : 'Unknown'}</span><br>
        <button class="add-tmdb-movie"
          data-title="${encodeURIComponent(movie.title)}"
          data-description="${encodeURIComponent(movie.overview || '')}"
          data-release="${movie.release_date || ''}"
          data-duration="${duration || ''}"
          data-genre="${encodeURIComponent(genreNames)}"
        >Add to Database</button>
      </li>
    `);
    $ul.append($li);
  });

  $container.append($ul);

  $container.on('click', '.add-tmdb-movie', async function () {
    const $btn = $(this);
    const movieToAdd = {
      title: decodeURIComponent($btn.data('title')),
      description: decodeURIComponent($btn.data('description')),
      release_date: $btn.data('release'),
      duration_minutes: $btn.data('duration') || 120,
      genre: decodeURIComponent($btn.data('genre')) || 'Unknown'
    };
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(movieToAdd)
    });
    if (res.ok) {
      alert('Movie added!');
      fetchAndRenderMovies();
    } else {
      alert('Failed to add movie');
    }
  });
}

async function fetchAndRenderMovies() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/movies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const movies = await res.json();
  renderMoviesTable(movies);
}

function renderMoviesTable(movies) {
  const $tbody = $('#movies-table tbody');
  $tbody.empty();

  movies.forEach(movie => {
    const $tr = $(`
      <tr>
        <td>${movie.title}</td>
        <td>${movie.description || ''}</td>
        <td>${movie.duration_minutes || ''}</td>
        <td>${movie.genre || ''}</td>
        <td><button class="delete-movie-btn" data-id="${movie.movie_id}">Delete</button></td>
      </tr>
    `);
    $tbody.append($tr);
  });

  $tbody.on('click', '.delete-movie-btn', async function () {
    const id = $(this).data('id');
    if (confirm('Are you sure you want to delete this movie?')) {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/movies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAndRenderMovies();
    }
  });
}

// --- Screening Management ---
let allMovies = [];
let allHalls = [];

async function fetchMoviesForScreenings() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/movies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  allMovies = await res.json();
  renderMoviesForScreenings();
}

function renderMoviesForScreenings() {
  const $tbody = $('#screenings-movies-table tbody');
  if (!$tbody.length) return;
  $tbody.empty();
  allMovies.forEach(movie => {
    const $tr = $(`
      <tr>
        <td>${movie.title}</td>
        <td>${movie.description || ''}</td>
        <td>${movie.duration_minutes || ''}</td>
        <td>${movie.genre || ''}</td>
        <td><button class="add-screening-btn" data-id="${movie.movie_id}">Add Screening</button></td>
      </tr>
    `);
    $tbody.append($tr);
  });

  $tbody.find('.add-screening-btn').on('click', function () {
    const movieId = $(this).data('id');
    showAddScreeningModal(movieId);
  });
}

async function showAddScreeningModal(movieId) {
  // Fetch halls if not already loaded
  if (!allHalls.length) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/halls`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allHalls = await res.json();
  }
  const hallOptions = allHalls.map(h => `${h.hall_id}: ${h.name}`).join('\n');
  const hallId = prompt(`Enter hall ID:\n${hallOptions}`);
  if (!hallId) return;
  const startTime = prompt('Enter start time (YYYY-MM-DDTHH:MM):');
  if (!startTime) return;

  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/screenings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ movie_id: movieId, hall_id: hallId, start_time: startTime })
  });
  if (res.ok) {
    alert('Screening added!');
    fetchAndRenderScreenings();
  } else {
    alert('Failed to add screening');
  }
}

let allScreenings = [];

async function fetchAndRenderScreenings() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/screenings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  allScreenings = await res.json();
  renderScreeningsTable();
}

function renderScreeningsTable() {
  const $tbody = $('#screenings-table tbody');
  if (!$tbody.length) return;
  $tbody.empty();
  allScreenings.forEach(s => {
    const $tr = $(`
      <tr>
        <td>${s.screening_id}</td>
        <td>${s.movie_title || s.title || ''}</td>
        <td>${s.hall_name || ''}</td>
        <td>${s.start_time ? new Date(s.start_time).toLocaleString() : ''}</td>
        <td>
          <button class="edit-screening-btn" data-id="${s.screening_id}">Edit</button>
          <button class="delete-screening-btn" data-id="${s.screening_id}">Delete</button>
        </td>
      </tr>
    `);
    $tbody.append($tr);
  });

  $tbody.find('.delete-screening-btn').on('click', async function () {
    const id = $(this).data('id');
    if (confirm('Delete this screening?')) {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/screenings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAndRenderScreenings();
    }
  });

  $tbody.find('.edit-screening-btn').on('click', async function () {
    const id = $(this).data('id');
    const screening = allScreenings.find(s => s.screening_id === id);

    // Fetch halls if not already loaded
    if (!allHalls.length) {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/halls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      allHalls = await res.json();
    }

    // Prompt for new hall
    const hallOptions = allHalls.map(h => `${h.hall_id}: ${h.name}`).join('\n');
    const newHallId = prompt(
      `Enter new hall ID (current: ${screening.hall_id || ''}):\n${hallOptions}`,
      screening.hall_id || ''
    );
    if (!newHallId) return;

    // Prompt for new start time
    const newTime = prompt(
      'Enter new start time (YYYY-MM-DDTHH:MM):',
      screening.start_time?.slice(0, 16)
    );
    if (!newTime) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/screenings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ hall_id: newHallId, start_time: newTime })
    });
    if (res.ok) fetchAndRenderScreenings();
  });
}

// --- New Screening Update Endpoint ---
export const updateScreenings = async (req, res) => {
  const { id } = req.params;
  let { hall_id, start_time } = req.body;

  // Convert undefined to null
  if (typeof hall_id === 'undefined') hall_id = null;
  if (typeof start_time === 'undefined') start_time = null;

  if (!hall_id || !start_time) {
    return res.status(400).json({ error: 'hall_id and start_time are required' });
  }

  try {
    const [result] = await db.query(
      'UPDATE screenings SET hall_id = ?, start_time = ? WHERE screening_id = ?',
      [hall_id, start_time, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Screening not found' });
    }
    res.json({ message: 'Screening updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update screening' });
  }
  if (res.ok) fetchAndRenderScreenings();
};

export const createScreenings = async (req, res) => {
  let { movie_id, hall_id, start_time } = req.body;
  if (typeof movie_id === 'undefined') movie_id = null;
  if (typeof hall_id === 'undefined') hall_id = null;
  if (typeof start_time === 'undefined') start_time = null;

  if (!movie_id || !hall_id || !start_time) {
    return res.status(400).json({ error: 'movie_id, hall_id, and start_time are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO screenings (movie_id, hall_id, start_time) VALUES (?, ?, ?)',
      [movie_id, hall_id, start_time]
    );
    res.status(201).json({ screening_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create screening' });
  }
  if (res.ok) fetchAndRenderScreenings();
};
