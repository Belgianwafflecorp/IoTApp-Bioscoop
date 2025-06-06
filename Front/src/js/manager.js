// manager.js
import { renderScreeningChart, setScreeningsData, setHallsData } from './chartManager.js'; // Import chart functions

const API_BASE = 'http://localhost:3000';

// Global arrays to hold data, ensuring they are accessible across functions
let allScreenings = [];
let allHalls = [];
let allMovies = []; // For screenings movie selection
let allMoviesDb = []; // For the main movie management table (renamed for clarity if needed, or use allMovies consistently)
let allUsers = [];
let tmdbGenres = {};

// --- Helper Functions ---

// Function to fetch TMDB genres (used for movie management)
async function fetchTMDBGenres() {
    try {
        const res = await fetch(`${API_BASE}/api/movies/tmdb/genres`);
        if (!res.ok) {
            console.error('Failed to fetch TMDB genres:', res.status, res.statusText);
            return;
        }
        const genres = await res.json();
        tmdbGenres = {};
        genres.forEach(g => {
            tmdbGenres[Number(g.id)] = g.name;
        });
    } catch (err) {
        console.error('Failed to fetch TMDB genres:', err);
    }
}

// Function to get current date and time in local YYYY-MM-DDTHH:MM format
function getCurrentDateTimeLocal() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    // Format to YYYY-MM-DDTHH:MM for HTML datetime-local input
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Helper function to show a specific section and hide others.
 * This is crucial for tab switching functionality.
 * @param {jQuery} $sectionToShow - The jQuery object of the section to show.
 */
function showSection($sectionToShow) {
    // Hide all main content sections
    $('#user-management-section, #movie-management-section, #screenings-management-section').hide();
    // Show the targeted section
    $sectionToShow.show();
}

// --- Initialization and Role-Based Redirection ---

// Initial fetch for TMDB genres if the TMDB search form is present
$(document).ready(() => {
    if ($('#tmdb-search-form').length) {
        fetchTMDBGenres();
    }
});

// Update Navbar for Role (e.g., show/hide Manager tab)
export async function updateNavbarForRole() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            console.warn('Failed to fetch user info for navbar update, possibly unauthorized.');
            return;
        }

        const user = await res.json();
        if (user.role === 'manager') {
            // Only append if it doesn't already exist to prevent duplicates
            if (!$('.nav-links #manager-tab').length) {
                $('.nav-links').append(`<a href="/pages/manager.html" id="manager-tab" class="manager-tab">Manager</a>`);
            }
        }
    } catch (err) {
        console.error('Error in updateNavbarForRole:', err);
    }
}

// Redirect non-managers from manager.html
$(document).ready(async () => {
    if (window.location.pathname.endsWith('manager.html')) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../index.html'; // No token, redirect to login/home
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                window.location.href = '../index.html'; // Token invalid or expired, redirect
                return;
            }
            const data = await res.json();
            if (data.role !== 'manager') {
                window.location.href = '../index.html'; // Not a manager, redirect
            }
        } catch (err) {
            console.error('Error during manager.html access check:', err);
            window.location.href = '../index.html'; // Catch all for network errors etc.
        }
    }
});

// --- User Management ---

