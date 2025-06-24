// routes/authRoutes.js - Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWT token generation
const User = require('../models/User'); // User model (now with name, address, phone, cart)
const Product = require('../models/Product'); // Product model for cart population (if needed for internal logic)
const Order = require('../models/Order'); // Order model (needed for user deletion logic)
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

    // Basic server-side validation for required fields
    if (!name || !email || !password || !address || !phone) {
        return res.status(400).json({ message: 'All fields (name, email, password, address, phone) are required for registration.' });
    }

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
            cart: [] // Initialize an empty cart for the new user upon registration
        });

        // Save the new user to the database
        await user.save();

        // Respond with success message. No token is sent on registration for security best practices.
        res.status(201).json({ message: 'Registration successful! Please log in.' });

    } catch (error) {
        // Log the full error for debugging purposes on the server side
        console.error('Register error:', error);
        // Check for specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error during registration. Please try again.' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT token along with user details
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required for login.' });
    }

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

// @route   POST /api/auth/verify-password
// @desc    Verify the current user's password for sensitive admin actions
// @access  Private (requires valid JWT token)
router.post('/verify-password', protect, async (req, res) => {
    const { password } = req.body; // Password provided by the frontend for re-authentication

    if (!password) {
        return res.status(400).json({ message: 'Password is required for verification.' });
    }

    try {
        // req.user is populated by the 'protect' middleware with the authenticated user's ID
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'Authenticated user not found in database.' });
        }

        // Use the matchPassword method (defined in your User model) to compare the plain text password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            // If password does not match, return 401 Unauthorized
            return res.status(401).json({ message: 'Incorrect password. Verification failed.' });
        }

        // If password matches, send a success response
        res.status(200).json({ message: 'Password verified successfully.' });

    } catch (error) {
        console.error('Verify password error:', error);
        res.status(500).json({ message: 'Server error during password verification.' });
    }
});


// @route   GET /api/auth/profile
// @desc    Get the profile of the currently logged-in user
// @access  Private (requires valid JWT token)
router.get('/profile', protect, async (req, res) => {
    try {
        // req.user is populated by the protect middleware with user ID, email, and role from the token payload
        // Select all fields except the password for security
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(user); // Return the user's full profile details
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error fetching user profile.' });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update the profile of the currently logged-in user (name, address, phone)
// @access  Private (requires valid JWT token)
router.put('/profile', protect, async (req, res) => {
    const { name, address, phone } = req.body;

    try {
        // Find the user by their ID from the token (req.user._id)
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update fields if provided in the request body
        // Ensure that required fields are not set to empty strings unless explicitly allowed by schema
        if (name !== undefined && name.trim() !== '') user.name = name;
        if (address !== undefined && address.trim() !== '') user.address = address;
        if (phone !== undefined && phone.trim() !== '') user.phone = phone;

        // Save the updated user document
        const updatedUser = await user.save();

        // Return the updated user profile (excluding password and cart)
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            address: updatedUser.address,
            phone: updatedUser.phone,
            // Do not send token again on profile update, as it hasn't changed.
            // The frontend manages existing token.
        });

    } catch (error) {
        console.error('Profile update error:', error);
        // Check for Mongoose validation errors during update
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error updating user profile.' });
    }
});

// @route   GET /api/auth/users
// @desc    Get a list of all users (Admin access only)
// @access  Private (Admin, requires valid JWT token and admin role)
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        // Find all users and exclude their passwords and cart from the response
        const users = await User.find().select('-password -cart');
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error fetching all users.' });
    }
});

// @route   PUT /api/auth/users/:id/role
// @desc    Update a user's role (Admin only)
// @access  Private (Admin)
router.put('/users/:id/role', protect, authorize('admin'), async (req, res) => {
    const { role } = req.body; // New role ('user' or 'admin')
    const userId = req.params.id;

    if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified. Role must be "user" or "admin".' });
    }

    try {
        // Find the user by ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent admin from changing their own role (optional, but good practice)
        if (req.user._id.toString() === userId) {
            return res.status(403).json({ message: 'You cannot change your own role.' });
        }

        user.role = role;
        const updatedUser = await user.save();

        // Respond with the updated user's details (excluding password and cart)
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            message: `User role updated to ${updatedUser.role}`
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error updating user role.' });
    }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private (Admin)
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent admin from deleting themselves (optional, but good practice)
        if (req.user._id.toString() === userId) {
            return res.status(403).json({ message: 'You cannot delete your own account.' });
        }

        // Delete the user
        await user.deleteOne(); // Use deleteOne() for Mongoose 6+

        // Optionally, delete associated data like orders for this user
        // Consider this based on your application's data integrity requirements
        // Deleting related orders is good for data consistency
        await Order.deleteMany({ userId: userId }); 

        res.json({ message: 'User deleted successfully.' });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error deleting user.' });
    }
});

module.exports = router;
