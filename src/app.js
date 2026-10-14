import cors from 'cors';
import coockieParser from 'cookie-parser';
import express from 'express';

const app = express();

// Express parsing and reading configuraiton
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));

// Cookies
app.use(coockieParser());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// import routes
import authRouter from './routes/auth.routes.js';
import healthCheckRouter from './routes/healthcheck.route.js';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/healthcheck', healthCheckRouter);

app.get('/', (req, res) => {
  res.send('Hello there!');
});

export default app;