async function fetchAndRenderUsers(searchTerm = '') {
    const token = localStorage.getItem('token');
    if (!token) return; // Should be handled by initial redirect, but good to keep.

    try {
        const res = await fetch(`${API_BASE}/api/getAllUsers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        }
        allUsers = await res.json();
        renderUsersTable(searchTerm);
    } catch (err) {
        console.error('Failed to fetch users:', err);
        alert('Failed to load users. Please try again.');
    }
}

function renderUsersTable(searchTerm = '', customList = null) {
    const $tbody = $('#users-table tbody');
    if (!$tbody.length) return; // Exit if table body not found
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
                        // Prevent changing/deleting the default 'manager' user role/entry
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

    // Attach event listeners after appending all rows to avoid re-attaching
    $tbody.find('select').on('change', async function () {
        const userId = $(this).data('user-id');
        const newRole = $(this).val();
        await changeUserRole(userId, newRole);
        // Re-fetch and re-render to update the table with latest data
        await fetchAndRenderUsers($('#user-search-input').val());
    });

    $tbody.find('.delete-btn[data-user-id]').on('click', async function () {
        const userId = $(this).data('user-id');
        if (confirm('Are you sure you want to delete this user?')) {
            await deleteUser(userId);
            // Re-fetch and re-render to update the table with latest data
            await fetchAndRenderUsers($('#user-search-input').val());
        }
    });
}

// API Calls for User Management
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
        alert('Failed to change role due to a network error.');
        console.error('Error changing user role:', err);
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
        alert('Failed to delete user due to a network error.');
        console.error('Error deleting user:', err);
    }
}

// User Management Event Handlers
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
        renderUsersTable('', managers); // Render filtered list
    });
    // TMDB Clear button (placed here as it was in your original user section)
    $('#tmdb-clear-btn').on('click', () => {
        $('#tmdb-search-input').val('');
        $('#tmdb-results').empty();
    });

    // Initial fetch for users if on manager.html
    if (window.location.pathname.endsWith('manager.html')) {
        fetchAndRenderUsers();
    }
});

// --- Tab Switching Event Handlers ---
$(document).ready(() => {
    $('#user-management-tab').on('click', () => {
        showSection($('#user-management-section'));
        fetchAndRenderUsers(); // Ensure users are always fresh when tab is clicked
    });
    $('#movie-management-tab').on('click', async () => {
        showSection($('#movie-management-section'));
        await fetchAndRenderMovies(); // Fetch and render movies for the movie management section
    });
    $('#screenings-management-tab').on('click', async () => {
        showSection($('#screenings-management-section'));
        await fetchMoviesForScreenings(); // Populate movies for screening creation dropdown/table
        await fetchAndRenderScreenings(); // Populate and render existing screenings

        // Pass data to chartManager and render chart
        setScreeningsData(allScreenings);
        setHallsData(allHalls); // Ensure allHalls is populated when this tab is active
        await renderScreeningChart();
    });
});

// --- TMDB Movie Search and Add to Database ---

$('#tmdb-search-form').on('submit', async function (e) {
    e.preventDefault();
    const query = $('#tmdb-search-input').val().trim();
    if (!query) return;

    if (!Object.keys(tmdbGenres).length) {
        await fetchTMDBGenres(); // Ensure genres are fetched before search
    }

    try {
        const res = await fetch(`${API_BASE}/api/movies/tmdb/search?title=${encodeURIComponent(query)}`);
        if (!res.ok) {
            throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`);
        }
        const results = await res.json();
        renderTMDBResults(results);
    } catch (err) {
        console.error('Error during TMDB movie search:', err);
        $('#tmdb-results').html('<p class="error">Failed to search TMDB. Please try again.</p>');
    }
});

async function fetchTMDBRuntime(movieId) {
    try {
        const res = await fetch(`${API_BASE}/api/movies/tmdb/details/${movieId}`);
        if (!res.ok) {
            console.warn(`Failed to fetch TMDB details for movie ID ${movieId}: ${res.status} ${res.statusText}`);
            return null;
        }
        const details = await res.json();
        return details.runtime || null;
    } catch (err) {
        console.error(`Error fetching TMDB runtime for movie ID ${movieId}:`, err);
        return null;
    }
}

async function renderTMDBResults(results) {
    const $container = $('#tmdb-results');
    $container.empty();

    if (!results.length) {
        $container.text('No results found.');
        return;
    }

    const $ul = $('<ul></ul>');

    // Use Promise.all to wait for all runtime fetches before appending
    const moviePromises = results.map(async movie => {
        const genreNames = (movie.genre_ids || [])
            .map(id => tmdbGenres[Number(id)])
            .filter(Boolean) // Remove any undefined genres
            .join(', ');

        const duration = await fetchTMDBRuntime(movie.id);

        return `
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
        `;
    });

    const liElements = await Promise.all(moviePromises);
    $ul.append(liElements.join('')); // Join all LI strings and append once
    $container.append($ul);
}

