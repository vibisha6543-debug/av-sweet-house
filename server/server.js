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
// ADMIN API ROUTES (Placed FIRST for priority)
// ============================
app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log("=====================================");
        console.log("🔐 ADMIN LOGIN ATTEMPT");
        console.log("📧 Username:", username);
        console.log("🕒 Time:", new Date().toLocaleString());
        console.log("=====================================");

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password required"
            });
        }

        // ⭐ ADMIN CREDENTIALS
        const ADMIN_USERNAME = "admin";
        const ADMIN_PASSWORD = "admin123";

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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

        console.log("❌ Admin login FAILED - Wrong credentials");
        return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
        });

    } catch (error) {
        console.error("❌ Admin Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
});

// ============================
// HOME & PAGE ROUTES
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

    res.send(`
        <h1>🍰 AV Sweet House</h1>
        <p>Server is running!</p>
        <p>Visit: <a href="/users/index.html">/users/index.html</a></p>
    `);
});

// ============================
// OTP STORAGE
// ============================
let otpStore = {};

// ============================
// EMAIL TRANSPORTER
// ============================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ============================
// SEND OTP
// ============================
app.post("/api/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email required"
            });
        }

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
                        <h3 style="text-align: center; color: #333;">Reset Your Password</h3>
                        <p style="color: #666; text-align: center;">Use the OTP below to reset your password:</p>
                        <div style="background: #ff4d8d; color: white; padding: 20px; border-radius: 15px; text-align: center; font-size: 40px; font-weight: 800; letter-spacing: 10px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="color: #666; text-align: center; font-size: 13px;">This OTP is valid for 5 minutes.</p>
                    </div>
                `
            });
            console.log("✅ Email sent");
        } catch (emailError) {
            console.log("⚠️ Email failed but OTP is:", otp);
        }

        return res.json({
            success: true,
            message: "OTP sent successfully!",
            otp: otp
        });

    } catch (err) {
        console.log("❌ ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ============================
// VERIFY OTP
// ============================
app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!otpStore[email]) {
        return res.json({
            success: false,
            message: "OTP expired or not found. Please request a new OTP."
        });
    }

    if (String(otpStore[email]) !== String(otp)) {
        return res.json({
            success: false,
            message: "Invalid OTP. Please try again."
        });
    }

    delete otpStore[email];
    res.json({
        success: true,
        message: "OTP verified successfully!"
    });
});

// ============================
// RESET PASSWORD
// ============================
app.post("/api/reset-password", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                success: false,
                message: "User not found with this email"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successfully!"
        });

    } catch (error) {
        console.error("❌ Reset Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password."
        });
    }
});

// ===== REGISTER USER =====
app.post("/api/register", async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            firstName,
            lastName,
            email: email.trim().toLowerCase(),
            phone,
            password: hashedPassword
        });
        await user.save();

        res.json({ success: true, message: "User Registered Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ===== LOGIN USER =====
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("LOGIN REQUEST - Email:", email);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please enter email and password" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        res.json({
            success: true,
            message: "Login Successful",
            user: {
                id: user._id,
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
});

// ============================
// ADMIN - GET ALL ORDERS
// ============================
app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Admin Get Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load orders" });
    }
});

// ============================
// ADMIN - GET ALL CUSTOMERS
// ============================
app.get("/api/admin/customers", async (req, res) => {
    try {
        const customers = await User.find().select("-password").sort({ createdAt: -1 });
        res.json({ success: true, customers });
    } catch (error) {
        console.error("Admin Get Customers Error:", error);
        res.status(500).json({ success: false, message: "Failed to load customers" });
    }
});

// ============================
// ADMIN - DASHBOARD STATS
// ============================
app.get("/api/admin/stats", async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalCustomers = await User.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: "Pending" });
        const deliveredOrders = await Order.countDocuments({ status: "Delivered" });

        // Calculate total revenue from Delivered + Processing + Shipped orders
        const revenueOrders = await Order.find({
            status: { $in: ["Delivered", "Shipped", "Processing"] }
        });
        const totalRevenue = revenueOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        // Today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            stats: {
                totalOrders,
                totalCustomers,
                pendingOrders,
                deliveredOrders,
                totalRevenue,
                todayOrders
            }
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ success: false, message: "Failed to load stats" });
    }
});

// ===== GET ALL PRODUCTS =====
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error("Get Products Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ===== GET SINGLE PRODUCT =====
app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        console.error("Get Product Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ===== ADD PRODUCT =====
app.post("/api/products", async (req, res) => {
    try {
        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            image: req.body.image,
            category: req.body.category
        });
        await product.save();
        res.json({ success: true, message: "Product Added Successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Add Product Failed" });
    }
});

// ===== UPDATE PRODUCT =====
app.put("/api/products/:id", async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                price: Number(req.body.price),
                image: req.body.image,
                category: req.body.category
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({
            success: true,
            message: "Product Updated Successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: "Update Failed" });
    }
});

// ===== DELETE PRODUCT =====
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

        let existingItem = await Cart.findOne({
            userId: String(userId),
            productId: String(productId),
            weight: weight || "",
            flavor: flavor || "",
            packSize: packSize || "",
            bottleSize: bottleSize || ""
        });

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
            weight, flavor, message, packSize, bottleSize
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
        console.error("Get Cart Error:", error);
        res.status(500).json({ success: false, message: "Failed to load cart" });
    }
});

// ===== CART - COUNT =====
app.get("/api/cart/count/:userId", async (req, res) => {
    try {
        const count = await Cart.countDocuments({ userId: String(req.params.userId) });
        res.json({ count });
    } catch (error) {
        console.error("Cart Count Error:", error);
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
        console.error("Remove Cart Error:", error);
        res.status(500).json({ success: false, message: "Failed to remove" });
    }
});

// ===== CART - UPDATE QUANTITY =====
app.put("/api/cart/update", async (req, res) => {
    try {
        const { userId, productId, quantity, weight, flavor, packSize, bottleSize } = req.body;

        const item = await Cart.findOne({
            userId: String(userId),
            productId: String(productId),
            weight: weight || "",
            flavor: flavor || "",
            packSize: packSize || "",
            bottleSize: bottleSize || ""
        });

        if (item) {
            item.quantity = quantity;
            await item.save();
            res.json({ success: true, message: "Quantity updated" });
        } else {
            res.status(404).json({ success: false, message: "Item not found" });
        }
    } catch (error) {
        console.error("Update Cart Error:", error);
        res.status(500).json({ success: false, message: "Update failed" });
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

        console.log(`🗑️ Cleared ${result.deletedCount} items from cart for user ${userId}`);
        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} items`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error("Clear Cart Error:", error);
        res.status(500).json({ success: false, message: "Failed to clear cart" });
    }
});

