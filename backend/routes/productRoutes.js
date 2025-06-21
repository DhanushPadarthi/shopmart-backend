
// routes/productRoutes.js - Product management routes
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Product model
const { protect, authorize } = require('../middleware/auth'); // Auth middleware

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Fetch single product error:', error);
    res.status(500).json({ message: 'Server error fetching product' });
  }
});

// @desc    Add a new product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, description, price, image } = req.body;

  try {
    const product = new Product({
      name,
      description,
      price,
      image,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error adding product' });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const { name, description, price, image } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.description = description || product.description;
      product.price = price || product.price;
      product.image = image || product.image;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (product) {
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

module.exports = router;