// Attach event listener for 'Add to Database' button ONCE using event delegation
$(document).ready(() => {
    $('#tmdb-results').on('click', '.add-tmdb-movie', async function () {
        const $btn = $(this);
        const movieToAdd = {
            title: decodeURIComponent($btn.data('title')),
            description: decodeURIComponent($btn.data('description')),
            release_date: $btn.data('release'),
            duration_minutes: $btn.data('duration') || 120, // Default duration if not found
            genre: decodeURIComponent($btn.data('genre')) || 'Unknown'
        };
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/movies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(movieToAdd)
            });
            if (res.ok) {
                alert('Movie added successfully!');
                await fetchAndRenderMovies(); // Refresh the local movie database table
            } else {
                const errorData = await res.json();
                alert(`Failed to add movie: ${errorData.error || res.statusText}`);
            }
        } catch (error) {
            console.error('Error adding TMDB movie to database:', error);
            alert('Failed to add movie due to a network error.');
        }
    });
});

// --- Movie Management (Your Local Database) ---

async function fetchAndRenderMovies() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/api/movies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch movies: ${res.status} ${res.statusText}`);
        }
        allMoviesDb = await res.json(); // Populate allMoviesDb for filtering
        renderMoviesTable(allMoviesDb);
    } catch (err) {
        console.error('Failed to fetch and render movies:', err);
        alert('Failed to load movies. Please try again.');
    }
}

function renderMoviesTable(movies) {
    const $tbody = $('#movies-table tbody');
    if (!$tbody.length) return; // Exit if table body not found
    $tbody.empty();

    movies.forEach(movie => {
        const $tr = $(`
            <tr>
                <td>${movie.title}</td>
                <td>${movie.description || ''}</td>
                <td>${movie.duration_minutes || ''}</td>
                <td>${movie.genre || ''}</td>
                <td>
                    <button id="edit-movie-btn-${movie.movie_id}" data-id="${movie.movie_id}" class="manager-btn edit-btn">Edit</button>
                    <button id="delete-movie-btn-${movie.movie_id}" data-id="${movie.movie_id}" class="manager-btn delete-btn">Delete</button>
                </td>
            </tr>
        `);
        $tbody.append($tr);

        // Attach event listeners for each button
        $(`#delete-movie-btn-${movie.movie_id}`).on('click', async function () {
            const id = $(this).data('id');
            if (confirm('Are you sure you want to delete this movie? This will also delete associated screenings!')) {
                const token = localStorage.getItem('token');
                try {
                    const res = await fetch(`${API_BASE}/api/movies/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        alert('Movie deleted!');
                        await fetchAndRenderMovies(); // Re-fetch and render to update table
                        // Also refresh screenings table and chart if movie deletion affects them
                        await fetchAndRenderScreenings();
                        setScreeningsData(allScreenings);
                        setHallsData(allHalls);
                        await renderScreeningChart();
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to delete movie: ${errorData.error || res.statusText}`);
                    }
                } catch (error) {
                    console.error('Error deleting movie:', error);
                    alert('Failed to delete movie due to a network error.');
                }
            }
        });

        $(`#edit-movie-btn-${movie.movie_id}`).on('click', async function () {
            const id = $(this).data('id');
            // Find the original movie object from the full list (allMoviesDb)
            const movieToEdit = allMoviesDb.find(m => m.movie_id === id);
            if (!movieToEdit) {
                alert('Movie not found for editing.');
                return;
            }

            const newDescription = prompt('Edit description:', movieToEdit.description || '');
            if (newDescription === null) return; // User cancelled

            const newDuration = prompt('Edit duration (minutes):', movieToEdit.duration_minutes || '');
            if (newDuration === null) return; // User cancelled
            if (isNaN(newDuration) || newDuration <= 0) {
                alert('Please enter a valid positive number for duration.');
                return;
            }

            const newGenres = prompt('Edit genres (comma separated):', movieToEdit.genre || '');
            if (newGenres === null) return; // User cancelled

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_BASE}/api/movies/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        description: newDescription,
                        duration_minutes: parseInt(newDuration), // Ensure it's an integer
                        genre: newGenres
                    })
                });
                if (res.ok) {
                    alert('Movie updated successfully!');
                    await fetchAndRenderMovies(); // Re-fetch and render to update table
                    // If movie duration changes, it might affect screening overlaps, so refresh screenings too
                    await fetchAndRenderScreenings();
                } else {
                    const errorData = await res.json();
                    alert(`Failed to update movie: ${errorData.error || res.statusText}`);
                }
            } catch (error) {
                console.error('Error updating movie:', error);
                alert('Failed to update movie due to a network error.');
            }
        });
    });
}

