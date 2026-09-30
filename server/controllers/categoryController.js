const Category = require("../models/Category");
const Product = require("../models/Product");

// lazy-load Cart to avoid crash if missing
let Cart;
try { Cart = require("../models/Cart"); } catch (e) { Cart = null; }

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createCategory = async (req, res) => {
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
      description: description || "",
    });

    await category.save();
    res.json({ success: true, message: "Category added", category });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, icon, type, parent, description, isActive } = req.body;

    const existing = await Category.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Category not found" });

    const oldName = existing.name;
    const newName = (name || "").trim();

    if (newName && newName !== oldName) {
      const duplicate = await Category.findOne({ name: newName, _id: { $ne: req.params.id } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Category "${newName}" already exists`,
        });
      }
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: newName || oldName, icon, type, parent, description, isActive },
      { returnDocument: "after" }
    );

    let affectedProducts = 0, affectedSubCategories = 0, affectedCartItems = 0;

    if (oldName !== newName && newName) {
      const productResult = await Product.updateMany(
        { category: oldName },
        { $set: { category: newName } }
      );
      affectedProducts = productResult.modifiedCount;

      const subCatResult = await Category.updateMany(
        { parent: oldName },
        { $set: { parent: newName } }
      );
      affectedSubCategories = subCatResult.modifiedCount;

      if (Cart) {
        try {
          const cartResult = await Cart.updateMany(
            { category: oldName },
            { $set: { category: newName } }
          );
          affectedCartItems = cartResult.modifiedCount;
        } catch (e) {
          console.log("Cart cascade skipped:", e.message);
        }
      }

      console.log(`✅ Category renamed: "${oldName}" → "${newName}"`);
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      category: updated,
      affectedProducts,
      affectedSubCategories,
      affectedCartItems,
      renamed: oldName !== newName,
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({ success: false, message: "Failed to update" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
};

exports.seedCategories = async (req, res) => {
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
};