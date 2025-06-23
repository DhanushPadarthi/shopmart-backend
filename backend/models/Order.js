const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Reference to the User who placed the order
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Refers to the 'User' model
        required: true
    },
    // Array of items in the order
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product', // Refers to the 'Product' model
                required: true
            },
            name: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1 // Quantity must be at least 1
            },
            price: {
                type: Number,
                required: true,
                min: 0 // Price cannot be negative
            },
            image: { // Store image URL for easy display in order history
                type: String,
                default: 'https://placehold.co/60x60/cccccc/333333?text=Item'
            }
        }
    ],
    // Total amount of the order
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // Payment method used (e.g., 'Credit Card', 'PayPal', 'COD')
    paymentMethod: {
        type: String,
        required: true,
        trim: true
    },
    // Shipping address for the order
    shippingAddress: {
        type: String,
        required: true,
        trim: true
    },
    // Current status of the order
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], // Possible order statuses
        default: 'pending' // Default status when an order is placed
    }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps automatically

module.exports = mongoose.model('Order', orderSchema);
