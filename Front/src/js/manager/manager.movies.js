const API_BASE = window.API_BASE || 'http://localhost:3000';

let allMoviesDb = [];

export function initMovieManagement() {
    // Attach event handlers for movie tab
    $('#movie-db-search-btn').on('click', filterAndSortMovies);
    $('#movie-db-search-reset').on('click', () => {
        $('#movie-db-search-input').val('');
        filterAndSortMovies();
    });
    $('#movie-db-sort').on('change', filterAndSortMovies);
    $('#movie-db-search-input').on('keypress', function (e) {
        if (e.which === 13) filterAndSortMovies();
    });

    fetchAndRenderMovies();
}

// --- TMDB Movie Search and Add to Database ---

let tmdbGenres = {}; // Store TMDB genres globally

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

// Render TMDB search results
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
            .filter(Boolean)
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
    // Wait for all promises to resolve and join the results
    const liElements = await Promise.all(moviePromises);
    $ul.append(liElements.join(''));
    $container.append($ul);
}

// TMDB Search Form Handler
$(document).ready(() => {
    // Fetch genres on page load if the form exists
    if ($('#tmdb-search-form').length) {
        fetchTMDBGenres();
    }

    $('#tmdb-search-form').on('submit', async function (e) {
        e.preventDefault();
        // Always show the movie management section after search
        // This ensures the section is visible when the search is performed
        // and allows the user to see results immediately
        if (typeof showSection === 'function') showSection($('#movie-management-section'));
        const query = $('#tmdb-search-input').val().trim();
        if (!query) return;

        if (!Object.keys(tmdbGenres).length) {
            await fetchTMDBGenres();
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

    // Clear TMDB search
    $('#tmdb-clear-btn').on('click', () => {
        $('#tmdb-search-input').val('');
        $('#tmdb-results').empty();
    });

    // Add-to-database handler (event delegation)
    $('#tmdb-results').on('click', '.add-tmdb-movie', async function () {
        const $btn = $(this);
        const movieToAdd = {
            title: decodeURIComponent($btn.data('title')),
            description: decodeURIComponent($btn.data('description')),
            release_date: $btn.data('release'),
            duration_minutes: $btn.data('duration') || 120,
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
                await fetchAndRenderMovies();
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

// Fetch and render movies from the database
// This function fetches movies from the backend and renders them in the table
export async function fetchAndRenderMovies() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/api/movies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status} ${res.statusText}`);
        allMoviesDb = await res.json();
        renderMoviesTable(allMoviesDb);
    } catch (err) {
        console.error('Failed to fetch and render movies:', err);
        alert('Failed to load movies. Please try again.');
    }
}

// Render movies in the table
// This function takes an array of movie objects and renders them in the movies table
export function renderMoviesTable(movies) {
    const $tbody = $('#movies-table tbody');
    if (!$tbody.length) return;
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
                        await fetchAndRenderMovies();
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
            const movieToEdit = allMoviesDb.find(m => m.movie_id === id);
            if (!movieToEdit) {
                alert('Movie not found for editing.');
                return;
            }

            const newDescription = prompt('Edit description:', movieToEdit.description || '');
            if (newDescription === null) return;

            const newDuration = prompt('Edit duration (minutes):', movieToEdit.duration_minutes || '');
            if (newDuration === null) return;
            if (isNaN(newDuration) || newDuration <= 0) {
                alert('Please enter a valid positive number for duration.');
                return;
            }

            const newGenres = prompt('Edit genres (comma separated):', movieToEdit.genre || '');
            if (newGenres === null) return;

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
                        duration_minutes: parseInt(newDuration),
                        genre: newGenres
                    })
                });
                if (res.ok) {
                    alert('Movie updated successfully!');
                    await fetchAndRenderMovies();
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

// Filter and sort movies based on search input and selected sort option
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
            let va = a[field];
            let vb = b[field];

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

    renderMoviesTable(filtered);
}