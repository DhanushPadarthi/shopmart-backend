const express = require('express');
const Product = require('../models/Product'); // Import the Product model
const { protect, authorize } = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products, with optional search, category filter, sorting, and pagination
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { search, category, sortBy, order, page = 1, limit = 8 } = req.query; // Default page 1, limit 8
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

        // Calculate total products matching the filter for pagination metadata
        const totalProducts = await Product.countDocuments(query);
        const skip = (parseInt(page) - 1) * parseInt(limit);

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

        // Apply pagination
        productsQuery = productsQuery.skip(skip).limit(parseInt(limit));

        const products = await productsQuery;

        res.json({
            products,
            totalProducts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / parseInt(limit))
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
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
router.post('/', protect, authorize('admin'), async (req, res) => {
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
router.put('/:id', protect, authorize('admin'), async (req, res) => {
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
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
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

module.exports = router;
