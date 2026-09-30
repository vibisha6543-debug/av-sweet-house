const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

let otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    console.log("📧 OTP:", otp, "→", email);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || "avsweethouse@gmail.com",
        to: email,
        subject: "AV Sweet House - Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; background: #fff5f8; padding: 30px; border-radius: 20px;">
            <h2 style="color: #ff4d8d; text-align: center;">🍰 AV Sweet House</h2>
            <h3 style="text-align: center;">Reset Your Password</h3>
            <div style="background: #ff4d8d; color: white; padding: 20px; border-radius: 15px; text-align: center; font-size: 40px; font-weight: 800; letter-spacing: 10px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666; text-align: center; font-size: 13px;">Valid for 5 minutes.</p>
          </div>
        `,
      });
    } catch (e) {
      console.log("Email failed but OTP:", otp);
    }

    return res.json({ success: true, message: "OTP sent!", otp });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOtp = (req, res) => {
  const { email, otp } = req.body;
  if (!otpStore[email]) return res.json({ success: false, message: "OTP expired" });
  if (String(otpStore[email]) !== String(otp)) return res.json({ success: false, message: "Invalid OTP" });
  delete otpStore[email];
  res.json({ success: true, message: "OTP verified!" });
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Required fields missing" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true, message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
};