const express = require('express');
const Order = require('../models/Order'); // Import the Order model
const User = require('../models/User'); // Import User model to get address
const Product = require('../models/Product'); // Import Product model for stock management
const { protect, authorize } = require('../middleware/authMiddleware'); // CORRECTED: Changed path from auth to authMiddleware

const router = express.Router();

// @route   POST /api/orders
// @desc    Place a new order (from user's cart)
// @access  Private (User)
router.post('/', protect, async (req, res) => {
    const { paymentMethod, cartItems } = req.body;
    const userId = req.user._id; // User ID from authenticated token (from protect middleware)

    // --- Start: Added Logging for Debugging ---
    console.log('--- Order Placement Request Received ---');
    console.log('User ID:', userId);
    console.log('Payment Method:', paymentMethod);
    console.log('Cart Items received:', JSON.stringify(cartItems, null, 2));
    // --- End: Added Logging for Debugging ---

    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`Error: User not found for ID: ${userId}`); // More specific log
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!cartItems || cartItems.length === 0) {
            console.log('Attempted to place an order with empty cartItems.');
            return res.status(400).json({ message: 'Cart is empty. Cannot place an empty order.' });
        }

        let totalAmount = 0;
        const orderItems = [];

        // Validate cart items and calculate total amount
        for (const item of cartItems) {
            // --- Start: Added Logging for each Cart Item ---
            console.log(`Attempting to find product for ID: ${item.productId}`);
            // --- End: Added Logging for each Cart Item ---

            const product = await Product.findById(item.productId);
            if (!product) {
                // --- Start: Critical Log for Product Not Found ---
                console.error(`CRITICAL ERROR: Product with ID ${item.productId} not found in database!`);
                // --- End: Critical Log for Product Not Found ---
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }

            if (product.stock === undefined || product.stock < item.quantity) { // Added check for undefined stock
                console.error(`Insufficient stock for product ${product.name} (ID: ${product._id}). Requested: ${item.quantity}, Available: ${product.stock}`);
                return res.status(400).json({ message: `Not enough stock for ${product.name}. Available: ${product.stock || 0}` });
            }

            // Deduct stock (simple implementation, consider transactions for production)
            product.stock -= item.quantity;
            await product.save();

            orderItems.push({
                productId: item.productId,
                name: product.name, // Use product name from DB for consistency
                quantity: item.quantity,
                price: product.price, // Use product price from DB for consistency
                image: product.image // Use product image from DB for consistency
            });
            totalAmount += product.price * item.quantity;
        }

        const newOrder = new Order({
            userId,
            items: orderItems,
            totalAmount: totalAmount.toFixed(2), // Store total with 2 decimal places
            paymentMethod,
            shippingAddress: user.address, // Use user's registered address as shipping address
            status: 'pending' // Initial status is pending
        });

        await newOrder.save();

        // --- Start: Log Successful Order ---
        console.log(`Order ${newOrder._id} placed successfully for user ${userId}.`);
        // --- End: Log Successful Order ---

        res.status(201).json({ message: 'Order placed successfully!', order: newOrder });

    } catch (error) {
        // --- Start: Catch-all Error Log ---
        console.error('Order placement route caught an unhandled error:', error.message);
        console.error(error.stack); // Log the stack trace for more details
        // --- End: Catch-all Error Log ---
        res.status(500).json({ message: 'Server error during order placement.' }); // More specific message than 'Server error'
    }
});

// @route   GET /api/orders
// @desc    Get all orders for the logged-in user
// @access  Private (User)
router.get('/', protect, async (req, res) => {
    const userId = req.user._id;

    try {
        // Ensure product details are populated for the frontend
        const orders = await Order.find({ userId }).populate('items.productId', 'name price image').sort({ createdAt: -1 }); // Sort by newest first
        res.json(orders);
    } catch (error) {
        console.error('Fetch user orders error:', error.message);
        res.status(500).json({ message: 'Server error fetching user orders' }); // More specific error message
    }
});

// @route   GET /api/orders/admin
// @desc    Get all orders (Admin only)
// @access  Private (Admin)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
    try {
        // Populate userId to get user details AND items.productId to get product details in the order response
        const orders = await Order.find()
            .populate('userId', 'name email address phone')
            .populate('items.productId', 'name price image') // Populate product details within order items
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Fetch all orders error:', error.message);
        res.status(500).json({ message: 'Server error fetching all orders' }); // More specific error message
    }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/admin/:id/status', protect, authorize('admin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // New status (e.g., 'confirmed', 'shipped', 'delivered')

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Validate new status
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid order status provided.' });
        }

        order.status = status;
        await order.save();

        // Return the updated order, populated with user details if needed by frontend
        const updatedOrder = await Order.findById(id)
            .populate('userId', 'name email address phone')
            .populate('items.productId', 'name price image'); // Also populate product details for admin view
        res.json({ message: `Order ${id} status updated to ${status}`, order: updatedOrder });

    } catch (error) {
        console.error('Update order status error:', error.message);
        res.status(500).json({ message: 'Server error updating order status' }); // More specific error message
    }
});

module.exports = router;
