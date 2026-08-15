const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");


require("./config/db");

const Order = require("./models/Order");
const User = require("./models/User");
const Product = require("./models/Product");
const Wishlist = require("./models/Wishlist");


const app = express();

// ============================
// OTP Storage
// ============================

let otpStore = {};



app.use(cors());
app.use(express.json());

app.use("/users", express.static(path.join(__dirname, "../users")));

app.use("/admin", express.static(path.join(__dirname, "../admin side")));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "vibisha6543@gmail.com",
        pass: "dehzomqucpkllwiu"
    }
});

app.get("/", (req, res) => {
    // res.send("🎂 AV Sweet House Backend Running Successfully!");
    res.sendFile(path.join(__dirname,  "index.html"));
});

app.get("/api/products", async (req, res) => {

    try {

        const products = await Product.find();

        res.json(products);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

app.post("/api/products", async (req, res) => {

    try {

        const product = new Product({

            name: req.body.name,
            price: req.body.price,
            image: req.body.image,
            category: req.body.category,
            description: req.body.description

        });

        await product.save();

        res.json({
            success: true,
            message: "Product Added Successfully"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
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

    console.log("=================================");
    console.log("Email:", email);
    console.log("Entered OTP:", otp);
    console.log("Stored OTP:", otpStore[email]);
    console.log("OTP Store:", otpStore);
    console.log("=================================");

    if (!otpStore[email]) {
        return res.json({
            success: false,
            message: "OTP Expired"
        });
    }

    if (String(otpStore[email]) !== String(otp)) {
        return res.json({
            success: false,
            message: "Invalid OTP"
        });
    }

    delete otpStore[email];

    res.json({
        success: true
    });

});
/* ===========================
   DELETE PRODUCT
=========================== */



app.post("/api/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        console.log(req.body);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email required"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore[email] = otp;

        console.log("Generated OTP:", otp);

        await transporter.sendMail({
            from: "vibisha6543@gmail.com",
            to: email,
            subject: "AV Sweet House OTP",
            text: `Your OTP is ${otp}`
        });

        return res.json({
            success: true
        });

    } catch(err){

        console.log("FULL ERROR:");
        console.log(err);

        return res.status(500).json({
            success:false,
            message:err.message
        });

    }

});
// ============================
// REGISTER USER
// ============================

const usersFile = path.join(__dirname, "data", "users.json");

app.post("/api/register", async (req, res) => {

    try {

        const { firstName, lastName, email, phone, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {

            return res.json({
                success: false,
                message: "Email already registered"
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword
        });

        await user.save();

        res.json({
            success: true,
            message: "User Registered Successfully"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});
// ============================
// LOGIN USER
// ============================

app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    console.log("LOGIN REQUEST");
console.log("Email:", email);
console.log("Password:", password);


    let users = [];

    if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    }

    const user = users.find(u => u.email === email);

    console.log("User found:", user);

    if (!user) {
        return res.json({
            success: false,
            message: "Invalid Email"
        });
    }

    console.log("Email entered:", email);
console.log("Password entered:", password);

    const match = await bcrypt.compare(password, user.password);

    console.log("Password Match:", match);

    if (!match) {
        return res.json({
            success: false,
            message: "Invalid Password"
        });
    }

    res.json({
        success: true,
        message: "Login Successful",
        user
    });

});





// ================================
// PRODUCT API
// ================================

// GET ALL PRODUCTS
app.get("/api/products", async (req,res)=>{

    try{

        const products = await Product.find();

        res.json(products);

    }catch(error){

        res.status(500).json({
            message:"Server Error"
        });

    }

});


// ADD PRODUCT
app.post("/api/products", async(req,res)=>{

    try{

        const product = new Product({

            name:req.body.name,
            price:req.body.price,
            image:req.body.image,
            category:req.body.category

        });


        await product.save();


        res.json({

            success:true,
            message:"Product Added Successfully"

        });


    }catch(error){

        console.log(error);

        res.status(500).json({

            message:"Add Product Failed"

        });

    }

});


// UPDATE PRODUCT
// UPDATE PRODUCT
app.put("/api/products/:id", async (req, res) => {

    try {

        const updatedProduct =
            await Product.findByIdAndUpdate(
                req.params.id,
                {
                    name: req.body.name,
                    price: Number(req.body.price),
                    image: req.body.image,
                    category: req.body.category
                },
                {
                    new: true
                }
            );

        if (!updatedProduct) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.json({
            success: true,
            message: "Product Updated Successfully",
            product: updatedProduct
        });

    } catch (error) {

        console.error("Update Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Update Failed"
        });

    }

});

// DELETE PRODUCT
app.delete("/api/products/:id", async(req,res)=>{

    try{

        await Product.findByIdAndDelete(req.params.id);


        res.json({

            success:true,
            message:"Product Deleted"

        });


    }catch(error){

        res.status(500).json({

            message:"Delete Failed"

        });

    }

});

// CREATE ORDER

app.post("/api/orders", async(req,res)=>{

    try{

        const order = new Order(req.body);

        await order.save();


        res.json({

            success:true,
            message:"Order Placed Successfully",
            order

        });


    }catch(error){

        console.log(error);

        res.status(500).json({

            success:false,
            message:"Order Failed"

        });

    }

});


// GET ALL ORDERS (ADMIN)

app.get("/api/orders", async(req,res)=>{

    try{

        const orders = await Order.find()
        .sort({createdAt:-1});


        res.json(orders);


    }catch(error){

        res.status(500).json({

            message:"Server Error"

        });

    }

});
// GET SINGLE ORDER
app.get("/api/orders/:id", async (req, res) => {

    try {

        const order =
            await Order.findById(req.params.id);

        if(!order){

            return res.status(404).json({

                success:false,
                message:"Order not found"

            });

        }

        res.json(order);

    }
    catch(error){

        console.error(
            "Get Order Error:",
            error
        );

        res.status(500).json({

            success:false,
            message:"Server Error"

        });

    }

});
// UPDATE ORDER STATUS
// UPDATE ORDER STATUS

app.put("/api/orders/:id/status", async (req, res) => {

    try {

        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { returnDocument: "after" }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder
        });

    } catch (error) {

        console.error("Status Update Error:", error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});
// UPDATE ORDER STATUS (ADMIN)

// ================================
// WISHLIST API
// ================================

// ADD TO WISHLIST
app.post("/api/wishlist", async (req, res) => {

    try {

        const {
            userId,
            productId,
            name,
            price,
            image,
            category
        } = req.body;

        if (!userId || !productId) {

            return res.json({
                success: false,
                message: "User and Product required"
            });

        }

        // Check if product already exists in wishlist
        const existingWishlist =
            await Wishlist.findOne({
                userId: String(userId),
                productId: String(productId)
            });

        if (existingWishlist) {

            return res.json({
                success: false,
                message: "Already in Wishlist ❤️"
            });

        }

        // Create wishlist item
        const wishlist =
            new Wishlist({

                userId: String(userId),
                productId: String(productId),
                name: name,
                price: price,
                image: image,
                category: category

            });

        await wishlist.save();

        res.json({

            success: true,
            message: "Added to Wishlist ❤️",
            wishlist: wishlist

        });

    } catch (error) {

        console.error("Wishlist Error:", error);

        res.status(500).json({

            success: false,
            message: "Wishlist failed"

        });

    }

});


// GET USER WISHLIST
app.get("/api/wishlist/:userId", async (req, res) => {

    try {

        const wishlist =
            await Wishlist.find({
                userId: String(req.params.userId)
            }).sort({
                createdAt: -1
            });

        res.json(wishlist);

    } catch (error) {

        console.error("Get Wishlist Error:", error);

        res.status(500).json({

            success: false,
            message: "Failed to load wishlist"

        });

    }

});


// REMOVE FROM WISHLIST
app.delete(
    "/api/wishlist/:userId/:productId",
    async (req, res) => {

        try {

            await Wishlist.findOneAndDelete({

                userId: String(req.params.userId),

                productId:
                    String(req.params.productId)

            });

            res.json({

                success: true,
                message: "Removed from Wishlist"

            });

        } catch (error) {

            console.error("Remove Wishlist Error:", error);

            res.status(500).json({

                success: false,
                message: "Remove failed"

            });

        }

    }
);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});