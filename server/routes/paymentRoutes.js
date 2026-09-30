const express = require("express");
const router = express.Router();
const { createOrder, verifySignature } = require("../controllers/paymentController");

router.post("/create-order", createOrder);
router.post("/verify-signature", verifySignature);

module.exports = router;