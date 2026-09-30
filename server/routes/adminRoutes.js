// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getAllOrders,
  getAllCustomers,
  getStats,
} = require("../controllers/adminController");

router.post("/login", adminLogin);
router.get("/orders", getAllOrders);
router.get("/customers", getAllCustomers);
router.get("/stats", getStats);

module.exports = router;