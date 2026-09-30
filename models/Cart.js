const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    name: String,
    price: Number,
    image: String,
    category: String,
    quantity: { type: Number, default: 1 },
    weight: String,
    flavor: String,
    message: String,
    packSize: String,
    bottleSize: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Cart", CartSchema);