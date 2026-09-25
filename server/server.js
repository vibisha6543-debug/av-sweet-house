const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");
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
// RAZORPAY SETUP
// ============================
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ============================
// MIDDLEWARE
// ============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// SERVE STATIC FILES
// ============================
const usersPath = path.join(__dirname, "../users");
const adminPath = path.join(__dirname, "../admin side");

console.log("📁 Users path:", usersPath);
console.log("📁 Admin path:", adminPath);
console.log("📁 Server path:", __dirname);

app.use("/users", express.static(usersPath));
app.use("/admin", express.static(adminPath));

// ============================
// ADMIN LOGIN
// ============================
app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log("🔐 ADMIN LOGIN ATTEMPT -", username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password required"
            });
        }

        if (username === "admin" && password === "admin123") {
            console.log("✅ Admin login SUCCESSFUL");
            return res.json({
                success: true,
                message: "Admin login successful",
                admin: {
                    username: "admin",
                    name: "Administrator",
                    role: "admin",
                    loginTime: new Date().toISOString()
                }
            });
        }

        console.log("❌ Admin login FAILED");
        return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
        });

    } catch (error) {
        console.error("❌ Admin Login Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

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
// OTP + EMAIL
// ============================
let otpStore = {};

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post("/api/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

        console.log("📧 OTP:", otp, "→", email);

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || "avsweethouse@gmail.com",
                to: email,
                subject: "AV Sweet House - Password Reset OTP",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; background: #fff5f8; padding: 30px; border-radius: 20px;">
                        <h2 style="color: #ff4d8d; text-align: center;">🍰 AV Sweet House</h2>
                        <h3 style="text-align: center;">Reset Your Password</h3>
                        <div style="background: #ff4d8d; color: white; padding: 20px; border-radius: 15px; text-align: center; font-size: 40px; font-weight: 800; letter-spacing: 10px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="color: #666; text-align: center; font-size: 13px;">Valid for 5 minutes.</p>
                    </div>
                `
            });
        } catch (e) { console.log("Email failed but OTP:", otp); }

        return res.json({ success: true, message: "OTP sent!", otp });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!otpStore[email]) return res.json({ success: false, message: "OTP expired" });
    if (String(otpStore[email]) !== String(otp)) return res.json({ success: false, message: "Invalid OTP" });
    delete otpStore[email];
    res.json({ success: true, message: "OTP verified!" });
});

app.post("/api/reset-password", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: "Required fields missing" });

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "User not found" });

        user.password = await bcrypt.hash(password, 10);
        await user.save();
        res.json({ success: true, message: "Password reset successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to reset password" });
    }
});

// ============================
// AUTH: REGISTER + LOGIN
// ============================
app.post("/api/register", async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "Email already registered" });

        const user = new User({
            firstName, lastName,
            email: email.trim().toLowerCase(),
            phone,
            password: await bcrypt.hash(password, 10)
        });
        await user.save();
        res.json({ success: true, message: "User Registered Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: "Enter email and password" });

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "Invalid email or password" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: "Invalid email or password" });

        res.json({
            success: true,
            message: "Login Successful",
            user: {
                id: user._id, _id: user._id,
                firstName: user.firstName, lastName: user.lastName,
                email: user.email, phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ============================
// ADMIN ROUTES
// ============================
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load orders" });
    }
});

app.get("/api/admin/customers", async (req, res) => {
    try {
        const customers = await User.find().select("-password").sort({ createdAt: -1 });
        res.json({ success: true, customers });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load customers" });
    }
});

app.get("/api/admin/stats", async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalCustomers = await User.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: "Pending" });
        const deliveredOrders = await Order.countDocuments({ status: "Delivered" });

        const revenueOrders = await Order.find({ status: { $in: ["Delivered", "Shipped", "Processing"] } });
        const totalRevenue = revenueOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });

        res.json({
            success: true,
            stats: { totalOrders, totalCustomers, pendingOrders, deliveredOrders, totalRevenue, todayOrders }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load stats" });
    }
});

// ============================
// PRODUCTS API
// ============================
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Not found" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post("/api/products", async (req, res) => {
    try {
        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            image: req.body.image,
            category: req.body.category
        });
        await product.save();
        res.json({ success: true, message: "Product Added" });
    } catch (error) {
        res.status(500).json({ message: "Add Product Failed" });
    }
});

app.put("/api/products/:id", async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                price: Number(req.body.price),
                image: req.body.image,
                category: req.body.category
            },
            { returnDocument: 'after' }
        );
        if (!updated) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Product Updated", product: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update Failed" });
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product Deleted" });
    } catch (error) {
        res.status(500).json({ message: "Delete Failed" });
    }
});

// ============================
// CART API
// ============================

// ===== CART - ADD =====
app.post("/api/cart/add", async (req, res) => {
    try {
        const { userId, productId, name, price, image, category, quantity, weight, flavor, message, packSize, bottleSize } = req.body;

        if (!userId || !productId) {
            return res.status(400).json({ success: false, message: "User ID and Product ID required" });
        }

        const findQuery = {
            userId: String(userId),
            productId: String(productId)
        };
        if (weight && weight !== '') findQuery.weight = weight;
        if (flavor && flavor !== '') findQuery.flavor = flavor;
        if (packSize && packSize !== '') findQuery.packSize = packSize;
        if (bottleSize && bottleSize !== '') findQuery.bottleSize = bottleSize;

        let existingItem = await Cart.findOne(findQuery);

        if (existingItem) {
            existingItem.quantity += quantity || 1;
            await existingItem.save();
            return res.json({ success: true, message: "Quantity updated in cart" });
        }

        const cartItem = new Cart({
            userId: String(userId),
            productId: String(productId),
            name, price, image, category,
            quantity: quantity || 1,
            weight: weight || '',
            flavor: flavor || '',
            message: message || '',
            packSize: packSize || '',
            bottleSize: bottleSize || ''
        });

        await cartItem.save();
        res.json({ success: true, message: "Added to cart" });

    } catch (error) {
        console.error("Cart Add Error:", error);
        res.status(500).json({ success: false, message: "Failed to add to cart" });
    }
});

// ===== CART - GET =====
app.get("/api/cart/:userId", async (req, res) => {
    try {
        const cartItems = await Cart.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load cart" });
    }
});

// ===== CART - COUNT =====
app.get("/api/cart/count/:userId", async (req, res) => {
    try {
        const count = await Cart.countDocuments({ userId: String(req.params.userId) });
        res.json({ count });
    } catch (error) {
        res.json({ count: 0 });
    }
});

// ===== CART - REMOVE =====
app.delete("/api/cart/:userId/:productId", async (req, res) => {
    try {
        await Cart.findOneAndDelete({
            userId: String(req.params.userId),
            productId: String(req.params.productId)
        });
        res.json({ success: true, message: "Removed from cart" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to remove" });
    }
});

// ===== CART - UPDATE QUANTITY =====
app.put("/api/cart/update", async (req, res) => {
    try {
        const { userId, productId, quantity, weight, flavor, packSize, bottleSize } = req.body;

        console.log("🔄 Update cart request:");
        console.log("   userId:", userId);
        console.log("   productId:", productId);
        console.log("   quantity:", quantity);

        if (!userId || !productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: "userId, productId, and quantity are required"
            });
        }

        const findQuery = {
            userId: String(userId),
            productId: String(productId)
        };

        if (weight && weight !== '') findQuery.weight = weight;
        if (flavor && flavor !== '') findQuery.flavor = flavor;
        if (packSize && packSize !== '') findQuery.packSize = packSize;
        if (bottleSize && bottleSize !== '') findQuery.bottleSize = bottleSize;

        console.log("🔍 Query:", JSON.stringify(findQuery));

        const item = await Cart.findOne(findQuery);

        if (item) {
            item.quantity = Number(quantity);
            await item.save();
            console.log(`✅ Quantity updated to ${quantity} for "${item.name}"`);
            res.json({ success: true, message: "Quantity updated", cartItem: item });
        } else {
            console.log("❌ Item not found in cart");
            res.status(404).json({ success: false, message: "Item not found in cart" });
        }
    } catch (error) {
        console.error("Update Cart Error:", error);
        res.status(500).json({ success: false, message: "Update failed: " + error.message });
    }
});

// ============================
// CLEAR CART AFTER ORDER
// ============================
app.post("/api/cart/clear-items", async (req, res) => {
    try {
        const { userId, productIds } = req.body;

        if (!userId || !productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ success: false, message: "userId and productIds required" });
        }

        const stringIds = productIds.map(id => String(id));

        const result = await Cart.deleteMany({
            userId: String(userId),
            productId: { $in: stringIds }
        });

        console.log(`🗑️ Cleared ${result.deletedCount} items`);
        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} items`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to clear cart" });
    }
});