// ============================
// RAZORPAY PAYMENT API
// ============================
app.post("/api/payment/create-order", async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) {
            return res.status(400).json({ error: "Amount is required" });
        }

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
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }

    } catch (error) {
        console.error("Razorpay Verify Error:", error);
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
        console.log(error);
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

// ===== ORDERS - GET BY USER =====
app.get("/api/orders/user/:userId", async (req, res) => {
    try {
        const orders = await Order.find({
            userId: String(req.params.userId)
        }).sort({ createdAt: -1 });

        console.log(`📦 Found ${orders.length} orders for user ${req.params.userId}`);
        res.json(orders);
    } catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load orders" });
    }
});

app.get("/api/orders/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.json(order);
    } catch (error) {
        console.error("Get Order Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ===== ORDERS - UPDATE STATUS =====
app.put("/api/orders/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid order status" });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        console.log(`✅ Order ${req.params.id} status updated to "${status}"`);

        res.json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder
        });
    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ===== ORDERS - CANCEL (DELETE) =====
app.delete("/api/orders/:id", async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const nonCancellableStatuses = ["Delivered", "Cancelled"];
        if (nonCancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled because it is ${order.status}`
            });
        }

        order.status = "Cancelled";
        await order.save();

        console.log(`✅ Order ${orderId} cancelled successfully`);
        res.json({ success: true, message: "Order cancelled successfully", order });
    } catch (error) {
        console.error("Cancel Order Error:", error);
        res.status(500).json({ success: false, message: "Failed to cancel order" });
    }
});

// ===== ORDERS - CANCEL (PUT) =====
app.put("/api/orders/:id/cancel", async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const nonCancellableStatuses = ["Delivered", "Cancelled"];
        if (nonCancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled because it is ${order.status}`
            });
        }

        order.status = "Cancelled";
        await order.save();

        console.log(`✅ Order ${orderId} cancelled successfully (PUT)`);
        res.json({ success: true, message: "Order cancelled successfully", order });
    } catch (error) {
        console.error("Cancel Order Error:", error);
        res.status(500).json({ success: false, message: "Failed to cancel order" });
    }
});