// Filtering and sorting logic for the local movie database
function filterAndSortMovies() {
    let filtered = allMoviesDb; // Start with the full list
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
            let va = a[field];
            let vb = b[field];

            // Handle potential undefined/null values for sorting gracefully
            if (va === undefined || va === null) va = '';
            if (vb === undefined || vb === null) vb = '';

            // Special handling for numeric duration
            if (field === 'duration_minutes') {
                va = Number(va) || 0;
                vb = Number(vb) || 0;
            } else {
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
            }

            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderMoviesTable(filtered); // Render the filtered/sorted list
}

// Movie Management Event Handlers
$(document).ready(() => {
    $('#movie-db-search-btn').on('click', filterAndSortMovies);
    $('#movie-db-search-reset').on('click', () => {
        $('#movie-db-search-input').val('');
        filterAndSortMovies(); // Reset search and re-filter
    });
    $('#movie-db-sort').on('change', filterAndSortMovies);

    // Optionally: trigger sort/filter on Enter in search input
    $('#movie-db-search-input').on('keypress', function (e) {
        if (e.which === 13) filterAndSortMovies();
    });
});

// --- Screening Management ---

// Fetches movies for the 'Add Screening' movie selection table
async function fetchMoviesForScreenings() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/api/movies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch movies for screenings: ${res.status} ${res.statusText}`);
        }
        allMovies = await res.json(); // Populate allMovies for this section
        renderMoviesForScreenings();
    } catch (error) {
        console.error('Error fetching movies for screenings:', error);
        alert('Failed to load movies for screening creation. Please try again.');
    }
}

// Filter and sort for the movie selection table within the Screenings tab
function filterAndSortScreeningsMovies() {
    let filtered = allMovies; // Use the allMovies array
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
            let va = a[field];
            let vb = b[field];

            // Handle undefined/null values for sorting gracefully
            if (va === undefined || va === null) va = '';
            if (vb === undefined || vb === null) vb = '';

            if (field === 'duration_minutes') {
                va = Number(va) || 0;
                vb = Number(vb) || 0;
            } else {
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
            }
            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderMoviesForScreenings(filtered); // Render the filtered/sorted list
}

// Renders the table of movies from which screenings can be added
function renderMoviesForScreenings(movies = allMovies) {
    const $tbody = $('#screenings-movies-table tbody');
    if (!$tbody.length) return; // Exit if table body not found
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

        // Attach event listener for 'Add Screening' button
        $(`#add-screening-btn-${movie.movie_id}`).on('click', function () {
            const movieId = $(this).data('id');
            showAddScreeningModal(movieId);
        });
    });
}

