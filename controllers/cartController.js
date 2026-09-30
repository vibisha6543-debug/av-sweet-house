const Cart = require("../models/Cart");

exports.addToCart = async (req, res) => {
  try {
    const { userId, productId, name, price, image, category, quantity,
            weight, flavor, message, packSize, bottleSize } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: "User ID and Product ID required" });
    }

    const findQuery = { userId: String(userId), productId: String(productId) };
    if (weight) findQuery.weight = weight;
    if (flavor) findQuery.flavor = flavor;
    if (packSize) findQuery.packSize = packSize;
    if (bottleSize) findQuery.bottleSize = bottleSize;

    const existingItem = await Cart.findOne(findQuery);

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
      weight: weight || "",
      flavor: flavor || "",
      message: message || "",
      packSize: packSize || "",
      bottleSize: bottleSize || "",
    });

    await cartItem.save();
    res.json({ success: true, message: "Added to cart" });
  } catch (error) {
    console.error("Cart Add Error:", error);
    res.status(500).json({ success: false, message: "Failed to add to cart" });
  }
};

exports.getCart = async (req, res) => {
  try {
    const cartItems = await Cart.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load cart" });
  }
};

exports.getCartCount = async (req, res) => {
  try {
    const count = await Cart.countDocuments({ userId: String(req.params.userId) });
    res.json({ count });
  } catch (error) {
    res.json({ count: 0 });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({
      userId: String(req.params.userId),
      productId: String(req.params.productId),
    });
    res.json({ success: true, message: "Removed from cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove" });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const { userId, productId, quantity, weight, flavor, packSize, bottleSize } = req.body;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "userId, productId, and quantity are required",
      });
    }

    const findQuery = { userId: String(userId), productId: String(productId) };
    if (weight) findQuery.weight = weight;
    if (flavor) findQuery.flavor = flavor;
    if (packSize) findQuery.packSize = packSize;
    if (bottleSize) findQuery.bottleSize = bottleSize;

    const item = await Cart.findOne(findQuery);

    if (item) {
      item.quantity = Number(quantity);
      await item.save();
      res.json({ success: true, message: "Quantity updated", cartItem: item });
    } else {
      res.status(404).json({ success: false, message: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ success: false, message: "Update failed: " + error.message });
  }
};

exports.clearCartItems = async (req, res) => {
  try {
    const { userId, productIds } = req.body;

    if (!userId || !productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, message: "userId and productIds required" });
    }

    const stringIds = productIds.map((id) => String(id));

    const result = await Cart.deleteMany({
      userId: String(userId),
      productId: { $in: stringIds },
    });

    console.log(`🗑️ Cleared ${result.deletedCount} items`);
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} items`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};