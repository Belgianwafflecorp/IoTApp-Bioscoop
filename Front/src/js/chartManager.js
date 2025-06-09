// chartManager.js
import { API_BASE, API_URL } from '../apiConfig.js';

// These variables are used by the chart rendering and need to be accessible.
// They will be populated by manager.js and passed to the chart rendering function.
export let allScreenings = [];
export let allHalls = [];

export function setScreeningsData(screenings) {
    allScreenings = screenings;
}

export function setHallsData(halls) {
    allHalls = halls;
}

// --- SCREENING CHART VISUALIZATION ---
function getWeekDateRange() {
    const now = new Date(); // Current date (e.g., June 5, 2025)

    // Calculate the start date (Monday of the current week)
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(now);
    // Adjust to Monday of the current week. If today is Sunday (0), go back 6 days. Otherwise, go back dayOfWeek - 1 days.
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    // Set the end date to July 1, 2025 at 00:00:00.000
    const endDate = new Date('2025-07-01T00:00:00');
    // Ensure the end date includes the entire day by setting to the very end of the day before
    // Or, if we want to show up to and including July 1st, we need to go to the end of July 1st
    // Let's make it exclusive to 00:00 on July 1st, so it shows days *before* July 1st.
    // If it means "up to and including screenings that start at 2025-06-30 23:59:59", then '2025-07-01T00:00:00' as end is fine.
    // For simplicity, let's just make the range extend far enough.

    return { start: monday, end: endDate };
}

function generateDaySlots() {
    const { start: startDate, end: endDate } = getWeekDateRange();
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Corrected to start with Sunday for getDay()

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of the day

    // Loop to generate days until endDate is reached
    while (currentDate.getTime() < endDate.getTime()) {
        days.push({
            name: dayNames[currentDate.getDay()],
            date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
            fullDate: new Date(currentDate)
        });
        currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }
    return days;
}


function generateColors() {
    return [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        '#A55EEA', '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7'
    ];
}

