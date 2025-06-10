// booking.js
import { showLoginStatus } from './scripts.js';
import { HOST_BASE, API_BASE, API_URL } from '../apiConfig.js';

let client; // This will be our Paho MQTT client instance
let screeningId;
let selectedSeatIds = [];

// This console.log here is still useful for initial debugging
console.log("Paho global object (before document ready):", typeof Paho !== 'undefined' ? Paho : "undefined or not yet loaded");

$(document).ready(async () => {
    // This console.log inside document.ready is also good for checking timing
    console.log("Paho global object (inside document ready):", typeof Paho !== 'undefined' ? Paho : "undefined or not yet loaded");

    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to book tickets.');
        window.location.href = '/pages/login.html';
        return;
    }

    await showLoginStatus();

    const urlParams = new URLSearchParams(window.location.search);
    screeningId = urlParams.get('screeningId');
    if (!screeningId) return alert('No screening selected');

    // Initialize MQTT connection for this screening
    console.log("Attempting to set up MQTT for screening ID:", screeningId);
    setupMqtt(screeningId);

    try {
        // Fetch initial screening and seat data
        const [screeningRes, seatsRes] = await Promise.all([
            fetch(`${API_URL}/screenings/${screeningId}`),
            fetch(`${API_URL}/screenings/${screeningId}/tickets`)
        ]);

        if (!screeningRes.ok || !seatsRes.ok) throw new Error('Failed to load data');

        const screeningData = await screeningRes.json();
        const movieTitle = screeningData.movie.title;

        // Fetch movie poster from TMDB if available
        try {
            const tmdbRes = await fetch(`${API_URL}/movies/details/${encodeURIComponent(movieTitle)}`);
            const tmdbData = await tmdbRes.json();
            $('#movie-poster').attr('src', tmdbData?.poster_url || '../src/assets/resources/images/movie-placeholder.jpg'); // Corrected path
        } catch {
            $('#movie-poster').attr('src', '../src/assets/resources/images/movie-placeholder.jpg'); // Corrected path
        }

        const seats = await seatsRes.json();
        $('#movie-title').text(screeningData.movie.title);
        $('#screening-date').text(formatDate(screeningData.start_time));
        $('#start-time').text(formatTime(screeningData.start_time));
        $('#genre').text(screeningData.movie.genre);
        $('#duration').text(screeningData.movie.duration);
        $('#release').text(screeningData.movie.release_date);

        // Initialize global seat data
        window.availableSeats = seats.filter(s => !s.isTaken);
        window.takenSeats = seats.filter(s => s.isTaken);
        console.log("Initial seat data loaded:", { available: window.availableSeats.length, taken: window.takenSeats.length });

        // Render the initial seat display
        updateSeatsDisplay();
    } catch (err) {
        console.error(err);
        alert('Failed to load screening information.');
    }

    // Event listener for the "Confirm Selection" button
    $('#confirm-btn').on('click', async () => {
        const reduced = parseInt($('#reduced').val()) || 0;
        const normal = parseInt($('#normal').val()) || 0;
        const premium = parseInt($('#premium').val()) || 0;
        const totalRequested = reduced + normal + premium;

        let seatIdsToReserve = [...selectedSeatIds];

        // If no seats are manually selected, auto-select based on ticket counts
        if (seatIdsToReserve.length === 0) {
            const available = window.availableSeats;
            const reducedSeats = available.filter(s => s.seat_type === 'reduced').slice(0, reduced);
            const normalSeats = available.filter(s => s.seat_type === 'normal').slice(0, normal);
            const premiumSeats = available.filter(s => s.seat_type === 'premium').slice(0, premium);
            seatIdsToReserve = [...reducedSeats, ...normalSeats, ...premiumSeats].map(s => s.seat_id);
        }

        if (seatIdsToReserve.length !== totalRequested) {
            return alert('Selected seats do not match ticket counts.');
        }

        console.log("Attempting to reserve seats:", seatIdsToReserve);

        try {
            const res = await fetch(`${API_URL}/reserve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: null, // user_id is derived from token on backend
                    screening_id: screeningId,
                    seat_ids: seatIdsToReserve
                })
            });

            if (res.ok) {
                alert('Reservation successful!');
                selectedSeatIds = []; // Clear selected seats after successful reservation
                // The seat grid will automatically update via the MQTT message received from the backend
                console.log("Reservation successful. Awaiting MQTT update for seat grid.");
            } else {
                const data = await res.json();
                alert(`Reservation failed: ${data.error}`);
                console.error("Reservation API failed:", data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error during reservation.');
        }
    });

    // Handle click on the circular logo to navigate home
    $('.circle').css('cursor', 'pointer').on('click', () => {
        window.location.href = '/index.html';
    });

    // Attach event listeners for ticket input changes
    ['#reduced', '#normal', '#premium'].forEach(id => {
        $(id).on('change', handleTicketInputChange);
    });
});

/**
 * Sets up the MQTT client connection and subscribes to the relevant topic.
 * @param {string} screeningId - The ID of the current screening.
 */
function setupMqtt(screeningId) {
    // Check if Paho and Paho.Client exist before trying to use it.
    // Your console logs indicate Paho.Client is the correct constructor.
    if (typeof Paho === 'undefined' || typeof Paho.Client === 'undefined') {
        console.error("Paho.Client is not defined. Ensure the Paho MQTT library script is loaded correctly.");
        return; // Exit if Paho.Client isn't available
    }

    // Generate a unique client ID for this browser session
    const clientId = 'web_client_' + Math.random().toString(16).substr(2, 8);
    
    // Configure your MQTT broker details.
    const mqttBrokerHost = new URL(`http://${HOST_BASE}`).hostname;
    const mqttBrokerPort = 8083; // Common WebSocket port for MQTT brokers like Mosquitto

    console.log(`MQTT Client ID: ${clientId}`);
    console.log(`Attempting to connect to MQTT broker at ws://${mqttBrokerHost}:${mqttBrokerPort}/mqtt`);

    // Initialize Paho MQTT client using Paho.Client (corrected)
    client = new Paho.Client(mqttBrokerHost, mqttBrokerPort, "/mqtt", clientId); 

    // Set callback handlers for connection events and incoming messages
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // Connect the client to the MQTT broker
    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: false,
        timeout: 10,
        keepAliveInterval: 30
    });

    function onConnect() {
        console.log("MQTT: Successfully Connected to broker!");
        // Subscribe to the topic specific to this screening's seat updates
        const topic = `screenings/${screeningId}/seat_updates`;
        client.subscribe(topic, {
            onSuccess: () => {
                console.log(`MQTT: Subscribed to topic: ${topic}`);
            },
            onFailure: (err) => {
                console.error(`MQTT: Failed to subscribe to topic ${topic}:`, err.errorMessage);
            }
        });
    }

    function onFailure(responseObject) {
        console.error("MQTT: Connection failed:", responseObject.errorMessage);
        // You might want to display a user-friendly message or retry connection here.
    }

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.error("MQTT: Connection lost:", responseObject.errorMessage);
            // Implement reconnect logic here if desired, e.g., setTimeout(() => client.connect(...), 5000);
        }
    }

    /**
     * Handles incoming MQTT messages.
     * Parses the message payload and updates the seat display.
     * @param {Paho.MQTT.Message} message - The received MQTT message object.
     */
    function onMessageArrived(message) {
        console.log("MQTT: Message received on topic:", message.destinationName, "Payload:", message.payloadString);
        try {
            const msg = JSON.parse(message.payloadString);
            if (msg.type === 'update' && Array.isArray(msg.data)) {
                // Update global seat arrays based on the received data
                window.availableSeats = msg.data.filter(s => !s.isTaken);
                window.takenSeats = msg.data.filter(s => s.isTaken);
                // Re-render the seat grid with the updated data
                updateSeatsDisplay();
                console.log("MQTT: Seat data updated from message. Available:", window.availableSeats.length, "Taken:", window.takenSeats.length);
            } else {
                console.warn("MQTT: Received message not in expected 'update' format:", msg);
            }
        } catch (err) {
            console.error('MQTT: Error parsing message payload:', err);
        }
    }
}

