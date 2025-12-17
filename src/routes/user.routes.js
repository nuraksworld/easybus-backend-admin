import express from "express";
import { sendOtp, verifyOtp, completeProfile } from "../controllers/user.controller.js";

const router = express.Router();

// Send OTP to phone
router.post("/send-otp", sendOtp);

// Verify OTP
router.post("/verify-otp", verifyOtp);

// Save name for new user
router.post("/complete-profile", completeProfile);

export default router;
