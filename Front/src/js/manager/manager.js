// manager.js
import * as userTab from './manager.users.js';
import * as movieTab from './manager.movies.js';
import * as screeningsTab from './manager.screenings.js';
import { renderScreeningChart, setScreeningsData, setHallsData } from '../chartManager.js';

const API_BASE = window.API_BASE || 'http://localhost:3000';

// Call initialization functions for each tab
userTab.initUserManagement();
movieTab.initMovieManagement();
screeningsTab.initScreeningsManagement();


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
        await screeningsTab.fetchMoviesForScreenings(); // Populate movies for screening creation dropdown/table
        await screeningsTab.fetchAndRenderScreenings(); // Populate and render existing screenings

        // Pass data to chartManager and render chart
        setScreeningsData(screeningsTab.allScreenings);
        setHallsData(screeningsTab.allHalls); // Ensure allHalls is populated when this tab is active
        await renderScreeningChart();
    });
});

