const Order = require("../models/Order");

// POST — create a new order
exports.createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.json({ success: true, message: "Order Placed Successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Order Failed" });
  }
};

// GET — all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// GET — orders of a specific user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load orders" });
  }
};

// GET — one order by id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PUT — update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { returnDocument: "after" }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Status updated", order: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DELETE — cancel order
exports.cancelOrder = async (req, res) => {
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
};

// PUT — cancel order (alternate route)
exports.cancelOrderPut = async (req, res) => {
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
};