import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mqtt from 'mqtt'; // Import the MQTT client library
import apiRoutes from './routes/apiRoutes.js';
import swaggerDocs from './swagger/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server to attach WebSocket to
const server = http.createServer(app);

// Define your MQTT broker URL
// If running locally, this might be 'mqtt://localhost:1883'
// If using a cloud MQTT broker, use its provided URL
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883'; // Use 'mosquitto' as hostname if running in docker-compose

let mqttClient; // Declare a variable to hold the MQTT client instance

/**
 * Connects to the MQTT broker and sets up event handlers.
 * @param {string} brokerUrl - The URL of the MQTT broker.
 */
function connectMqtt(brokerUrl) {
    mqttClient = mqtt.connect(brokerUrl);

    mqttClient.on('connect', () => {
        console.log('MQTT: Connected to broker at', brokerUrl);
        // You might want to subscribe to a topic here if your API needs to receive messages
        // mqttClient.subscribe('some/topic', (err) => {
        //     if (!err) {
        //         console.log("Subscribed to some/topic");
        //     }
        // });
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT: Connection error:', err);
    });

    mqttClient.on('offline', () => {
        console.warn('MQTT: Client is offline (disconnected unexpectedly or in reconnecting phase)');
    });

    mqttClient.on('reconnect', () => {
        console.log('MQTT: Reconnecting to broker...');
    });
}

// Connect to MQTT broker when your application starts
// This line can now be called because connectMqtt is defined
connectMqtt(MQTT_BROKER_URL);

// --- Expose MQTT client for use in routes ---
// This is a common pattern to make the MQTT client available to your API routes.
// You can either pass it directly to route functions or attach it to the app object.
// Attaching to app.locals is a simple way for express apps.
app.locals.mqttClient = mqttClient; // Make the client available throughout the app

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Pass the mqttClient to your apiRoutes if they need to publish messages
app.use('/api', apiRoutes); // If apiRoutes uses the client via app.locals, no change needed here.
                            // If apiRoutes needs client explicitly, you might do something like:
                            // app.use('/api', apiRoutes(mqttClient)); and modify apiRoutes to accept it.


// Connection test output
app.get('/', (req, res) => {
    res.send('Hello World! from the backend');
});

// Generate Swagger documentation
swaggerDocs(app, PORT);

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send('Route niet gevonden');
});

// Start server (app is now attached to an HTTP server)
server.listen(PORT, () => {
    console.log(`Backend draait op http://localhost:${PORT}`);
});

// Add a simple test endpoint to publish an MQTT message
app.get('/api/test-mqtt', (req, res) => {
    if (mqttClient && mqttClient.connected) {
        const testTopic = 'test/message';
        const testPayload = JSON.stringify({ message: 'Hello from API!', timestamp: new Date() });
        mqttClient.publish(testTopic, testPayload, (err) => {
            if (err) {
                console.error('Failed to publish test MQTT message:', err);
                res.status(500).send('Failed to publish test MQTT message');
            } else {
                console.log(`Published test MQTT message to topic: ${testTopic} with payload: ${testPayload}`);
                res.status(200).send('Test MQTT message published!');
            }
        });
    } else {
        res.status(503).send('MQTT client not connected.');
    }
});