// ============================
// WISHLIST API
// ============================
app.post("/api/wishlist", async (req, res) => {
    try {
        const { userId, productId, name, price, image, category } = req.body;

        if (!userId || !productId) {
            return res.json({ success: false, message: "User and Product required" });
        }

        const existingWishlist = await Wishlist.findOne({
            userId: String(userId),
            productId: String(productId)
        });

        if (existingWishlist) {
            return res.json({ success: false, message: "Already in Wishlist ❤️" });
        }

        const wishlist = new Wishlist({
            userId: String(userId),
            productId: String(productId),
            name, price, image, category
        });

        await wishlist.save();
        res.json({ success: true, message: "Added to Wishlist ❤️", wishlist });
    } catch (error) {
        console.error("Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Wishlist failed" });
    }
});

app.get("/api/wishlist/:userId", async (req, res) => {
    try {
        const wishlist = await Wishlist.find({
            userId: String(req.params.userId)
        }).sort({ createdAt: -1 });
        res.json(wishlist);
    } catch (error) {
        console.error("Get Wishlist Error:", error);
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
            res.json({
                success: true,
                message: `Removed "${result.name}" from Wishlist`,
                deleted: true,
                item: result
            });
        } else {
            res.json({
                success: false,
                message: "Item not found in wishlist",
                deleted: false
            });
        }

    } catch (error) {
        console.error("❌ Remove Wishlist Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Remove failed"
        });
    }
});

// ============================
// WILDCARD PAGE ROUTE (MUST BE LAST)
// ============================
app.get("/:page.html", (req, res) => {
    const page = req.params.page;

    let filePath = path.join(__dirname, `${page}.html`);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    filePath = path.join(usersPath, `${page}.html`);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    res.status(404).send(`Page "${page}.html" not found`);
});

// ============================
// CATEGORIES API
// ============================

// GET ALL CATEGORIES
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: 1 });
        res.json(categories);
    } catch (error) {
        console.error("Get Categories Error:", error);
        res.status(500).json({ success: false, message: "Failed to load categories" });
    }
});

// GET SINGLE CATEGORY
app.get("/api/categories/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: "Category not found" });
        res.json(category);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ADD CATEGORY
app.post("/api/categories", async (req, res) => {
    try {
        const { name, icon, type, parent, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Category name required" });

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ success: false, message: "Category already exists" });

        const category = new Category({
            name: name.trim(),
            icon: icon || "🍰",
            type: type || "main",
            parent: parent || "",
            description: description || ""
        });

        await category.save();
        res.json({ success: true, message: "Category added successfully", category });
    } catch (error) {
        console.error("Add Category Error:", error);
        res.status(500).json({ success: false, message: "Failed to add category" });
    }
});

// UPDATE CATEGORY
app.put("/api/categories/:id", async (req, res) => {
    try {
        const { name, icon, type, parent, description, isActive } = req.body;

        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { name, icon, type, parent, description, isActive },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: "Category not found" });
        res.json({ success: true, message: "Category updated", category: updated });
    } catch (error) {
        console.error("Update Category Error:", error);
        res.status(500).json({ success: false, message: "Failed to update category" });
    }
});

// DELETE CATEGORY
app.delete("/api/categories/:id", async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: "Category not found" });
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete category" });
    }
});

// SEED DEFAULT CATEGORIES (One-time)
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
        console.error("Seed Error:", error);
        res.status(500).json({ success: false, message: "Failed to seed" });
    }
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