const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        // User's full name (added from the latest version)
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            // Regex for email validation
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
        },
        password: {
            type: String,
            required: true,
        },
        // User's shipping/billing address (added from the latest version)
        address: {
            type: String,
            required: true, // This field is still required based on user's schema
            trim: true
        },
        // User's phone number (added from the latest version)
        phone: {
            type: String,
            required: true, // This field is still required based on user's schema
            trim: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        // Embedded cart for the user
        cart: [
            {
                productId: { // Reference to the Product model
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ]
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields automatically
    }
);

// Pre-save hook to hash password before saving to database
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next(); // If password is not modified, move to next middleware
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Move to the next middleware
});

// Method to compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Compare the entered password with the hashed password stored in the database
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
