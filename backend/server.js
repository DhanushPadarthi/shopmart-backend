// server.js - Main Express application file
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
const connectDB = require('./db'); // MongoDB connection setup
const authRoutes = require('./routes/authRoutes'); // Authentication routes
const productRoutes = require('./routes/productRoutes'); // Product routes
const cartRoutes = require('./routes/cartRoutes'); // Cart routes

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB database
connectDB();

// Initialize Express app
const app = express();

// Middleware
// Enable CORS for all origins (for development, restrict in production)
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // Authentication routes (register, login)
app.use('/api/products', productRoutes); // Product management routes
app.use('/api/cart', cartRoutes); // Shopping cart routes

// Simple root route
app.get('/', (req, res) => {
  res.send('ShopSmart API is running...');
});

// Define the port to listen on
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