// ============================
// RAZORPAY PAYMENT API
// ============================
app.post("/api/payment/create-order", async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) return res.status(400).json({ error: "Amount required" });

        const options = {
            amount: amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.post("/api/payment/verify-signature", (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            res.json({ success: true, message: "Payment verified" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Verification failed" });
    }
});

// ============================
// ORDERS API
// ============================
app.post("/api/orders", async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json({ success: true, message: "Order Placed Successfully", order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order Failed" });
    }
});

app.get("/api/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.get("/api/orders/user/:userId", async (req, res) => {
    try {
        const orders = await Order.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load orders" });
    }
});

app.get("/api/orders/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Not found" });
        res.json(order);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.put("/api/orders/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { returnDocument: 'after' }
        );

        if (!updated) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Status updated", order: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.delete("/api/orders/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Not found" });

        if (["Delivered", "Cancelled"].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel ${order.status} order` });
        }

        order.status = "Cancelled";
        await order.save();
        res.json({ success: true, message: "Order cancelled", order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to cancel" });
    }
});

app.put("/api/orders/:id/cancel", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: "Not found" });

        if (["Delivered", "Cancelled"].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel ${order.status} order` });
        }

        order.status = "Cancelled";
        await order.save();
        res.json({ success: true, message: "Order cancelled", order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to cancel" });
    }
});

