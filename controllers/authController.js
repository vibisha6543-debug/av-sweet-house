const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ success: false, message: "Email already registered" });

    const user = new User({
      firstName, lastName,
      email: email.trim().toLowerCase(),
      phone,
      password: await bcrypt.hash(password, 10),
    });
    await user.save();
    res.json({ success: true, message: "User Registered Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Enter email and password" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: "Invalid email or password" });

    res.json({
      success: true,
      message: "Login Successful",
      user: {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};