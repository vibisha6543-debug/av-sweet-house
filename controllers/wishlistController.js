const Wishlist = require("../models/Wishlist");

exports.addToWishlist = async (req, res) => {
  try {
    const { userId, productId, name, price, image, category } = req.body;

    if (!userId || !productId) {
      return res.json({ success: false, message: "Required fields missing" });
    }

    const existing = await Wishlist.findOne({
      userId: String(userId),
      productId: String(productId),
    });

    if (existing) return res.json({ success: false, message: "Already in Wishlist ❤️" });

    const wishlist = new Wishlist({
      userId: String(userId),
      productId: String(productId),
      name, price, image, category,
    });

    await wishlist.save();
    res.json({ success: true, message: "Added to Wishlist ❤️", wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: "Wishlist failed" });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load wishlist" });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.params;

    let result = await Wishlist.findOneAndDelete({
      userId: String(userId),
      productId: String(productId),
    });

    if (!result) {
      result = await Wishlist.findOneAndDelete({ userId: String(userId), _id: productId });
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
};