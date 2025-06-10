import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import apiRoutes from './routes/apiRoutes.js';
import swaggerDocs from './swagger/swagger.js';
import setupMQTT from './middleware/mqtt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server to attach WebSocket to
const server = http.createServer(app);

// Setup WebSocket
setupMQTT(); // Initialize MQTT here

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH' , 'DELETE'],
}));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use('/api', apiRoutes);

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
