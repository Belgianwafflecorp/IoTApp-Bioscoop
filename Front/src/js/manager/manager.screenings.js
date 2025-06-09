import { API_URL } from '../../apiConfig.js';

import { renderScreeningChart, setScreeningsData, setHallsData } from '../chartManager.js';

let allScreenings = [];
let allHalls = [];
let allMovies = [];

// --- Initialization ---
export function initScreeningsManagement() {
    // Event handlers for movies-in-database table (for adding screenings)
    $('#screenings-movie-db-search-btn').on('click', filterAndSortScreeningsMovies);
    $('#screenings-movie-db-search-reset').on('click', () => {
        $('#screenings-movie-db-search-input').val('');
        filterAndSortScreeningsMovies();
    });
    $('#screenings-movie-db-sort').on('change', filterAndSortScreeningsMovies);
    $('#screenings-movie-db-search-input').on('keypress', function(e) {
        if (e.which === 13) filterAndSortScreeningsMovies();
    });

    // Event handlers for main screenings table
    $('#screenings-table-search-btn').on('click', filterAndSortScreenings);
    $('#screenings-table-search-reset').on('click', () => {
        $('#screenings-table-search-input').val('');
        filterAndSortScreenings();
    });
    $('#screenings-table-sort').on('change', filterAndSortScreenings);
    $('#screenings-table-search-input').on('keypress', function(e) {
        if (e.which === 13) filterAndSortScreenings();
    });

    // Toggle buttons
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

    // Initial fetches
    fetchMoviesForScreenings();
    fetchAndRenderScreenings();
}

// --- Movies for Screenings Table ---
export async function fetchMoviesForScreenings() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/movies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch movies for screenings: ${res.status} ${res.statusText}`);
        allMovies = await res.json();
        renderMoviesForScreenings();
    } catch (error) {
        console.error('Error fetching movies for screenings:', error);
        alert('Failed to load movies for screening creation. Please try again.');
    }
}

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

    renderMoviesForScreenings(filtered);
}

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
    if (!allHalls.length) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/halls`, {
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
        const res = await fetch(`${API_URL}/screenings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ movie_id: movieId, hall_id: parseInt(hallId), start_time: startTimeUTC })
        });
        if (res.ok) {
            alert('Screening added successfully!');
            await fetchAndRenderScreenings();
            // Optionally update chart if you use one
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

function getCurrentDateTimeLocal() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// --- Main Screenings Table ---
export async function fetchAndRenderScreenings() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/screenings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch screenings: ${res.status} ${res.statusText}`);
        allScreenings = await res.json();

        if (!allHalls.length) {
            const hallRes = await fetch(`${API_URL}/halls`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!hallRes.ok) throw new Error('Failed to fetch halls for screenings');
            allHalls = await hallRes.json();
        }

        filterAndSortScreenings();
    } catch (error) {
        console.error('Error fetching and rendering screenings:', error);
        alert('Failed to load screenings. Please try again.');
    }
}

export function renderScreeningsTable(screenings = allScreenings) {
    const $tbody = $('#screenings-table tbody');
    if (!$tbody.length) return;
    $tbody.empty();

    screenings.forEach(s => {
        let displayTime = '';
        if (s.start_time) {
            let dateStr = s.start_time;
            if (!dateStr.endsWith('Z')) dateStr += 'Z';
            const localDate = new Date(dateStr);
            if (!isNaN(localDate.getTime())) {
                displayTime = localDate.toLocaleString('en-CA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(', ', ' ');
            }
        }

        const $tr = $(`
            <tr>
                <td>${s.screening_id}</td>
                <td>${s.movie_title || s.title || ''}</td>
                <td>${s.hall_name || ''}</td>
                <td>${displayTime}</td>
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
                    const res = await fetch(`${API_URL}/screenings/${id}`, {
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
                    const res = await fetch(`${API_URL}/halls`, { headers: { 'Authorization': `Bearer ${token}` } });
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
            const currentLocalTime = new Date(screening.start_time + 'Z').toLocaleString('en-CA', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(', ', 'T');

            const newTimeInput = prompt(
                'Enter new start time (YYYY-MM-DDTHH:MM):',
                currentLocalTime
            );
            if (!newTimeInput) return;

            const newTimeUTC = new Date(newTimeInput).toISOString();

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_URL}/screenings/${id}`, {
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

function filterAndSortScreenings() {
    let filtered = allScreenings;
    const search = ($('#screenings-table-search-input').val() || '').toLowerCase();
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

export { allScreenings, allHalls };