// controllers/adminController.js
const Order = require("../models/Order");
const User = require("../models/User");

// ---------- ADMIN LOGIN ----------
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("🔐 ADMIN LOGIN ATTEMPT -", username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required",
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
          loginTime: new Date().toISOString(),
        },
      });
    }

    console.log("❌ Admin login FAILED");
    return res.status(401).json({
      success: false,
      message: "Invalid admin credentials",
    });
  } catch (error) {
    console.error("❌ Admin Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- GET ALL ORDERS (admin) ----------
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load orders" });
  }
};

// ---------- GET ALL CUSTOMERS ----------
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load customers" });
  }
};

// ---------- STATS ----------
exports.getStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "Pending" });
    const deliveredOrders = await Order.countDocuments({ status: "Delivered" });

    const revenueOrders = await Order.find({
      status: { $in: ["Delivered", "Shipped", "Processing"] },
    });
    const totalRevenue = revenueOrders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalCustomers,
        pendingOrders,
        deliveredOrders,
        totalRevenue,
        todayOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
};