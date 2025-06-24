const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // Import cors
const connectDB = require('./db'); // Import DB connection
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const productRoutes = require('./routes/productRoutes'); // Import product routes
const orderRoutes = require('./routes/orderRoutes'); // Import order routes
const cartRoutes = require('./routes/cartRoutes'); // Import cart routes


dotenv.config(); // Load environment variables from .env file

connectDB(); // Connect to MongoDB

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser for JSON data

// Routes
// Note: We are now using separate route files for better organization
app.use('/api/auth', authRoutes); // Authentication routes (login, register, profile, user management)
app.use('/api/products', productRoutes); // Product management routes (CRUD for products)
app.use('/api/orders', orderRoutes); // Order management routes (place order, user orders, admin orders)
app.use('/api/cart', cartRoutes); // Shopping cart routes (add, update, remove, clear cart)


// Simple root route for API status check
app.get('/', (req, res) => {
    res.send('ShopSmart API is running...');
});

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack to the console for debugging
    res.status(500).send('Something broke on the server!'); // Send a generic error message
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