export async function renderScreeningChart() {
    const $chartWrapper = $('.screening-chart-wrapper');
    const chartId = 'screening-chart';

    // Always clear and render inside the existing wrapper
    $chartWrapper.html(`
        <div id="${chartId}" class="screening-chart"></div>
    `);

    const weekRange = getWeekDateRange(); // This will now fetch a longer range
    const daySlots = generateDaySlots(); // This will generate days for the longer range
    const colors = generateColors();

    // Ensure halls are loaded for chart rendering.
    if (!allHalls.length) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/halls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allHalls = await res.json();
        } catch (err) {
            console.error('Failed to fetch halls for chart:', err);
            return;
        }
    }

    // Filter screenings for the extended date range
    const weekScreenings = allScreenings.filter(screening => {
        // Parse screening time as UTC if it has 'Z', else assume local for consistency
        const screeningDate = new Date(screening.start_time.includes('Z') ? screening.start_time : screening.start_time + 'Z');
        return screeningDate >= weekRange.start && screeningDate < weekRange.end; // Use < for endDate (exclusive)
    });

    // Chart dimensions and constants
    const hallNameWidth = 150; // px
    const dayWidth = 600; // px (representing 24 hours) - Each day needs its own full width
    const headerHeight = 60; // px
    const hallHeight = 80; // px
    const numDays = daySlots.length; // Dynamically set based on generated days
    const numHalls = allHalls.length;

    // Set CSS Custom Properties on the main chart element
    $(`#${chartId}`).css({
        '--hall-name-width': `${hallNameWidth}px`,
        '--day-width': `${dayWidth}px`,
        '--header-height': `${headerHeight}px`,
        '--hall-height': `${hallHeight}px`,
        '--num-days': numDays,
        '--num-halls': numHalls
    });

    let chartHTML = `
        <div class="screening-chart-inner">
            <div class="chart-header-row chart-day-names">
                <div class="chart-corner-placeholder"></div>
    `;

    // Day headers
    daySlots.forEach((day, index) => {
        chartHTML += `
            <div class="chart-day-header" style="grid-column: ${index + 2};">
                ${day.name} ${day.date.slice(5)}
            </div>
        `;
    });
    chartHTML += `</div>`; // Close chart-day-names

    // Add hall rows and screenings
    allHalls.forEach((hall, hallIndex) => {
        chartHTML += `
            <div class="chart-hall-row" style="grid-row: ${hallIndex + 2};">
                <div class="chart-hall-name">
                    ${hall.name}
                </div>
                <div class="chart-hall-timeline">
        `;

        // Add screenings for this hall
        const hallScreenings = weekScreenings.filter(s => s.hall_id === hall.hall_id);

        hallScreenings.forEach((screening, screeningIndex) => {
            const startTimeStr = screening.start_time;
            // Parse start time as UTC if it includes 'Z', otherwise assume local and append 'Z' for consistent parsing
            const _startTime = new Date(startTimeStr.includes('Z') ? startTimeStr : startTimeStr + 'Z');

            const duration = screening.duration_minutes || 120; // Default 2 hours (120 minutes)
            const endTime = new Date(_startTime.getTime() + duration * 60000);

            const screeningDateStr = _startTime.toISOString().split('T')[0];
            const dayIndex = daySlots.findIndex(day => day.date === screeningDateStr);

            if (dayIndex === -1) return; // Skip if not in current range

            // Calculate start time as a fraction of the day (0-23.99) in UTC
            const startOfDay = new Date(_startTime);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const minutesIntoDay = (_startTime.getTime() - startOfDay.getTime()) / (60 * 1000);
            const startHourFraction = minutesIntoDay / 60; // e.g., 12.0 for 12:00, 16.0 for 16:00

            const durationHours = duration / 60;

            const color = colors[screeningIndex % colors.length];
            const movieTitle = screening.movie_title || screening.title || 'Unknown Movie';

            // Display time in local timezone for the tooltip and block text
            // Create a *new* Date object for local time display, so it uses the browser's timezone
            const displayLocalStartTime = new Date(startTimeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const displayLocalEndTime = new Date(new Date(startTimeStr).getTime() + duration * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const timeText = `${displayLocalStartTime} - ${displayLocalEndTime}`;


            chartHTML += `
                <div class="chart-screening-block"
                     style="--day-index: ${dayIndex}; --start-hour-fraction: ${startHourFraction}; --duration-hours: ${durationHours}; background-color: ${color};"
                     title="Movie: ${movieTitle}&#10;Hall: ${hall.name}&#10;Date: ${screeningDateStr}&#10;Time: ${timeText}&#10;Duration: ${duration} minutes">
                    <div class="screening-movie-title">
                        ${movieTitle}
                    </div>
                    <div class="screening-time-text">
                        ${timeText}
                    </div>
                </div>
            `;
        });
        chartHTML += `
                </div>
            </div>
        `;
    });

    // Add vertical day separator lines and hour grid lines
    // These should span the height of the entire content area, including headers and hall rows
    for (let day = 0; day < numDays; day++) {
        // Vertical separators between days
        chartHTML += `
            <div class="chart-day-separator" style="grid-column: ${day + 2};"></div>
        `;
        // Hour grid lines within each day's column
        for (let hour = 0; hour <= 24; hour += 2) {
            const opacityClass = hour % 6 === 0 ? 'chart-grid-line-strong' : 'chart-grid-line-light';
            chartHTML += `
                <div class="chart-hour-grid-line ${opacityClass}" style="grid-column: ${day + 2}; --hour-offset: ${hour};"></div>
            `;
        }
    }

    chartHTML += `</div>`; // Close the main chart-inner container

    // Add legend
    const uniqueMovies = [...new Set(weekScreenings.map(s => s.movie_title || s.title || 'Unknown Movie'))];
    let legendHTML = '<div class="chart-legend"><h4>Legend:</h4><div class="chart-legend-items">';

    uniqueMovies.forEach((movie, index) => {
        const color = colors[index % colors.length];
        legendHTML += `
            <div class="chart-legend-item">
                <div class="chart-legend-color-box" style="background: ${color};"></div>
                <span>${movie}</span>
            </div>
        `;
    });
    legendHTML += '</div></div>';

    $(`#${chartId}`).html(chartHTML + legendHTML);

    // Add click handlers for screening blocks
    $(`#${chartId} [title]`).on('click', function() {
        const title = $(this).attr('title');
        alert(title.replace(/&#10;/g, '\n'));
    });
}