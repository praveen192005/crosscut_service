const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
if (dns.getServers().includes('127.0.0.1')) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

// Route imports
const stockRoutes = require('./routes/stockRoutes');
const studentRoutes = require('./routes/studentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const billRoutes = require('./routes/billRoutes');
const authRoutes = require('./routes/authRoutes');
const seedRoutes = require('./routes/seedRoutes');
const productRoutes = require('./routes/productRoutes');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Environment variables loaded:');
console.log(`- PORT: ${process.env.PORT || 5001}`);
if (process.env.MONGO_URI) {
  const maskedUri = process.env.MONGO_URI.replace(/:([^@]+)@/, ':******@');
  console.log(`- MONGO_URI: ${maskedUri}`);
} else {
  console.warn('- MONGO_URI: NOT DEFINED');
}
console.log(`- EMAIL_USER: ${process.env.EMAIL_USER || 'NOT DEFINED'}`);
console.log(`- EMAIL_PASS: ${process.env.EMAIL_PASS ? '****** (configured)' : 'NOT DEFINED'}`);
console.log(`- TARGET_EMAIL: ${process.env.TARGET_EMAIL || 'NOT DEFINED'}`);
console.log(`- BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '****** (configured)' : 'NOT DEFINED'}`);

// Connect to MongoDB Database
connectDB();

const app = express();

const mongoose = require('mongoose');

// Middlewares
app.use(cors());
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Favicon and touch icon handler (prevents 404 errors in server log)
app.get(['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (req, res) => {
  res.status(204).end();
});

// Middleware to return fast response when MongoDB is disconnected, allowing instant frontend mock fallback
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/auth')) return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB database is not connected. Client will use local database fallback.'
    });
  }
  next();
});

// Mount API Routes
app.use('/api/stocks', stockRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stock Management System MongoDB API',
    status: 'Server & MongoDB live',
    database: 'Connected',
  });
});

// Serve static frontend files (index.html, admin.html, accounts.html, staff.html, style.css, app.js, etc.)
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      // Prevent browsers from caching JS/CSS/HTML — critical for auth security fixes to take effect immediately
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found - Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});
