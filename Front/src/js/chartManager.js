// chartManager.js
const API_BASE = 'http://localhost:3000'; // Keep API_BASE if needed for chart-specific fetches

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
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(now);
    // Adjust to Monday of the current week. If today is Sunday (0), go back 6 days. Otherwise, go back dayOfWeek - 1 days.
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

function generateDaySlots() {
    const weekRange = getWeekDateRange();
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekRange.start);
        date.setDate(weekRange.start.getDate() + i);
        days.push({
            name: dayNames[i],
            date: date.toISOString().split('T')[0], // YYYY-MM-DD format
            fullDate: new Date(date)
        });
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

    const weekRange = getWeekDateRange();
    const daySlots = generateDaySlots();
    const colors = generateColors();

    // Ensure halls are loaded for chart rendering.
    // If allHalls is empty, try to fetch it, but it should ideally be populated by manager.js
    if (!allHalls.length) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/halls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allHalls = await res.json();
        } catch (err) {
            console.error('Failed to fetch halls for chart:', err);
            return;
        }
    }

    // Filter screenings for this week
    const weekScreenings = allScreenings.filter(screening => {
        const screeningDate = new Date(screening.start_time);
        return screeningDate >= weekRange.start && screeningDate <= weekRange.end;
    });

    // Chart dimensions and constants - These will now be used to set CSS variables
    const hallNameWidth = 150;
    const dayWidth = 150;
    const headerHeight = 60;
    const hallHeight = 80;
    const numDays = 7;
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
    `;

    daySlots.forEach((day, index) => {
        chartHTML += `
            <div class="chart-day-header" style="--day-index: ${index};">
                ${day.name} ${day.date.slice(5)}
            </div>
        `;
    });
    chartHTML += `</div>`;

    // Time slots header (hours within each day)
    chartHTML += `<div class="chart-header-row chart-time-slots">`;
    daySlots.forEach((day, dayIndex) => {
        for (let hour = 0; hour < 24; hour += 4) { // Show every 4 hours to save space
            chartHTML += `
                <div class="chart-hour-slot" style="--day-index: ${dayIndex}; --hour-offset: ${hour};">
                    ${hour.toString().padStart(2, '0')}:00
                </div>
            `;
        }
    });
    chartHTML += `</div>`;

    // Add hall rows and screenings
    allHalls.forEach((hall, hallIndex) => {
        chartHTML += `
            <div class="chart-hall-row" style="--hall-index: ${hallIndex};">
                <div class="chart-hall-name">
                    ${hall.name}
                </div>
                <div class="chart-hall-timeline">
        `;

        // Add screenings for this hall
        const hallScreenings = weekScreenings.filter(s => s.hall_id === hall.hall_id);

        hallScreenings.forEach((screening, screeningIndex) => {
            const startTimeStr = screening.start_time;
            const startTime = new Date(startTimeStr + (startTimeStr.includes('T') && !startTimeStr.includes('Z') ? 'Z' : ''));

            const duration = screening.duration_minutes || 120; // Default 2 hours
            const endTime = new Date(startTime.getTime() + duration * 60000);

            const screeningDateStr = startTime.toISOString().split('T')[0];
            const dayIndex = daySlots.findIndex(day => day.date === screeningDateStr);

            if (dayIndex === -1) return; // Skip if not in current week

            const startHour = startTime.getUTCHours() + startTime.getUTCMinutes() / 60;
            const durationHours = duration / 60;

            const color = colors[screeningIndex % colors.length]; // Still dynamic color
            const movieTitle = screening.movie_title || screening.title || 'Unknown Movie';
            const timeText = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

            chartHTML += `
                <div class="chart-screening-block"
                     style="--day-index: ${dayIndex}; --start-hour: ${startHour}; --duration-hours: ${durationHours}; background-color: ${color};"
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
    for (let day = 0; day <= 7; day++) {
        chartHTML += `
            <div class="chart-day-separator" style="--day-index: ${day};"></div>
        `;
        if (day < 7) {
            for (let hour = 0; hour <= 24; hour += 2) {
                const opacityClass = hour % 6 === 0 ? 'chart-grid-line-strong' : 'chart-grid-line-light';
                chartHTML += `
                    <div class="chart-hour-grid-line ${opacityClass}" style="--day-index: ${day}; --hour-offset: ${hour};"></div>
                `;
            }
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