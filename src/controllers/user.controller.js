import { db } from "../db.js";
import jwt from "jsonwebtoken";
import { sendBookingSms } from "../services/sms.js"; // ✅ use your working SMS service

// In-memory OTP store
const OTP_STORE = new Map();

// -------------------- SEND OTP --------------------
export async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    // Generate and store OTP (expires in 2 minutes)
    const otp = Math.floor(1000 + Math.random() * 9000);
    OTP_STORE.set(phone, { otp, createdAt: Date.now() });
    console.log(`✅ OTP generated for ${phone}: ${otp}`);

    // Send SMS using working SMS service
<<<<<<< Updated upstream
    const message = `Your EasyBus verification code is ${otp}. Valid for 2 minutes.`;
=======
    const message = `Your BookMySeat verification code is ${otp}. Valid for 2 minutes.`;
>>>>>>> Stashed changes

    const smsResult = await sendBookingSms({ to: phone, message });

    if (smsResult.ok) {
      console.log(`📱 OTP SMS sent successfully to ${phone}`);
    } else {
      console.warn(`⚠️ OTP SMS failed: ${smsResult.error}`);
    }

    // Check if user already exists
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [phone]);
    const exists = rows.length > 0;

    res.json({ success: true, exists });
  } catch (err) {
    console.error("❌ sendOtp error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// -------------------- VERIFY OTP --------------------
export async function verifyOtp(req, res) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

    const stored = OTP_STORE.get(phone);
    if (!stored) return res.status(401).json({ error: "OTP expired or not found" });

    // Expire OTP after 2 minutes
    if (Date.now() - stored.createdAt > 2 * 60 * 1000) {
      OTP_STORE.delete(phone);
      return res.status(401).json({ error: "OTP expired" });
    }

    if (String(stored.otp) !== String(otp))
      return res.status(401).json({ error: "Invalid OTP" });

    OTP_STORE.delete(phone);

    // Check if user exists
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [phone]);
    if (rows.length === 0) {
      // New user → ask for name
      return res.json({ needName: true });
    }

    const user = rows[0];
    const token = jwt.sign(
      { user_id: user.user_id, phone },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "30d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("❌ verifyOtp error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// -------------------- COMPLETE PROFILE --------------------
export async function completeProfile(req, res) {
  try {
    const { phone, name } = req.body;
    if (!phone || !name)
      return res.status(400).json({ error: "Phone and name required" });

    // Insert new user
    const [result] = await db.query("INSERT INTO users (phone, name) VALUES (?, ?)", [
      phone,
      name,
    ]);

    const user = { user_id: result.insertId, phone, name };
    const token = jwt.sign(
      { user_id: user.user_id, phone },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "30d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("❌ completeProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
