// routes/wishlistRoutes.js - Wishlist management routes
const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist'); // Wishlist model
const Product = require('../models/Product'); // Product model to validate productId
const { protect } = require('../middleware/authMiddleware'); // Auth middleware

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('items.productId');

    if (!wishlist) {
      // If no wishlist exists for the user, return an empty wishlist structure
      return res.status(200).json({ userId: req.user._id, items: [] });
    }
    res.json(wishlist);
  } catch (error) {
    console.error('Fetch wishlist error:', error.message);
    res.status(500).json({ message: 'Server error fetching wishlist.' });
  }
});

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
router.post('/', protect, async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;

  try {
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create new wishlist if none exists for the user
      wishlist = new Wishlist({ userId, items: [] });
    }

    // Check if item already in wishlist
    const itemExists = wishlist.items.some(item => item.productId.toString() === productId);

    if (itemExists) {
      return res.status(400).json({ message: 'Product already in wishlist.' });
    }

    wishlist.items.push({ productId }); // Add product to wishlist
    await wishlist.save();

    // Populate productId to return full product details for updated wishlist
    const updatedWishlist = await Wishlist.findOne({ userId }).populate('items.productId');
    res.status(201).json(updatedWishlist);
  } catch (error) {
    console.error('Add to wishlist error:', error.message);
    res.status(500).json({ message: 'Server error adding to wishlist.' });
  }
});

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  try {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found for this user.' });
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);

    if (wishlist.items.length === initialLength) {
      // If length hasn't changed, item wasn't found to filter out
      return res.status(404).json({ message: 'Item not found in wishlist.' });
    }

    await wishlist.save();
    // Populate productId to return full product details for updated wishlist
    const updatedWishlist = await Wishlist.findOne({ userId }).populate('items.productId');
    res.json(updatedWishlist);
  } catch (error) {
    console.error('Remove wishlist item error:', error.message);
    res.status(500).json({ message: 'Server error removing wishlist item.' });
  }
});

module.exports = router;
