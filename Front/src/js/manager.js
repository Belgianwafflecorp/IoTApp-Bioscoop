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

function getCurrentDateTimeLocal() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
                <button class="manager-btn delete-btn" data-user-id="${user.user_id}">Delete</button>
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

  $tbody.find('.delete-btn[data-user-id]').on('click', async function () {
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
    $('#tmdb-clear-btn').on('click', () => {
    $('#tmdb-search-input').val('');
    $('#tmdb-results').empty();
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
}

// Place this ONCE in your $(document).ready() block, NOT inside renderTMDBResults!
$('#tmdb-results').off('click', '.add-tmdb-movie').on('click', '.add-tmdb-movie', async function () {
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

let allMoviesDb = []; // Store all movies for filtering/sorting

async function fetchAndRenderMovies() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/movies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  allMoviesDb = await res.json();
  renderMoviesTable(allMoviesDb);
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
        <td><button id="delete-movie-btn-${movie.movie_id}" data-id="${movie.movie_id}" class="manager-btn delete-btn">Delete</button></td>
      </tr>
    `);
    $tbody.append($tr);

    $(`#delete-movie-btn-${movie.movie_id}`).on('click', async function () {
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
  });
}

// Filtering and sorting logic
function filterAndSortMovies() {
  let filtered = allMoviesDb;
  const search = $('#movie-db-search-input').val().toLowerCase();
  const sort = $('#movie-db-sort').val();

  if (search) {
    filtered = filtered.filter(m =>
      (m.title || '').toLowerCase().includes(search) ||
      (m.genre || '').toLowerCase().includes(search) ||
      (m.description || '').toLowerCase().includes(search)
    );
  }

  if (sort) {
    const [field, dir] = sort.split('-');
    filtered = filtered.slice().sort((a, b) => {
      let va = a[field] || '';
      let vb = b[field] || '';
      if (field === 'duration' || field === 'duration_minutes') {
        va = Number(a.duration_minutes) || 0;
        vb = Number(b.duration_minutes) || 0;
      } else {
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  renderMoviesTable(filtered);
}

// Event handlers
$(document).ready(() => {
  $('#movie-db-search-btn').on('click', filterAndSortMovies);
  $('#movie-db-search-reset').on('click', () => {
    $('#movie-db-search-input').val('');
    filterAndSortMovies();
  });
  $('#movie-db-sort').on('change', filterAndSortMovies);

  // Optionally: trigger sort/filter on Enter in search input
  $('#movie-db-search-input').on('keypress', function(e) {
    if (e.which === 13) filterAndSortMovies();
  });
});

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

let filteredScreeningsMovies = [];

function filterAndSortScreeningsMovies() {
  let filtered = allMovies;
  const search = $('#screenings-movie-db-search-input').val().toLowerCase();
  const sort = $('#screenings-movie-db-sort').val();

  if (search) {
    filtered = filtered.filter(m =>
      (m.title || '').toLowerCase().includes(search) ||
      (m.genre || '').toLowerCase().includes(search) ||
      (m.description || '').toLowerCase().includes(search)
    );
  }

  if (sort) {
    const [field, dir] = sort.split('-');
    filtered = filtered.slice().sort((a, b) => {
      let va = a[field] || '';
      let vb = b[field] || '';
      if (field === 'duration' || field === 'duration_minutes') {
        va = Number(a.duration_minutes) || 0;
        vb = Number(b.duration_minutes) || 0;
      } else {
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  filteredScreeningsMovies = filtered;
  renderMoviesForScreenings(filteredScreeningsMovies);
}

// Update renderMoviesForScreenings to accept a parameter:
function renderMoviesForScreenings(movies = allMovies) {
  const $tbody = $('#screenings-movies-table tbody');
  if (!$tbody.length) return;
  $tbody.empty();
  movies.forEach(movie => {
    const $tr = $(`
      <tr>
        <td>${movie.title}</td>
        <td>${movie.description || ''}</td>
        <td>${movie.duration_minutes || ''}</td>
        <td>${movie.genre || ''}</td>
        <td><button id="add-screening-btn-${movie.movie_id}" data-id="${movie.movie_id}" class="manager-btn add-btn">Add Screening</button></td>
      </tr>
    `);
    $tbody.append($tr);

    $(`#add-screening-btn-${movie.movie_id}`).on('click', function () {
      const movieId = $(this).data('id');
      showAddScreeningModal(movieId);
    });
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

  // Use current date/time as default
  const defaultTime = getCurrentDateTimeLocal();
  const startTime = prompt('Enter start time (YYYY-MM-DDTHH:MM):', defaultTime);
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
  filterAndSortScreenings();
}

function renderScreeningsTable(screenings = allScreenings) {
  const $tbody = $('#screenings-table tbody');
  if (!$tbody.length) return;
  $tbody.empty();
  screenings.forEach(s => {
    const $tr = $(`
      <tr>
        <td>${s.screening_id}</td>
        <td>${s.movie_title || s.title || ''}</td>
        <td>${s.hall_name || ''}</td>
        <td>${
          s.start_time
            ? s.start_time.replace('T', ' ').slice(0, 16)
            : ''
        }</td>
        <td>
          <button id="edit-screening-btn-${s.screening_id}" data-id="${s.screening_id}" class="manager-btn edit-btn">Edit</button>
          <button id="delete-screening-btn-${s.screening_id}" data-id="${s.screening_id}" class="manager-btn delete-btn">Delete</button>
        </td>
      </tr>
    `);
    $tbody.append($tr);

    // Attach event listeners as before...
    $(`#delete-screening-btn-${s.screening_id}`).on('click', async function () {
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

    $(`#edit-screening-btn-${s.screening_id}`).on('click', async function () {
      const id = $(this).data('id');
      const screening = allScreenings.find(s => s.screening_id === id);

      if (!allHalls.length) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/halls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        allHalls = await res.json();
      }

      const currentHallId = typeof screening.hall_id !== 'undefined' ? screening.hall_id : '';
      const hallOptions = allHalls.map(h => `${h.hall_id}: ${h.name}`).join('\n');
      const newHallId = prompt(
        `Enter new hall ID (current: ${currentHallId}):\n${hallOptions}`,
        currentHallId
      );
      if (!newHallId) return;

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

$('#screenings-movie-db-search-btn').on('click', filterAndSortScreeningsMovies);
$('#screenings-movie-db-search-reset').on('click', () => {
  $('#screenings-movie-db-search-input').val('');
  filterAndSortScreeningsMovies();
});
$('#screenings-movie-db-sort').on('change', filterAndSortScreeningsMovies);
$('#screenings-movie-db-search-input').on('keypress', function(e) {
  if (e.which === 13) filterAndSortScreeningsMovies();
});


// -- Toggle screenings table visibility --

$('#toggle-screenings-movies-table').on('click', function () {
  $('#screenings-movies-table-container').slideToggle(200);
  const $btn = $(this);
  if ($btn.text().includes('Hide')) {
    $btn.text('Show Movies in Database Table');
  } else {
    $btn.text('Hide Movies in Database Table');
  }
});

$('#toggle-screenings-table').on('click', function () {
  $('#screenings-table-container').slideToggle(200);
  const $btn = $(this);
  if ($btn.text().includes('Hide')) {
    $btn.text('Show Screenings Table');
  } else {
    $btn.text('Hide Screenings Table');
  }
});

let filteredScreenings = [];

function filterAndSortScreenings() {
  let filtered = allScreenings;
  const search = $('#screenings-table-search-input').val().toLowerCase();
  const sort = $('#screenings-table-sort').val();

  if (search) {
    filtered = filtered.filter(s =>
      (s.movie_title || s.title || '').toLowerCase().includes(search) ||
      (s.hall_name || '').toLowerCase().includes(search) ||
      String(s.screening_id).includes(search)
    );
  }

  if (sort) {
    const [field, dir] = sort.split('-');
    filtered = filtered.slice().sort((a, b) => {
      let va = a[field] || '';
      let vb = b[field] || '';
      // For start_time, sort as date
      if (field === 'start_time') {
        va = new Date(va);
        vb = new Date(vb);
      } else {
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  filteredScreenings = filtered;
  renderScreeningsTable(filteredScreenings);
}

$('#screenings-table-search-btn').on('click', filterAndSortScreenings);
$('#screenings-table-search-reset').on('click', () => {
  $('#screenings-table-search-input').val('');
  filterAndSortScreenings();
});
$('#screenings-table-sort').on('change', filterAndSortScreenings);
$('#screenings-table-search-input').on('keypress', function(e) {
  if (e.which === 13) filterAndSortScreenings();
});



