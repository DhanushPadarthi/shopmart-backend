const express = require('express');
const Product = require('../models/Product'); // Import the Product model
// IMPORTANT: Updated import to match exports from authMiddleware.js
const { protect, authorize } = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        console.error('Fetch products error:', error.message);
        res.status(500).json({ message: 'Server error fetching products.' });
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
    } catch (error) {
        console.error('Fetch single product error:', error.message);
        res.status(500).json({ message: 'Server error fetching product.' });
    }
});

// @route   POST /api/products
// @desc    Add a new product (Admin only)
// @access  Private (Admin)
// Changed protect and authorizeRole to protect and authorize
router.post('/', protect, authorize('admin'), async (req, res) => {
    const { name, description, price, image, category, stock, weight, dimensions } = req.body;

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

        const createdProduct = await newProduct.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error('Add product error:', error.message);
        res.status(500).json({ message: 'Server error adding product.' });
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product (Admin only)
// @access  Private (Admin)
// Changed protect and authorizeRole to protect and authorize
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    const { name, description, price, image, category, stock, weight, dimensions } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price !== undefined ? price : product.price; // Allow price to be 0
        product.image = image || product.image;
        product.category = category || product.category;
        product.stock = stock !== undefined ? stock : product.stock; // Allow stock to be 0
        product.weight = weight !== undefined ? weight : product.weight;
        product.dimensions = dimensions || product.dimensions;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Update product error:', error.message);
        res.status(500).json({ message: 'Server error updating product.' });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (Admin only)
// @access  Private (Admin)
// Changed protect and authorizeRole to protect and authorize
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.deleteOne(); // Use deleteOne() for Mongoose 6+
        res.json({ message: 'Product removed' });
    } catch (error) {
        console.error('Delete product error:', error.message);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

module.exports = router;
