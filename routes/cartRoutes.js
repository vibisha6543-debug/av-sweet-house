const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  getCartCount,
  removeFromCart,
  updateCartQuantity,
  clearCartItems,
} = require("../controllers/cartController");

router.post("/add", addToCart);
router.get("/count/:userId", getCartCount);   // ⚠️ BEFORE "/:userId"
router.get("/:userId", getCart);
router.delete("/:userId/:productId", removeFromCart);
router.put("/update", updateCartQuantity);
router.post("/clear-items", clearCartItems);

module.exports = router;