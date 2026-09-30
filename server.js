const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });
require("./config/db");

// ============================
// MODELS
// ============================
const Order = require("./models/Order");
const User = require("./models/User");
const Product = require("./models/Product");
const Wishlist = require("./models/Wishlist");
const Category = require("./models/Category");

// Create Cart model if it doesn't exist
let Cart;
try {
    Cart = require("./models/Cart");
} catch (e) {
    console.log("⚠️ Cart model not found, creating...");
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
    Cart = mongoose.model("Cart", CartSchema);
}

const app = express();

// ============================
// MIDDLEWARE
// ============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// SERVE STATIC FILES (same public URLs as before)
// ============================
const usersPath = path.join(__dirname, "views", "user");
const adminPath = path.join(__dirname, "views", "admin");

console.log("📁 Users path:", usersPath);
console.log("📁 Admin path:", adminPath);
console.log("📁 Server path:", __dirname);

app.use("/users", express.static(usersPath));
app.use("/admin", express.static(adminPath));

// ============================
// ROUTES
// ============================
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);

const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

const wishlistRoutes = require("./routes/wishlistRoutes");
app.use("/api/wishlist", wishlistRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api", authRoutes);

const otpRoutes = require("./routes/otpRoutes");
app.use("/api", otpRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payment", paymentRoutes);

// ============================
// HOME ROUTE
// ============================
app.get("/", (req, res) => {
    const usersIndex = path.join(usersPath, "index.html");
    if (fs.existsSync(usersIndex)) {
        return res.sendFile(usersIndex);
    }
    const serverIndex = path.join(__dirname, "index.html");
    if (fs.existsSync(serverIndex)) {
        return res.sendFile(serverIndex);
    }
    res.send(`<h1>🍰 AV Sweet House</h1><p>Server is running!</p>`);
});

// ============================
// WILDCARD PAGE ROUTE (MUST BE LAST)
// ============================
app.get("/:page.html", (req, res) => {
    const page = req.params.page;

    let filePath = path.join(usersPath, `${page}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);

    filePath = path.join(adminPath, `${page}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);

    res.status(404).send(`Page "${page}.html" not found`);
});

// ============================
// ERROR HANDLING
// ============================
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Go to Homepage</a>
    `);
});

// ============================
// START SERVER
// ============================
const PORT = 5100;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 Users folder: ${usersPath}`);
    console.log(`🌐 Visit: http://localhost:5100`);
    console.log(`🔑 API Base: http://localhost:5100/api`);
    console.log(`👤 Admin Login: POST http://localhost:5100/api/admin/login`);
});
