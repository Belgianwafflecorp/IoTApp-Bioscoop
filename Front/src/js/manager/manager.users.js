import { API_URL } from '../../apiConfig.js';

// global variable to store all users
let allUsers = [];

// Function to group reservations by movie, hall, start time, and reservation time
// This will help in displaying reservations in a more organized manner 
// Without duplicating rows for the same reservation with multiple seats
// Each reservation will show all seats in a single row
function groupReservations(reservations) {
    const grouped = {};
    reservations.forEach(r => {
        const key = `${r.movie_title}|${r.hall_name}|${r.start_time}|${r.reservation_time}`;
        if (!grouped[key]) {
            grouped[key] = { ...r, seats: [] };
        }
        grouped[key].seats.push(`${r.seat_row || ''}${r.seat_number || ''}`);
    });
    return Object.values(grouped);
}

// Function to format date strings to local time
function formatToLocal(dateStr) {
    if (!dateStr) return '';
    let d = dateStr.endsWith('Z') ? new Date(dateStr) : new Date(dateStr + 'Z');
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

// Function to fetch all users and render the users table
// This function will be called when the user management tab is opened
export async function fetchAndRenderUsers(searchTerm = '') {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/getAllUsers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        allUsers = await res.json();
        renderUsersTable(searchTerm);
    } catch (err) {
        console.error('Failed to fetch users:', err);
        alert('Failed to load users. Please try again.');
    }
}

// Function to render the users table
// This function will create the HTML structure for the users table
export function renderUsersTable(searchTerm = '', customList = null) {
    const $tbody = $('#users-table tbody');
    if (!$tbody.length) return;
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
        // Main user row
        const $tr = $(`
            <tr class="user-row" data-user-id="${user.user_id}" style="cursor:pointer;">
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

        // Collapsible user reservations row (hidden by default)
        const $resRow = $(`
            <tr class="user-reservations-row" data-user-id="${user.user_id}" style="display:none; background:#222;">
                <td colspan="4">
                    <div class="user-reservations-content" style="padding:0.5em 1em;">Loading...</div>
                </td>
            </tr>
        `);
        $tbody.append($resRow);
    });

    // Attach event listeners after appending all rows
    $tbody.find('select').on('change', async function () {
        const userId = $(this).data('user-id');
        const newRole = $(this).val();
        await changeUserRole(userId, newRole);
        await fetchAndRenderUsers($('#user-search-input').val());
    });

    $tbody.find('.delete-btn[data-user-id]').on('click', async function (e) {
        e.stopPropagation();
        const userId = $(this).data('user-id');
        if (confirm('Are you sure you want to delete this user?')) {
            await deleteUser(userId);
            await fetchAndRenderUsers($('#user-search-input').val());
        }
    });

    // Collapsible: Show reservations on row click
    $tbody.find('.user-row').on('click', async function (e) {
        if ($(e.target).is('select') || $(e.target).is('button')) return;

        const userId = $(this).data('user-id');
        const $resRow = $tbody.find(`.user-reservations-row[data-user-id="${userId}"]`);
        if ($resRow.is(':visible')) {
            $resRow.hide();
            return;
        }
        $tbody.find('.user-reservations-row').hide();

        $resRow.show();
        const $content = $resRow.find('.user-reservations-content');
        $content.text('Loading...');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/users/${userId}/reservations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const reservations = await res.json();
            if (!reservations.length) {
                $content.html('<em>No reservations found.</em>');
                return;
            }
            const grouped = groupReservations(reservations);
            $content.html(`
                <table class="user-reservations-table" style="width:100%;margin-top:0.5em;font-size:0.95em;">
                  <thead>
                    <tr>
                      <th>Movie</th>
                      <th>Hall</th>
                      <th>Seats</th>
                      <th>Start Time</th>
                      <th>Reserved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${grouped.map(r => `
                      <tr>
                        <td>${r.movie_title || ''}</td>
                        <td>${r.hall_name || ''}</td>
                        <td>${r.seats.join(', ')}</td>
                        <td>${formatToLocal(r.start_time)}</td>
                        <td>${formatToLocal(r.reservation_time)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
            `);
        } catch (err) {
            $content.html('<span style="color:red;">Failed to load reservations.</span>');
        }
    });
}

// Function to change user role
async function changeUserRole(userId, newRole) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/changeUserRole`, {
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
        alert('Failed to change role due to a network error.');
        console.error('Error changing user role:', err);
    }
}

// Function to delete a user
async function deleteUser(userId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/deleteUser/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Failed to delete user');
        }
    } catch (err) {
        alert('Failed to delete user due to a network error.');
        console.error('Error deleting user:', err);
    }
}

// Function to initialize user management features
// This function will be called when the manager page is loaded
// It sets up event handlers and fetches initial data
export function initUserManagement() {
    // Attach event handlers for user tab
    $('#user-search-btn').on('click', () => renderUsersTable($('#user-search-input').val()));
    $('#user-search-reset').on('click', () => {
        $('#user-search-input').val('');
        renderUsersTable('');
    });
    $('#show-managers-btn').on('click', () => {
        const managers = allUsers.filter(user => user.role === 'manager');
        renderUsersTable('', managers);
    });

    // Initial fetch
    if (window.location.pathname.endsWith('manager.html')) {
        fetchAndRenderUsers();
    }
}