// controllers/productController.js
const Product = require("../models/Product");

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      image: req.body.image,
      category: req.body.category,
    });
    await product.save();
    res.json({ success: true, message: "Product Added" });
  } catch (error) {
    res.status(500).json({ message: "Add Product Failed" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        price: Number(req.body.price),
        image: req.body.image,
        category: req.body.category,
      },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Product Updated", product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update Failed" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete Failed" });
  }
};