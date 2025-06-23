// routes/authRoutes.js - Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWT token generation
const User = require('../models/User'); // User model (now with name, address, phone)
const Cart = require('../models/Cart'); // Import Cart model for initial creation
// IMPORTANT: Updated import to match exports from authMiddleware.js
const { protect, authorize } = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// Helper function to generate JWT token
// Now includes email and role in the payload for easier access in middleware
const generateToken = (id, email, role) => {
    // Ensure JWT_SECRET is loaded from environment variables
    if (!process.env.JWT_SECRET) {
        throw new Error('secretOrPrivateKey must have a value. JWT_SECRET environment variable is not set.');
    }
    return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user with name, address, phone, and default role 'user'
// @access  Public
router.post('/register', async (req, res) => {
    // Extract all required fields for new user registration
    const { name, email, password, address, phone } = req.body;

    try {
        // Check if user with provided email already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email address.' });
        }

        // Create a new user instance
        // The password hashing will automatically occur via the pre-save hook in the User model
        const user = new User({
            name,
            email,
            password, // Mongoose pre-save hook will hash this
            address,
            phone,
            role: 'user', // Explicitly set default role to 'user' for new registrations
        });

        // Save the new user to the database
        await user.save();

        // Create an empty cart for the newly registered user
        // This ensures every registered user has an associated cart
        await Cart.create({
            userId: user._id,
            items: [], // Initialize with an empty array of items
        });

        // Respond with success message. No token is sent on registration for security best practices.
        res.status(201).json({ message: 'Registration successful! Please log in.' });

    } catch (error) {
        // Log the full error for debugging purposes on the server side
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration. Please try again.' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT token along with user details
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });

        // Check if user exists and if the provided password matches the stored hashed password
        // Uses the matchPassword method defined on the User schema
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Generate a JWT token including user ID, email, and role
        const token = generateToken(user._id, user.email, user.role);

        // Respond with essential user details and the generated token
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            address: user.address,
            phone: user.phone,
            token, // Send the token back to the client
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login. Please try again.' });
    }
});

// @route   GET /api/auth/profile
// @desc    Get the profile of the currently logged-in user
// @access  Private (requires valid JWT token)
// Changed verifyToken to protect
router.get('/profile', protect, async (req, res) => {
    try {
        // req.user is populated by the protect middleware with user ID, email, and role from the token payload
        // Select all fields except the password for security
        const user = await User.findById(req.user._id).select('-password'); // Use req.user._id if protect populates full user object
        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(user); // Return the user's full profile details
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error fetching user profile.' });
    }
});

// @route   GET /api/auth/users
// @desc    Get a list of all users (Admin access only)
// @access  Private (Admin, requires valid JWT token and admin role)
// Changed verifyToken and authorizeRole to protect and authorize
router.get('/users', protect, authorize('admin'), async (req, res) => { // This is line 107
    try {
        // Find all users and exclude their passwords from the response
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error fetching all users.' });
    }
});

module.exports = router;
