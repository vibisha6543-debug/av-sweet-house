const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    icon: {
        type: String,
        default: "🍰"
    },
    type: {
        type: String,
        enum: ["main", "sub"],
        default: "main"
    },
    parent: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Category", CategorySchema);