// Modal/Prompt for adding a new screening
async function showAddScreeningModal(movieId) {
    if (!allHalls.length) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/halls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch halls');
            allHalls = await res.json();
        } catch (error) {
            console.error('Error fetching halls:', error);
            alert('Could not load halls. Please try again.');
            return;
        }
    }

    const hallOptions = allHalls.map(h => `${h.hall_id}: ${h.name}`).join('\n');
    const hallId = prompt(`Enter hall ID:\n${hallOptions}`);
    if (!hallId) return;

    const defaultTime = getCurrentDateTimeLocal();
    const startTimeLocal = prompt('Enter start time (YYYY-MM-DDTHH:MM):', defaultTime);
    if (!startTimeLocal) return;

    const dateObjLocal = new Date(startTimeLocal);
    const startTimeUTC = dateObjLocal.toISOString();

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/api/screenings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ movie_id: movieId, hall_id: parseInt(hallId), start_time: startTimeUTC })
        });
        if (res.ok) {
            alert('Screening added successfully!');
            await fetchAndRenderScreenings();
            setScreeningsData(allScreenings);
            setHallsData(allHalls);
            await renderScreeningChart();
        } else {
            const errorData = await res.json();
            alert(`Failed to add screening: ${errorData.error || res.statusText}`);
        }
    } catch (error) {
        console.error('Error adding screening:', error);
        alert('Failed to add screening due to a network error.');
    }
}

// Fetches and renders the main screenings table
async function fetchAndRenderScreenings() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/api/screenings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch screenings: ${res.status} ${res.statusText}`);
        }
        allScreenings = await res.json();

        if (!allHalls.length) {
            const hallRes = await fetch(`${API_BASE}/api/halls`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!hallRes.ok) throw new Error('Failed to fetch halls for screenings');
            allHalls = await hallRes.json();
        }

        filterAndSortScreenings();
    } catch (error) {
        console.error('Error fetching and rendering screenings:', error);
        alert('Failed to load screenings. Please try again.');
    }
}

// Renders the main screenings table with the provided data
function renderScreeningsTable(screenings = allScreenings) {
    const $tbody = $('#screenings-table tbody');
    if (!$tbody.length) return;
    $tbody.empty();

    screenings.forEach(s => {
        // Append 'Z' to treat the retrieved MySQL DATETIME string as UTC
        const localDate = new Date(s.start_time + 'Z'); 
        const displayTime = localDate.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(', ', ' ');

        const $tr = $(`
            <tr>
                <td>${s.screening_id}</td>
                <td>${s.movie_title || s.title || ''}</td> <td>${s.hall_name || ''}</td> <td>${displayTime}</td>
                <td>
                    <button id="edit-screening-btn-${s.screening_id}" data-id="${s.screening_id}" class="manager-btn edit-btn">Edit</button>
                    <button id="delete-screening-btn-${s.screening_id}" data-id="${s.screening_id}" class="manager-btn delete-btn">Delete</button>
                </td>
            </tr>
        `);
        $tbody.append($tr);

        $(`#delete-screening-btn-${s.screening_id}`).on('click', async function () {
            const id = $(this).data('id');
            if (confirm('Delete this screening?')) {
                const token = localStorage.getItem('token');
                try {
                    const res = await fetch(`${API_BASE}/api/screenings/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        alert('Screening deleted!');
                        await fetchAndRenderScreenings();
                        setScreeningsData(allScreenings);
                        setHallsData(allHalls);
                        await renderScreeningChart();
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to delete screening: ${errorData.error || res.statusText}`);
                    }
                } catch (error) {
                    console.error('Error deleting screening:', error);
                    alert('Failed to delete screening due to a network error.');
                }
            }
        });

        $(`#edit-screening-btn-${s.screening_id}`).on('click', async function () {
            const id = $(this).data('id');
            const screening = allScreenings.find(scr => scr.screening_id === id);
            if (!screening) {
                alert('Screening not found for editing.');
                return;
            }

            if (!allHalls.length) {
                const token = localStorage.getItem('token');
                try {
                    const res = await fetch(`${API_BASE}/api/halls`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!res.ok) throw new Error('Failed to fetch halls for edit prompt');
                    allHalls = await res.json();
                } catch (error) {
                    console.error('Error fetching halls for edit:', error);
                    alert('Could not load hall options. Please try again.');
                    return;
                }
            }

            const currentHallId = screening.hall_id;
            const hallOptions = allHalls.map(h => `${h.hall_id}: ${h.name}`).join('\n');
            const newHallId = prompt(
                `Enter new hall ID (current: ${currentHallId}):\n${hallOptions}`,
                currentHallId
            );
            if (!newHallId) return;

            // Convert UTC start_time from DB to local for pre-filling the prompt
            // Add 'Z' to ensure correct UTC interpretation by Date constructor.
            const currentLocalTime = new Date(screening.start_time + 'Z').toLocaleString('en-CA', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(', ', 'T'); // Format for datetime-local input

            const newTimeInput = prompt(
                'Enter new start time (YYYY-MM-DDTHH:MM):',
                currentLocalTime
            );
            if (!newTimeInput) return;

            // Take the user's local input and convert it back to UTC for the backend.
            const newTimeUTC = new Date(newTimeInput).toISOString();

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_BASE}/api/screenings/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        hall_id: parseInt(newHallId),
                        start_time: newTimeUTC,
                        movie_id: screening.movie_id
                    })
                });
                if (res.ok) {
                    alert('Screening updated successfully!');
                    await fetchAndRenderScreenings();
                    setScreeningsData(allScreenings);
                    setHallsData(allHalls);
                    await renderScreeningChart();
                } else {
                    const errorData = await res.json();
                    alert(`Failed to update screening: ${errorData.error || res.statusText}`);
                }
            } catch (error) {
                console.error('Error updating screening:', error);
                alert('Failed to update screening due to a network error.');
            }
        });
    });
}

