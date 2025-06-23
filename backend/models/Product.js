const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Product name
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Product description
    description: {
        type: String,
        required: true
    },
    // Product price
    price: {
        type: Number,
        required: true,
        min: 0 // Price cannot be negative
    },
    // URL for the product image
    image: {
        type: String,
        default: 'https://placehold.co/300x200/cccccc/333333?text=No+Image' // Default image if none provided
    },
    // Product category (e.g., "Electronics", "Groceries", "Clothing")
    category: {
        type: String,
        required: true,
        trim: true
    },
    // Available stock quantity
    stock: {
        type: Number,
        required: true,
        min: 0, // Stock cannot be negative
        default: 0
    },
    // Weight of the product (e.g., in grams, kg)
    weight: {
        type: Number,
        min: 0,
        default: 0
    },
    // Dimensions of the product (e.g., "LxWxH in cm")
    dimensions: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps automatically

module.exports = mongoose.model('Product', productSchema);
