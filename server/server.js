const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");



const app = express();

// ============================
// OTP Storage
// ============================

let otpStore = {};

const productsFile = path.join(__dirname, "data", "products.json");

function getProducts() {

    if (!fs.existsSync(productsFile)) {
        fs.writeFileSync(productsFile, "[]");
    }

    return JSON.parse(
        fs.readFileSync(productsFile, "utf8")
    );

}

function saveProducts(products) {

    fs.writeFileSync(
        productsFile,
        JSON.stringify(products, null, 2)
    );

}

app.use(cors());
app.use(express.json());

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

app.get("/api/products", (req, res) => {

    const productsPath = path.join(__dirname, "data", "products.json");

    const products = JSON.parse(
        fs.readFileSync(productsPath, "utf8")
    );

    res.json(products);

});


app.post("/api/products", (req, res) => {

    try {

        const products = getProducts();

        const newProduct = {
            id: Date.now(),
            name: req.body.name,
            price: req.body.price,
            image: req.body.image,
            category: req.body.category
        };

        products.push(newProduct);

        saveProducts(products);

        res.json({
            success: true,
            message: "🎉 Product Added Successfully!"
        });

    } catch (err) {

        console.error(err);

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

app.delete("/api/products/:id", (req, res) => {

    try {

        let products = getProducts();

        // ✅ FIX: keep as string (no Number conversion)
        const productId = req.params.id;

        products = products.filter(product => 
            String(product.id) !== String(productId)
        );

        saveProducts(products);

        res.json({
            success: true,
            message: "🗑 Product Deleted Successfully!"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


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

    console.log("REGISTER API CALLED");
    console.log(req.body);

    try {

        let users = [];

        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            password
        } = req.body;

        // Check if user already exists
        const existingUser = users.find(
            user => user.email === email
        );

        if (existingUser) {

            return res.json({
                success: false,
                message: "Email already registered"
            });

        }

        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);

        users.push({

            id: Date.now(),

            firstName,

            lastName,

            email,

            phone,

            password: hashedPassword

        });

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        res.json({

            success: true,
            message: "Registration Successful"

        });

    } catch (err) {

        console.log(err);

        res.json({

            success: false,
            message: err.message

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

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});