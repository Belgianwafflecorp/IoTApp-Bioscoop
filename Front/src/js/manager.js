const API_BASE = 'http://localhost:3000';

// Check for manager role
export async function updateNavbarForRole() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      console.log('Failed to fetch user info');
      return;
    }

    const user = await res.json();
    console.log('User info:', user); // <--- Add this line
    if (user.role === 'manager') {
      // Show the manager tab
      const navLinks = document.querySelector('.nav-links');
      if (navLinks && !document.getElementById('manager-tab')) {
        const managerTab = document.createElement('a');
        managerTab.href = '/pages/manager.html';
        managerTab.textContent = 'Manager';
        managerTab.id = 'manager-tab';
        managerTab.className = 'manager-tab'; // class for styling
        navLinks.appendChild(managerTab);
      }
    }
  } catch (err) {
    console.error('Failed to fetch user info', err);
  }
}


// Redirect non-managers away from manager.html
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('manager.html')) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '../index.html';
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        window.location.href = '../index.html';
        return;
      }
      const data = await res.json();
      if (data.role !== 'manager') {
        window.location.href = '../index.html';
      }
    } catch {
      window.location.href = '../index.html';
    }
  }
});

let allUsers = []; // Store all users for filtering

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
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '';

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
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners for role change
  tbody.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const userId = e.target.getAttribute('data-user-id');
      const newRole = e.target.value;
      await changeUserRole(userId, newRole);
      await fetchAndRenderUsers(document.getElementById('user-search-input').value);
    });
  });

  // Add event listeners for delete buttons
  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', async (e) => {
        const userId = btn.getAttribute('data-user-id');
        if (confirm('Are you sure you want to delete this user?')) {
          await deleteUser(userId);
          await fetchAndRenderUsers(document.getElementById('user-search-input').value);
        }
      });
    }
  });
}

// Search bar event listeners
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('user-search-input');
  const searchBtn = document.getElementById('user-search-btn');
  const resetBtn = document.getElementById('user-search-reset');
  const showManagersBtn = document.getElementById('show-managers-btn');

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      renderUsersTable(searchInput.value);
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      searchInput.value = '';
      renderUsersTable('');
    });
  }
  if (showManagersBtn) {
    showManagersBtn.addEventListener('click', () => {
      // Only show users with role 'manager'
      const managers = allUsers.filter(user => user.role === 'manager');
      renderUsersTable('', managers);
    });
  }
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

// Delete user function
async function deleteUser(userId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/deleteUser/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

// Only run on manager.html
if (window.location.pathname.endsWith('manager.html')) {
  document.addEventListener('DOMContentLoaded', () => fetchAndRenderUsers());
}

// Tab switching logic
document.addEventListener('DOMContentLoaded', () => {
  const userTab = document.getElementById('user-management-tab');
  const movieTab = document.getElementById('movie-management-tab');
  const screeningsTab = document.getElementById('screenings-management-tab');

  const userSection = document.getElementById('user-management-section');
  const movieSection = document.getElementById('movie-management-section');
  const screeningsSection = document.getElementById('screenings-management-section');

  function showSection(section) {
    userSection.style.display = 'none';
    movieSection.style.display = 'none';
    screeningsSection.style.display = 'none';
    section.style.display = '';
  }

  if (userTab) userTab.addEventListener('click', () => showSection(userSection));
  if (movieTab) movieTab.addEventListener('click', () => showSection(movieSection));
  if (screeningsTab) screeningsTab.addEventListener('click', () => showSection(screeningsSection));
});

// --- Movie Management Tab Logic ---

// Search TMDB
document.getElementById('tmdb-search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('tmdb-search-input').value.trim();
  if (!query) return;
  const res = await fetch(`${API_BASE}/api/movies/tmdb/search?title=${encodeURIComponent(query)}`);
  const results = await res.json();
  renderTMDBResults(results);
});

function renderTMDBResults(results) {
  const container = document.getElementById('tmdb-results');
  container.innerHTML = '';
  if (!results.length) {
    container.textContent = 'No results found.';
    return;
  }
  const ul = document.createElement('ul');
  results.forEach(movie => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${movie.title}</strong> (${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'})<br>
      <em>${movie.overview || ''}</em><br>
      <button class="add-tmdb-movie"
        data-title="${encodeURIComponent(movie.title)}"
        data-description="${encodeURIComponent(movie.overview || '')}"
        data-release="${movie.release_date || ''}"
        data-duration=""
        data-genre=""
      >Add to Database</button>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);

  // Add event listeners for add buttons
  container.querySelectorAll('.add-tmdb-movie').forEach(btn => {
    btn.addEventListener('click', async () => {
      // You may want to fetch more details (like duration) from TMDB here if needed
      const movie = {
        title: decodeURIComponent(btn.getAttribute('data-title')),
        description: decodeURIComponent(btn.getAttribute('data-description')),
        release_date: btn.getAttribute('data-release'),
        duration_minutes: 120, 
        genre: btn.getAttribute('data-genre') || 'Unknown'
      };
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/movies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movie)
      });
      if (res.ok) {
        alert('Movie added!');
        fetchAndRenderMovies();
      } else {
        alert('Failed to add movie');
      }
    });
  });
}

// Fetch and render movies from your DB
async function fetchAndRenderMovies() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/movies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const movies = await res.json();
  renderMoviesTable(movies);
}

function renderMoviesTable(movies) {
  const tbody = document.querySelector('#movies-table tbody');
  tbody.innerHTML = '';
  movies.forEach(movie => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${movie.title}</td>
      <td>${movie.description || ''}</td>
      <td>${movie.release_date || ''}</td>
      <td>${movie.duration || ''}</td>
      <td>${movie.genre || ''}</td>
      <td><button class="delete-movie-btn" data-id="${movie.movie_id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Delete logic
  tbody.querySelectorAll('.delete-movie-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this movie?')) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/movies/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchAndRenderMovies();
        } else {
          alert('Failed to delete movie');
        }
      }
    });
  });
}

// Load movies when the tab is shown
document.getElementById('movie-management-tab').addEventListener('click', fetchAndRenderMovies);