// Filtering and sorting logic for the main screenings table
function filterAndSortScreenings() {
    let filtered = allScreenings;
    const search = $('#screenings-table-search-input').val().toLowerCase();
    const sort = $('#screenings-table-sort').val();

    if (search) {
        filtered = filtered.filter(s =>
            (s.movie_title && s.movie_title.toLowerCase().includes(search)) ||
            (s.hall_name && s.hall_name.toLowerCase().includes(search)) ||
            String(s.screening_id).includes(search)
        );
    }

    if (sort) {
        const [field, dir] = sort.split('-');
        filtered = filtered.slice().sort((a, b) => {
            let va = a[field];
            let vb = b[field];

            if (va === undefined || va === null) va = '';
            if (vb === undefined || vb === null) vb = '';

            if (field === 'start_time') {
                // Ensure sorting treats these as UTC dates
                va = new Date(va + 'Z'); 
                vb = new Date(vb + 'Z');
            } else {
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
            }
            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderScreeningsTable(filtered);
}

// Screenings Management Event Handlers
$(document).ready(() => {
    $('#screenings-movie-db-search-btn').on('click', filterAndSortScreeningsMovies);
    $('#screenings-movie-db-search-reset').on('click', () => {
        $('#screenings-movie-db-search-input').val('');
        filterAndSortScreeningsMovies();
    });
    $('#screenings-movie-db-sort').on('change', filterAndSortScreeningsMovies);
    $('#screenings-movie-db-search-input').on('keypress', function(e) {
        if (e.which === 13) filterAndSortScreeningsMovies();
    });

    $('#screenings-table-search-btn').on('click', filterAndSortScreenings);
    $('#screenings-table-search-reset').on('click', () => {
        $('#screenings-table-search-input').val('');
        filterAndSortScreenings();
    });
    $('#screenings-table-sort').on('change', filterAndSortScreenings);
    $('#screenings-table-search-input').on('keypress', function(e) {
        if (e.which === 13) filterAndSortScreenings();
    });

    $('#toggle-screenings-movies-table').on('click', function () {
        $('#screenings-movies-table-container').slideToggle(200);
        const $btn = $(this);
        $btn.text($btn.text().includes('Hide') ? 'Show Movies in Database Table' : 'Hide Movies in Database Table');
    });

    $('#toggle-screenings-table').on('click', function () {
        $('#screenings-table-container').slideToggle(200);
        const $btn = $(this);
        $btn.text($btn.text().includes('Hide') ? 'Show Screenings Table' : 'Hide Screenings Table');
    });

    $('#toggle-screening-chart').on('click', function () {
        $('#screening-chart-container').slideToggle(200);
        const $btn = $(this);
        $btn.text($btn.text().includes('Hide') ? 'Show Weekly Screening Schedule' : 'Hide Weekly Screening Schedule');
    });
});