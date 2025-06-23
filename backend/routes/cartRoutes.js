// routes/cartRoutes.js - Cart management routes
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart'); // Import Cart model
const Product = require('../models/Product'); // Import Product model to check stock and details
const { protect } = require('../middleware/authMiddleware'); // Import middleware

// @route    GET /api/cart
// @desc     Get user's cart
// @access   Private (User)
router.get('/', protect, async (req, res) => {
    try {
        // Find the cart for the authenticated user
        const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

        if (!cart) {
            // If no cart exists for the user, return an empty cart structure
            // For a new user, a cart is created during registration. This case should be rare for logged-in users.
            return res.status(200).json({ userId: req.user._id, items: [] });
        }
        res.json(cart);
    } catch (error) {
        console.error('Fetch cart error:', error.message);
        res.status(500).json({ message: 'Server error fetching cart.' });
    }
});

// @route    POST /api/cart
// @desc     Add item to cart or update quantity
// @access   Private (User)
router.post('/', protect, async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    try {
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            // This case should ideally not happen if a cart is created on user registration,
            // but as a fallback, create a new cart if not found.
            cart = new Cart({ userId, items: [] });
        }

        // Find the product to get its details and check stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        let itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // Product exists in cart, update quantity
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ message: `Cannot add more. Only ${product.stock} left in stock for ${product.name}.` });
            }
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            // Product does not exist in cart, add new item
            if (quantity > product.stock) {
                return res.status(400).json({ message: `Cannot add more. Only ${product.stock} left in stock for ${product.name}.` });
            }
            cart.items.push({
                productId,
                name: product.name,
                image: product.image,
                price: product.price,
                quantity
            });
        }

        await cart.save();
        // Populate productId to return full product details for updated cart
        const updatedCart = await Cart.findOne({ userId }).populate('items.productId');
        res.json(updatedCart);

    } catch (error) {
        console.error('Add/update cart item error:', error.message);
        res.status(500).json({ message: 'Server error adding/updating cart item.' });
    }
});

// @route    DELETE /api/cart/clear
// @desc     Clear all items from cart (e.g., after checkout)
// @access   Private (User)
// IMPORTANT: This route must be placed BEFORE any dynamic routes like /:productId
router.delete('/clear', protect, async (req, res) => {
    const userId = req.user._id;

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(200).json({ message: 'No cart found to clear, or already empty.' });
        }

        cart.items = []; // Clear all items
        await cart.save();
        res.json({ message: 'Cart cleared successfully.', cart });
    } catch (error) {
        console.error('Clear cart error:', error.message);
        res.status(500).json({ message: 'Server error clearing cart.' });
    }
});


// @route    PUT /api/cart/:productId
// @desc     Update quantity of specific item in cart
// @access   Private (User)
router.put('/:productId', protect, async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body; // New quantity for the item
    const userId = req.user._id;

    if (quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative.' });
    }

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found for this user.' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found.' });
            }

            if (quantity === 0) {
                // If new quantity is 0, remove the item
                cart.items.splice(itemIndex, 1);
            } else if (quantity > product.stock) {
                return res.status(400).json({ message: `Cannot update. Only ${product.stock} left in stock for ${product.name}.` });
            } else {
                // Update quantity
                cart.items[itemIndex].quantity = quantity;
            }
            await cart.save();
            // Populate productId to return full product details for updated cart
            const updatedCart = await Cart.findOne({ userId }).populate('items.productId');
            res.json(updatedCart);
        } else {
            res.status(404).json({ message: 'Item not found in cart.' });
        }
    } catch (error) {
        console.error('Update cart item quantity error:', error.message);
        res.status(500).json({ message: 'Server error updating cart item quantity.' });
    }
});

// @route    DELETE /api/cart/:productId
// @desc     Remove specific item from cart
// @access   Private (User)
router.delete('/:productId', protect, async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found for this user.' });
        }

        const initialLength = cart.items.length;
        // Filter out the item to be removed
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);

        if (cart.items.length === initialLength) {
            // If length hasn't changed, item wasn't found to filter out
            return res.status(404).json({ message: 'Item not found in cart.' });
        }

        await cart.save();
        // Populate productId to return full product details for updated cart
        const updatedCart = await Cart.findOne({ userId }).populate('items.productId');
        res.json(updatedCart);
    } catch (error) {
        console.error('Remove cart item error:', error.message);
        res.status(500).json({ message: 'Server error removing cart item.' });
    }
});

module.exports = router;
