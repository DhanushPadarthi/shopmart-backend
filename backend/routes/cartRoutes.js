// routes/cartRoutes.js - Cart management routes
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart'); // Cart model
const Product = require('../models/Product'); // Product model to get product details
const { protect } = require('../middleware/auth'); // Auth middleware

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      // If no cart exists for the user, return an empty cart
      return res.status(200).json({ userId: req.user._id, items: [] });
    }
    res.json(cart);
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

// @desc    Add item to cart or update quantity
// @route   POST /api/cart
// @access  Private
router.post('/', protect, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId: req.user._id });

    // Find the product details to add to cart (name, price, image)
    const productToAdd = await Product.findById(productId);
    if (!productToAdd) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (cart) {
      // Cart exists for the user
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (itemIndex > -1) {
        // Product already exists in cart, update quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Product not in cart, add new item
        cart.items.push({
          productId: productToAdd._id,
          name: productToAdd.name,
          price: productToAdd.price,
          quantity: quantity,
          image: productToAdd.image,
        });
      }
      cart = await cart.save();
      return res.status(200).json(cart);
    } else {
      // No cart exists for this user, create a new one
      const newCart = await Cart.create({
        userId: req.user._id,
        items: [{
          productId: productToAdd._id,
          name: productToAdd.name,
          price: productToAdd.price,
          quantity: quantity,
          image: productToAdd.image,
        }],
      });
      return res.status(201).json(newCart);
    }
  } catch (error) {
    console.error('Add/update cart item error:', error);
    res.status(500).json({ message: 'Server error adding/updating cart item' });
  }
});

// @desc    Update quantity of an item in cart
// @route   PUT /api/cart/:productId
// @access  Private
router.put('/:productId', protect, async (req, res) => {
  const { quantity } = req.body;
  const productId = req.params.productId;

  try {
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found for this user' });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        // If quantity is 0 or less, remove the item
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
      }
      cart = await cart.save();
      res.json(cart);
    } else {
      res.status(404).json({ message: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Update cart quantity error:', error);
    res.status(500).json({ message: 'Server error updating cart quantity' });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  const productId = req.params.productId;

  try {
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found for this user' });
    }

    // Filter out the item to be removed
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart = await cart.save();
    res.json({ message: 'Item removed from cart', cart });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ message: 'Server error removing cart item' });
  }
});

// @desc    Clear entire cart (after checkout)
// @route   DELETE /api/cart/clear
// @access  Private
router.delete('/clear', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });

    if (cart) {
      cart.items = []; // Clear all items
      await cart.save();
      res.json({ message: 'Cart cleared successfully' });
    } else {
      res.status(200).json({ message: 'No cart found to clear' }); // Or 404 if you prefer strictness
    }
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
});

module.exports = router;
