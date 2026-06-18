require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (gracefully fallback if local MongoDB is offline)
connectDB().then(() => {
  console.log('Database verification step completed.');
}).catch(err => {
  console.warn('MongoDB connection could not be established. Running in simulated state.');
});

// Configure Middlewares
app.use(cors());
app.use(express.json());

// API Base routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Cloud Cost Optimization API running on http://localhost:${PORT}`);
});
