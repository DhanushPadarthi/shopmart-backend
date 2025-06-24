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
            console.log('Auth Middleware DEBUG: Extracted Token:', token); // DEBUG: Log the extracted token

            // Verify the token using the JWT_SECRET from environment variables
            if (!process.env.JWT_SECRET) {
                // Critical error: JWT_SECRET must be set for token verification
                console.error('Auth Middleware ERROR: JWT_SECRET is not defined in environment variables.'); // DEBUG: Log error if secret is missing
                throw new Error('JWT_SECRET is not defined in environment variables.');
            }
            console.log('Auth Middleware DEBUG: Using JWT_SECRET:', process.env.JWT_SECRET); // DEBUG: Log the secret being used

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Auth Middleware DEBUG: Decoded Token Payload:', decoded); // DEBUG: Log the decoded payload

            // Find the user by ID from the decoded token payload
            // Select all user fields except the password for security
            req.user = await User.findById(decoded.id).select('-password');

            // If user is not found (e.g., deleted account), deny access
            if (!req.user) {
                console.error('Auth Middleware ERROR: User not found for ID from token:', decoded.id); // DEBUG: Log if user not found
                return res.status(401).json({ message: 'User not found, token invalid' });
            }

            console.log(`Auth Middleware DEBUG: User ${req.user.email} authenticated successfully.`); // DEBUG: Confirmation
            next(); // Token is valid, user is authenticated, proceed to the next middleware/route handler

        } catch (error) {
            console.error('Authentication Error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token is invalid.' });
            }
            // Catch any other unexpected errors during verification
            res.status(401).json({ message: `Authentication failed: ${error.message}` }); 
        }
    } else {
        // If no token is provided in the header
        console.error('Auth Middleware ERROR: No Authorization header or malformed header.'); // DEBUG: Log if no token
        res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

// Middleware to authorize users based on their role
// It accepts a list of roles, and only users with one of those roles can access the route
const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is set by the 'protect' middleware
        if (!req.user || !roles.includes(req.user.role)) {
            console.error(`Auth Middleware ERROR: User ${req.user ? req.user.email : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'}) attempted unauthorized access to a ${roles.join(', ')} route.`); // DEBUG: Log authorization failure
            return res.status(403).json({ message: `Access denied. Requires one of the following roles: ${roles.join(', ')}.` });
        }
        next(); // User has the required role, proceed
    };
};

module.exports = {
    protect,
    authorize,
};
