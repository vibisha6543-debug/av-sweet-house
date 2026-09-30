const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },

    productId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    image: {
        type: String
    },

    category: {
        type: String
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "Wishlist",
    wishlistSchema
);