// ============================
// WISHLIST API
// ============================
app.post("/api/wishlist", async (req, res) => {
    try {
        const { userId, productId, name, price, image, category } = req.body;

        if (!userId || !productId) return res.json({ success: false, message: "Required fields missing" });

        const existing = await Wishlist.findOne({
            userId: String(userId),
            productId: String(productId)
        });

        if (existing) return res.json({ success: false, message: "Already in Wishlist ❤️" });

        const wishlist = new Wishlist({
            userId: String(userId),
            productId: String(productId),
            name, price, image, category
        });

        await wishlist.save();
        res.json({ success: true, message: "Added to Wishlist ❤️", wishlist });
    } catch (error) {
        res.status(500).json({ success: false, message: "Wishlist failed" });
    }
});

app.get("/api/wishlist/:userId", async (req, res) => {
    try {
        const wishlist = await Wishlist.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load wishlist" });
    }
});

app.delete("/api/wishlist/:userId/:productId", async (req, res) => {
    try {
        const { userId, productId } = req.params;

        let result = await Wishlist.findOneAndDelete({
            userId: String(userId),
            productId: String(productId)
        });

        if (!result) {
            result = await Wishlist.findOneAndDelete({
                userId: String(userId),
                _id: productId
            });
        }

        if (!result) {
            result = await Wishlist.findByIdAndDelete(productId);
        }

        if (result) {
            res.json({ success: true, message: `Removed "${result.name}"`, item: result });
        } else {
            res.json({ success: false, message: "Not found in wishlist" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Remove failed" });
    }
});

// ============================
// CATEGORIES API
// ============================
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load categories" });
    }
});

app.get("/api/categories/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: "Not found" });
        res.json(category);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post("/api/categories", async (req, res) => {
    try {
        const { name, icon, type, parent, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Name required" });

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ success: false, message: "Already exists" });

        const category = new Category({
            name: name.trim(),
            icon: icon || "🍰",
            type: type || "main",
            parent: parent || "",
            description: description || ""
        });

        await category.save();
        res.json({ success: true, message: "Category added", category });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add category" });
    }
});

// =========================================================
// ✅ CASCADE UPDATE: Renaming a category also updates
//    all products + sub-categories + cart items that
//    reference the old name
// =========================================================
app.put("/api/categories/:id", async (req, res) => {
    try {
        const { name, icon, type, parent, description, isActive } = req.body;

        // 1. Get existing category (to know its OLD name)
        const existing = await Category.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        const oldName = existing.name;
        const newName = (name || '').trim();

        // 2. Prevent duplicate names (exclude self)
        if (newName && newName !== oldName) {
            const duplicate = await Category.findOne({
                name: newName,
                _id: { $ne: req.params.id }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: `Category "${newName}" already exists`
                });
            }
        }

        // 3. Update the category
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name: newName || oldName,
                icon, type, parent, description, isActive
            },
            { returnDocument: 'after' }
        );

        // 4. 🔥 CASCADE if the name changed
        let affectedProducts = 0;
        let affectedSubCategories = 0;
        let affectedCartItems = 0;

        if (oldName !== newName && newName) {
            // (a) Update PRODUCTS that have the old category name
            const productResult = await Product.updateMany(
                { category: oldName },
                { $set: { category: newName } }
            );
            affectedProducts = productResult.modifiedCount;

            // (b) Update SUB-CATEGORIES whose parent is oldName
            const subCatResult = await Category.updateMany(
                { parent: oldName },
                { $set: { parent: newName } }
            );
            affectedSubCategories = subCatResult.modifiedCount;

            // (c) Update CART items (so carts stay consistent)
            try {
                const cartResult = await Cart.updateMany(
                    { category: oldName },
                    { $set: { category: newName } }
                );
                affectedCartItems = cartResult.modifiedCount;
            } catch (e) {
                console.log("Cart cascade skipped:", e.message);
            }

            console.log(`✅ Category renamed: "${oldName}" → "${newName}"`);
            console.log(`   📦 ${affectedProducts} products updated`);
            console.log(`   📁 ${affectedSubCategories} sub-categories updated`);
            console.log(`   🛒 ${affectedCartItems} cart items updated`);
        }

        res.json({
            success: true,
            message: "Category updated successfully",
            category: updated,
            affectedProducts,
            affectedSubCategories,
            affectedCartItems,
            renamed: oldName !== newName
        });

    } catch (error) {
        console.error("Update Category Error:", error);
        res.status(500).json({ success: false, message: "Failed to update" });
    }
});

