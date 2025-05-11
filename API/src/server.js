import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes.js';
import swaggerDocs from './swagger/swagger.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// log incoming requests
app.use((req, res, next) => { 
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use('/api', apiRoutes);

// connection test output
app.get('/', (req, res) => {
  res.send('Hello World! from the backend');
});

// Generate Swagger documentation
swaggerDocs(app, PORT);

app.listen(PORT, () => {
  console.log(`Backend draait op http://localhost:${PORT}`);
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send('Route niet gevonden');
});