/**
 * Formats a date-time string into a human-readable time (e.g., "02:30 PM").
 * @param {string} dateTime - The date-time string.
 * @returns {string} The formatted time string.
 */
function formatTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a date string or date-time string into a human-readable date.
 * Displays "Today", "Tomorrow", or the full date.
 * @param {string} dateString - The date string (YYYY-MM-DD) or full dateTime string.
 * @returns {string} The formatted date string (e.g., "Today", "Tomorrow", "Saturday, June 8, 2025").
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Normalize dates to just the day part for comparison
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tm = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (d.getTime() === t.getTime()) {
        return 'Today';
    } else if (d.getTime() === tm.getTime()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

/**
 * Updates the display of available seats counts and triggers seat grid rendering.
 */
function updateSeatsDisplay() {
    $('#seats-reduced').text(window.availableSeats.filter(s => s.seat_type === 'reduced').length);
    $('#seats-normal').text(window.availableSeats.filter(s => s.seat_type === 'normal').length);
    $('#seats-premium').text(window.availableSeats.filter(s => s.seat_type === 'premium').length);
    renderSeatGrid();
    console.log("Seats display updated.");
}

/**
 * Renders the visual representation of the seat grid.
 * Updates seat states (taken, selected) and applies responsive sizing.
 */
function renderSeatGrid() {
    const $grid = $('#seat-grid');
    if (!$grid.length) return console.error('Seat grid container not found.');

    $grid.empty(); // Clear existing seats

    // Combine available and taken seats for rendering
    const allSeats = [...window.availableSeats, ...window.takenSeats.map(s => ({ ...s, isTaken: true }))];

    // Sort seats for consistent rendering order
    allSeats.sort((a, b) => {
        if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
        return a.seat_row.localeCompare(b.seat_row);
    });

    // Group seats by row
    const rows = {};
    allSeats.forEach(seat => {
        if (!rows[seat.seat_row]) rows[seat.seat_row] = [];
        rows[seat.seat_row].push(seat);
    });

    // Calculate max seats per row for responsive sizing
    let maxSeatsInRow = 0;
    for (const rowLabel in rows) {
        if (rows[rowLabel].length > maxSeatsInRow) {
            maxSeatsInRow = rows[rowLabel].length;
        }
    }

    // Apply CSS classes for seat grid scaling
    $grid.removeClass('seat-grid-small seat-grid-smaller');
    if (maxSeatsInRow >= 15) {
        $grid.addClass('seat-grid-smaller');
    } else if (maxSeatsInRow >= 10) {
        $grid.addClass('seat-grid-small');
    }

    // Render each row and its seats
    for (const rowLabel in rows) {
        $grid.append(`<div class="seat-row-label">Row ${rowLabel}</div>`);
        const $row = $('<div class="seat-row"></div>');

        rows[rowLabel].forEach(seat => {
            const isSelected = selectedSeatIds.includes(seat.seat_id);
            const $btn = $(`<div class="seat ${seat.seat_type} ${seat.isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}">${seat.seat_number}</div>`);

            // Attach click handler only if the seat is not taken
            if (!seat.isTaken) {
                $btn.on('click', () => {
                    const $input = $(`#${seat.seat_type}`);
                    let count = parseInt($input.val()) || 0;

                    if (selectedSeatIds.includes(seat.seat_id)) {
                        // Deselect seat
                        selectedSeatIds = selectedSeatIds.filter(id => id !== seat.seat_id);
                        $input.val(Math.max(count - 1, 0));
                    } else {
                        // Select seat
                        selectedSeatIds.push(seat.seat_id);
                        $input.val(count + 1);
                    }

                    updateSeatsDisplay(); // Re-render to show selection
                });
            }

            $row.append($btn);
        });

        $grid.append($row);
    }
}

/**
 * Handles changes in the ticket quantity input fields.
 * Attempts to automatically select grouped seats based on requested quantities.
 */
function handleTicketInputChange() {
    const reduced = parseInt($('#reduced').val()) || 0;
    const normal = parseInt($('#normal').val()) || 0;
    const premium = parseInt($('#premium').val()) || 0;

    const foundSeats = findGroupedSeats(reduced, normal, premium);

    if (foundSeats.length === reduced + normal + premium) {
        selectedSeatIds = foundSeats.map(seat => seat.seat_id);
        console.log("Auto-selected seats based on input:", selectedSeatIds);
    } else {
        selectedSeatIds = []; // Clear selection if not enough grouped seats found
        alert('Could not find enough grouped seats for your selection.');
        console.warn("Could not find enough grouped seats.");
    }

    updateSeatsDisplay(); // Update display with new selection
}

/**
 * Finds a contiguous group of available seats matching the requested types and quantities.
 * This is a simplified approach; a more robust solution might involve complex algorithms
 * to find truly "best" grouped seats (e.g., center of the hall, minimum gaps).
 * @param {number} reduced - Number of reduced seats requested.
 * @param {number} normal - Number of normal seats requested.
 * @param {number} premium - Number of premium seats requested.
 * @returns {Array<Object>} An array of seat objects that were found.
 */
function findGroupedSeats(reduced, normal, premium) {
    const available = [...window.availableSeats];

    available.sort((a, b) => {
        if (a.seat_row === b.seat_row) return a.seat_number - b.seat_number;
        return a.seat_row.localeCompare(b.seat_row);
    });

    const grouped = [];

    // Simple greedy approach: take the first available seats of each type
    for (const seat of available) {
        if (seat.seat_type === 'reduced' && reduced > 0) {
            grouped.push(seat); reduced--;
        } else if (seat.seat_type === 'normal' && normal > 0) {
            grouped.push(seat); normal--;
        } else if (seat.seat_type === 'premium' && premium > 0) {
            grouped.push(seat); premium--;
        }
        if (reduced + normal + premium === 0) break; // Stop if all needed seats are found
    }

    console.log("Attempted to find grouped seats. Found:", grouped.length);
    return grouped;
}