const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User'); // Import User model
const Order = require('../models/Order'); // Import Order model
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Product Routes ---

// @route   GET /api/products
// @desc    Get all products, with optional search, category filter, and sorting
// @access  Public
router.get('/products', async (req, res) => {
    try {
        const { search, category, sortBy, order } = req.query;
        let query = {};

        // Search functionality
        if (search) {
            // Case-insensitive search on name and description
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            query.category = { $regex: category, $options: 'i' }; // Case-insensitive category match
        }

        let productsQuery = Product.find(query);

        // Sorting functionality
        if (sortBy) {
            let sortOrder = order === 'desc' ? -1 : 1;
            if (sortBy === 'price') {
                productsQuery = productsQuery.sort({ price: sortOrder });
            } else if (sortBy === 'name') {
                productsQuery = productsQuery.sort({ name: sortOrder });
            }
            // Add more sorting options here if needed (e.g., by stock, by category)
        }

        const products = await productsQuery;
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/products
// @desc    Add new product (Admin only)
// @access  Private (Admin)
router.post('/products', protect, authorize('admin'), async (req, res) => {
    const { name, description, price, image, category, stock, weight, dimensions } = req.body;

    // Basic server-side validation (can be enhanced with Joi/Express-validator)
    if (!name || !description || !price || !category || stock === undefined || stock === null) {
        return res.status(400).json({ message: 'Please enter all required product fields (name, description, price, category, stock)' });
    }
    if (price < 0 || stock < 0) {
        return res.status(400).json({ message: 'Price and stock cannot be negative.' });
    }

    try {
        const newProduct = new Product({
            name,
            description,
            price,
            image,
            category,
            stock,
            weight,
            dimensions
        });
        const product = await newProduct.save();
        res.status(201).json(product);
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   PUT /api/products/:id
// @desc    Update product by ID (Admin only)
// @access  Private (Admin)
router.put('/products/:id', protect, authorize('admin'), async (req, res) => {
    const { name, description, price, image, category, stock, weight, dimensions } = req.body;

    // Basic validation
    if (!name || !description || !price || !category || stock === undefined || stock === null) {
        return res.status(400).json({ message: 'Please provide all required fields for product update.' });
    }
    if (price < 0 || stock < 0) {
        return res.status(400).json({ message: 'Price and stock cannot be negative.' });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name;
        product.description = description;
        product.price = price;
        product.image = image || product.image; // Keep existing image if not provided
        product.category = category;
        product.stock = stock;
        product.weight = weight;
        product.dimensions = dimensions;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product by ID (Admin only)
// @access  Private (Admin)
router.delete('/products/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        await product.deleteOne(); // Use deleteOne() on the document instance
        res.json({ message: 'Product removed' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Cart Routes ---

// @route   GET /api/cart
// @desc    Get user's cart (populated with product details)
// @access  Private
router.get('/cart', protect, async (req, res) => {
    try {
        // Find the user's cart by their ID.
        // Mongoose automatically handles finding the cart document linked to the user.
        // Assuming a `cart` field exists on the User model or a separate Cart model.
        // Given your previous schema, we're likely using a `cart` array directly on the User model
        // or a dedicated Cart model per user. Let's assume the latter for better structure,
        // or a simple structure where cart items are directly on the user for now if no Cart model.
        // If you don't have a specific `Cart` model, this logic needs adjustment.
        // Assuming a Cart model that stores `userId` and `items`.

        let user = await User.findById(req.user.id).populate({
            path: 'cart.productId', // Populate the productId field in the cart array
            model: 'Product' // Specify the model to populate from
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
// @desc    Add item to cart
// @access  Private
router.post('/cart', protect, async (req, res) => {
    const { productId, quantity } = req.body;

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
            cartItem.quantity += quantity;
        } else {
            // Add new item to cart
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
router.put('/cart/:productId', protect, async (req, res) => {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: 'A positive quantity is required.' });
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

        cartItem.quantity = quantity;
        await user.save();

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
router.delete('/cart/:productId', protect, async (req, res) => {
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
// @desc    Clear user's cart
// @access  Private
router.delete('/cart/clear', protect, async (req, res) => {
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


// --- Order Routes (User) ---

// @route   POST /api/orders
// @desc    Create a new order from cart
// @access  Private
router.post('/orders', protect, async (req, res) => {
    const { paymentMethod, shippingAddress, cartItems } = req.body;

    // Basic server-side validation
    if (!paymentMethod || !shippingAddress || !cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: 'Payment method, shipping address, and cart items are required.' });
    }

    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let totalAmount = 0;
        let orderProducts = [];

        for (const item of cartItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` });
            }

            orderProducts.push({
                productId: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price,
                image: product.image // Store image URL at time of order
            });
            totalAmount += product.price * item.quantity;

            // Reduce product stock
            product.stock -= item.quantity;
            await product.save();
        }

        const newOrder = new Order({
            userId: req.user.id,
            items: orderProducts,
            totalAmount,
            paymentMethod,
            shippingAddress,
            status: 'pending' // Default status for new orders
        });

        const order = await newOrder.save();

        // Clear user's cart after successful order creation
        user.cart = [];
        await user.save();

        res.status(201).json({ message: 'Order placed successfully!', order });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   GET /api/orders
// @desc    Get all orders for the logged-in user
// @access  Private
router.get('/orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }); // Sort by newest first
        res.json(orders);
    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Order Routes (Admin) ---

// @route   GET /api/orders/admin
// @desc    Get all orders (Admin only), populated with user details
// @access  Private (Admin)
router.get('/orders/admin', protect, authorize('admin'), async (req, res) => {
    try {
        // Populate userId with select fields for admin view
        const orders = await Order.find().populate('userId', 'name email phone').sort({ createdAt: -1 }); // Sort by newest first
        res.json(orders);
    } catch (err) {
        console.error('Error fetching all orders for admin:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/orders/admin/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/orders/admin/:id/status', protect, authorize('admin'), async (req, res) => {
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        order.status = status;
        await order.save();
        res.json(order);
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- User Profile Management (New) ---

// @route   GET /api/auth/profile
// @desc    Get logged in user's profile
// @access  Private
router.get('/auth/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update logged in user's profile
// @access  Private
router.put('/auth/profile', protect, async (req, res) => {
    const { name, address, phone, password, currentPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update fields if provided
        if (name !== undefined) user.name = name;
        if (address !== undefined) user.address = address;
        if (phone !== undefined) user.phone = phone;

        // Handle password change
        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password.' });
            }
            if (!(await user.matchPassword(currentPassword))) {
                return res.status(401).json({ message: 'Current password is incorrect.' });
            }
            user.password = password; // Pre-save hook in User model will hash this
        }

        const updatedUser = await user.save();
        // Return updated user without sensitive info like password or old token
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            address: updatedUser.address,
            phone: updatedUser.phone,
            role: updatedUser.role,
            // Re-generate token if password was updated, otherwise keep current valid token logic
            token: req.token // Preserve existing valid token if no password change, or handle re-issue if needed
        });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// --- Admin User Management (New) ---

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/auth/users', protect, authorize('admin'), async (req, res) => {
    try {
        // Exclude password and cart from general user list
        const users = await User.find().select('-password -cart'); 
        res.json(users);
    } catch (err) {
        console.error('Error fetching all users for admin:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/auth/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin)
router.put('/auth/users/:id/role', protect, authorize('admin'), async (req, res) => {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role provided.' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user._id.toString() === req.user.id.toString()) {
            return res.status(403).json({ message: 'Cannot change your own role.' });
        }

        user.role = role;
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role
        });
    } catch (err) {
        console.error('Error updating user role:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private (Admin)
router.delete('/auth/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user._id.toString() === req.user.id.toString()) {
            return res.status(403).json({ message: 'Cannot delete your own account.' });
        }
        
        await user.deleteOne(); // Delete the user document
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;
