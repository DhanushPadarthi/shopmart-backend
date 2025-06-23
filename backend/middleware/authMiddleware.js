const jwt = require('jsonwebtoken'); // For verifying JWT tokens
const User = require('../models/User'); // Import User model to find user by ID

// Middleware to protect routes (ensure user is logged in)
// This middleware verifies the JWT token and attaches the authenticated user's details to req.user
const protect = async (req, res, next) => {
    let token;

    // Check if the Authorization header is present and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token part (remove "Bearer " prefix)
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the JWT_SECRET from environment variables
            if (!process.env.JWT_SECRET) {
                // Critical error: JWT_SECRET must be set for token verification
                throw new Error('JWT_SECRET is not defined in environment variables.');
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by ID from the decoded token payload
            // Select all user fields except the password for security
            req.user = await User.findById(decoded.id).select('-password');

            // If user is not found (e.g., deleted account), deny access
            if (!req.user) {
                return res.status(401).json({ message: 'User not found, token invalid' });
            }

            next(); // Token is valid, user is authenticated, proceed to the next middleware/route handler

        } catch (error) {
            console.error('Authentication Error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token is invalid.' });
            }
            res.status(500).json({ message: 'Server error during authentication.' });
        }
    }

    // If no token is provided in the header
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

// Middleware to authorize users based on their role
// It accepts a list of roles, and only users with one of those roles can access the route
const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is set by the 'protect' middleware
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires one of the following roles: ${roles.join(', ')}.` });
        }
        next(); // User has the required role, proceed
    };
};

module.exports = {
    protect,
    authorize,
};
