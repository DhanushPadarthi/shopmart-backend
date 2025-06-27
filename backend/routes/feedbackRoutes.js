// routes/feedbackRoutes.js - General feedback routes (can be extended for global feedback)
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Product = require('../models/Product'); // To validate product existence
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   POST /api/feedback
// @desc    Submit new feedback for a product
// @access  Private (User)
router.post('/', protect, async (req, res) => {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id; // Get user ID from authenticated token

    // Basic validation
    if (!productId || !rating) {
        return res.status(400).json({ message: 'Product ID and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    try {
        // 1. Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // 2. Check if the user has already submitted feedback for this product
        const existingFeedback = await Feedback.findOne({ productId, userId });
        if (existingFeedback) {
            // Option 1: Prevent multiple feedback entries (current implementation)
            return res.status(400).json({ message: 'You have already submitted feedback for this product. You can update your existing feedback.' });
            // Option 2: Allow updating existing feedback (if desired)
            // existingFeedback.rating = rating;
            // existingFeedback.comment = comment;
            // await existingFeedback.save();
            // return res.status(200).json({ message: 'Feedback updated successfully!', feedback: existingFeedback });
        }

        // 3. Create new feedback
        const newFeedback = new Feedback({
            productId,
            userId,
            rating,
            comment: comment || '', // Ensure comment is saved as empty string if not provided
        });

        const savedFeedback = await newFeedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully!', feedback: savedFeedback });

    } catch (error) {
        console.error('Submit feedback error:', error.message);
        // Handle potential duplicate key error from unique index
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already submitted feedback for this product.' });
        }
        res.status(500).json({ message: 'Server error submitting feedback.' });
    }
});


// @desc    Get all feedback (Admin only view)
// @route   GET /api/feedback/admin
// @access  Private (Admin)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
    try {
        // Populate product and user details for each feedback entry
        const feedback = await Feedback.find({})
            .populate('productId', 'name image') // Populate product name and image
            .populate('userId', 'name email')    // Populate user name and email
            .sort({ createdAt: -1 }); // Newest first
        res.json(feedback);
    } catch (error) {
        console.error('Fetch all feedback error (Admin):', error.message);
        res.status(500).json({ message: 'Server error fetching feedback.' });
    }
});


// @desc    Get feedback for a specific product (Publicly viewable reviews)
// @route   GET /api/feedback/product/:productId
// @access  Public
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const feedback = await Feedback.find({ productId })
            .populate('userId', 'name') // Only need user name for product reviews
            .sort({ createdAt: -1 }); // Newest first
        res.json(feedback);
    } catch (error) {
        console.error(`Fetch feedback for product ${req.params.productId} error:`, error.message);
        res.status(500).json({ message: 'Server error fetching product feedback.' });
    }
});

module.exports = router;
