const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    userId: {
        type: String
    },

    customerName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    phone: {
        type: String
    },

    // DELIVERY ADDRESS
    address: {
        type: String
    },

    city: {
        type: String
    },

    pincode: {
        type: String
    },

    deliveryInstructions: {
        type: String
    },

    // DELIVERY DETAILS
    deliveryOption: {
        type: String,
        default: "Home Delivery"
    },

    deliveryDate: {
        type: String
    },

    deliveryTime: {
        type: String
    },

    // PAYMENT
    paymentMethod: {
        type: String,
        default: "UPI"
    },

    // PRODUCTS
    products: [
        {
            name: String,
            price: Number,
            quantity: Number,
            image: String
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        default: "Pending"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Order", orderSchema);