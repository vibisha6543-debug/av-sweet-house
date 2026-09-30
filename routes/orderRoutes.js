const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  cancelOrderPut,
} = require("../controllers/orderController");

// ⚠️ Order matters — specific routes BEFORE "/:id"
router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/user/:userId", getUserOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", cancelOrder);
router.put("/:id/cancel", cancelOrderPut);

module.exports = router;