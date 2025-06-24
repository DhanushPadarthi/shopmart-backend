const express = require('express');
const User = require('../models/User'); // Import User model as cart is embedded
const Product = require('../models/Product'); // Import Product model to check stock and details
const { protect } = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart (populated with product details)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Find the user and populate their cart items with full product details
        let user = await User.findById(req.user.id).populate({
            path: 'cart.productId', // Path to the product reference in the cart array
            model: 'Product' // Model to use for population
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Return the populated cart
        res.json({ items: user.cart || [] });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   POST /api/cart
// @desc    Add item to cart or update quantity if already exists
// @access  Private
router.post('/', protect, async (req, res) => {
    const { productId, quantity } = req.body; // quantity is assumed to be 1 for initial add

    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Product ID and a positive quantity are required.' });
    }

    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        let cartItem = user.cart.find(item => item.productId.toString() === productId);

        if (cartItem) {
            // Update quantity if item already in cart
            const newQuantity = cartItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${newQuantity}` });
            }
            cartItem.quantity = newQuantity;
        } else {
            // Add new item to cart
            if (quantity > product.stock) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}` });
            }
            user.cart.push({
                productId: productId,
                quantity: quantity
            });
        }

        await user.save();

        // Re-populate cart for response to send product details back
        user = await User.findById(req.user.id).populate({
            path: 'cart.productId',
            model: 'Product'
        });

        res.status(200).json({ items: user.cart });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/cart/:productId
// @desc    Update quantity of item in cart
// @access  Private
router.put('/:productId', protect, async (req, res) => {
    const { quantity } = req.body;

    // Validate new quantity
    if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ message: 'A non-negative quantity is required.' });
    }

    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const cartItem = user.cart.find(item => item.productId.toString() === req.params.productId);

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found in cart.' });
        }

        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        if (quantity === 0) {
            // Remove item if quantity is set to 0
            user.cart = user.cart.filter(item => item.productId.toString() !== req.params.productId);
        } else {
            // Check stock before updating quantity
            if (quantity > product.stock) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}` });
            }
            cartItem.quantity = quantity;
        }
        
        await user.save();

        // Re-populate cart for response
        user = await User.findById(req.user.id).populate({
            path: 'cart.productId',
            model: 'Product'
        });

        res.status(200).json({ items: user.cart });
    } catch (err) {
        console.error('Error updating cart item quantity:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const initialCartLength = user.cart.length;
        user.cart = user.cart.filter(item => item.productId.toString() !== req.params.productId);

        if (user.cart.length === initialCartLength) {
            return res.status(404).json({ message: 'Item not found in cart.' });
        }

        await user.save();

        // Re-populate cart for response
        user = await User.findById(req.user.id).populate({
            path: 'cart.productId',
            model: 'Product'
        });

        res.status(200).json({ items: user.cart, message: 'Item removed from cart.' });
    } catch (err) {
        console.error('Error removing cart item:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/cart/clear
// @desc    Clear user's entire cart
// @access  Private
router.delete('/clear', protect, async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.cart = []; // Empty the cart array
        await user.save();

        res.status(200).json({ message: 'Cart cleared successfully.', items: [] });
    } catch (err) {
        console.error('Error clearing cart:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
