// models/Cart.js - Mongoose Cart Schema
const mongoose = require('mongoose');

const cartItemSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Product model's _id
    required: true,
    ref: 'Product' // Establishes a reference to the 'Product' model
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  image: {
    type: String,
    default: 'https://placehold.co/60x60/eeeeee/333333?text=Item', // Default placeholder for cart item image
  }
}, {
  _id: false // Do not create a separate _id for subdocuments (cart items)
});


const cartSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model's _id
      required: true,
      unique: true, // Each user has only one cart document
      ref: 'User' // Establishes a reference to the 'User' model
    },
    items: [cartItemSchema], // Array of cart items
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