app.delete("/api/categories/:id", async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete" });
    }
});

app.post("/api/categories/seed", async (req, res) => {
    try {
        const count = await Category.countDocuments();
        if (count > 0) {
            return res.json({ success: false, message: `Already ${count} categories exist` });
        }

        const defaults = [
            { name: 'Cakes', icon: '🎂', type: 'main' },
            { name: 'Birthday Cakes', icon: '🎂', type: 'sub', parent: 'Cakes' },
            { name: 'Anniversary Cakes', icon: '🎂', type: 'sub', parent: 'Cakes' },
            { name: 'Wedding Cakes', icon: '🎂', type: 'sub', parent: 'Cakes' },
            { name: 'Kids Cakes', icon: '🎂', type: 'sub', parent: 'Cakes' },
            { name: 'Cup Cakes', icon: '🧁', type: 'sub', parent: 'Cakes' },
            { name: 'Chocolates', icon: '🍫', type: 'main' },
            { name: 'Milk Chocolates', icon: '🍫', type: 'sub', parent: 'Chocolates' },
            { name: 'Dark Chocolates', icon: '🍫', type: 'sub', parent: 'Chocolates' },
            { name: 'White Chocolates', icon: '🍫', type: 'sub', parent: 'Chocolates' },
            { name: 'Desserts', icon: '🍰', type: 'main' },
            { name: 'Brownies', icon: '🍩', type: 'sub', parent: 'Desserts' },
            { name: 'Donuts', icon: '🍩', type: 'sub', parent: 'Desserts' },
            { name: 'Cheesecakes', icon: '🍰', type: 'sub', parent: 'Desserts' },
            { name: 'Pastry', icon: '🍰', type: 'sub', parent: 'Desserts' },
            { name: 'Cookies', icon: '🍪', type: 'sub', parent: 'Desserts' },
            { name: 'Juices', icon: '🥤', type: 'main' },
            { name: 'Fresh Juices', icon: '🥤', type: 'sub', parent: 'Juices' },
            { name: 'Milkshakes', icon: '🥤', type: 'sub', parent: 'Juices' },
            { name: 'Smoothies', icon: '🍹', type: 'sub', parent: 'Juices' },
            { name: 'Cold Coffee', icon: '☕', type: 'sub', parent: 'Juices' },
            { name: 'Snacks', icon: '🍿', type: 'main' },
            { name: 'Murukku', icon: '🍿', type: 'sub', parent: 'Snacks' },
            { name: 'Traditional Sweets', icon: '🍭', type: 'sub', parent: 'Snacks' },
            { name: 'Mixtures & Namkeen', icon: '🍿', type: 'sub', parent: 'Snacks' },
            { name: 'Biscuits', icon: '🍪', type: 'sub', parent: 'Snacks' },
            { name: 'Chips', icon: '🍿', type: 'sub', parent: 'Snacks' }
        ];

        const result = await Category.insertMany(defaults);
        res.json({ success: true, message: `${result.length} categories seeded`, count: result.length });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to seed" });
    }
});

// ============================
// WILDCARD PAGE ROUTE (MUST BE LAST)
// ============================
app.get("/:page.html", (req, res) => {
    const page = req.params.page;

    let filePath = path.join(__dirname, `${page}.html`);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);

    filePath = path.join(usersPath, `${page}.html`);
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
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 Users folder: ${usersPath}`);
    console.log(`🌐 Visit: http://localhost:5000`);
    console.log(`🔑 API Base: http://localhost:5000/api`);
    console.log(`👤 Admin Login: POST http://localhost:5000/api/admin/login`);
});