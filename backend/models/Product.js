// models/Product.js - Mongoose Product Schema
const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    image: {
      type: String,
      default: 'https://placehold.co/300x200/cccccc/333333?text=No+Image', // Default placeholder image
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
