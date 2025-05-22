// Check for manager role
export async function updateNavbarForRole() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/me', {
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
      const res = await fetch('http://localhost:3000/api/me', {
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
    const res = await fetch('http://localhost:3000/api/getAllUsers', {
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
        <select data-user-id="${user.user_id}">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
          <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>manager</option>
        </select>
        ${
          user.username !== 'manager'
            ? `<button class="delete-user-btn" data-user-id="${user.user_id}">Delete</button>`
            : `<button class="delete-user-btn" disabled title="Cannot delete this user">Delete</button>`
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
    const res = await fetch('http://localhost:3000/api/changeUserRole', {
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
    const res = await fetch(`http://localhost:3000/api/deleteUser/${userId}`, {
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