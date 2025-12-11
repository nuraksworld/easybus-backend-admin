// src/controllers/driver.controller.js
import { pool } from "../db.js";
import { sendBookingSms } from "../services/sms.js";

// In-memory OTP storage: phone -> { code, expiresAt }
const otpStore = new Map();

function normalizePhone(p) {
  return String(p || "").trim();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// POST /api/driver/auth/send-otp  { phone }
export async function sendDriverOtp(req, res) {
  try {
    const phoneRaw = req.body.phone;
    const phone = normalizePhone(phoneRaw);

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "phone is required" });
    }

    // ensure this phone belongs to a driver
    const [rows] = await pool.query(
      `SELECT bus_id, bus_number, bus_name, driver_name
         FROM buses
        WHERE driver_phone = ? AND active = 1`,
      [phone]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No active bus found for this driver phone",
      });
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpStore.set(phone, { code, expiresAt });

    const message = `EasyBus driver login OTP: ${code}. Valid for 5 minutes.`;

    try {
      await sendBookingSms({ to: phone, message });
    } catch (e) {
      console.error("sendDriverOtp SMS error:", e.message || e);
      // ok to continue in dev
    }

    console.log("[DRIVER OTP]", phone, code);
    return res.json({ success: true });
  } catch (e) {
    console.error("sendDriverOtp error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Server error sending OTP" });
  }
}

// POST /api/driver/auth/verify-otp  { phone, otp }  or { phone, code }
export async function verifyDriverOtp(req, res) {
  try {
    const phoneRaw = req.body.phone;
    const phone = normalizePhone(phoneRaw);
    const otpFromBody = req.body.otp ?? req.body.code;
    const otp = String(otpFromBody || "").trim();

    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "phone and otp are required" });
    }

    const entry = otpStore.get(phone);
    console.log("[VERIFY OTP]", { phone, otp, entry });

    if (
      !entry ||
      entry.expiresAt < Date.now() ||
      String(entry.code) !== otp
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // use once
    otpStore.delete(phone);

    const [buses] = await pool.query(
      `SELECT bus_id, bus_number, bus_name, total_seats
         FROM buses
        WHERE driver_phone = ? AND active = 1`,
      [phone]
    );

    return res.json({
      success: true,
      driver: { phone, buses },
    });
  } catch (e) {
    console.error("verifyDriverOtp error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Server error verifying OTP" });
  }
}

// GET /api/driver/trips?phone=0775296695&date=2025-12-10
export async function driverTrips(req, res) {
  try {
    const phone = normalizePhone(req.query.phone);
    let date = String(req.query.date || "").trim();

    if (!phone || !date) {
      return res
        .status(400)
        .json({ success: false, message: "phone and date are required" });
    }

    // handle ISO string (2025-12-10T00:00:00.000Z) from picker
    if (date.includes("T")) {
      date = date.split("T")[0];
    }

    const [rows] = await pool.query(
      `
      SELECT
        t.trip_id,
        t.trip_date,
        t.departure_time,
        r.origin,
        r.destination,
        b.bus_id,
        b.bus_number,
        b.bus_name,
        COALESCE(t.seats_override, b.total_seats) AS total_seats
      FROM trips t
      JOIN buses  b ON b.bus_id  = t.bus_id
      JOIN routes r ON r.route_id = t.route_id
      WHERE t.trip_date = ?
        AND b.driver_phone = ?
      ORDER BY
        t.departure_time IS NULL,
        t.departure_time ASC
      `,
      [date, phone]
    );

    return res.json({ success: true, trips: rows });
  } catch (e) {
    console.error("driverTrips error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Server error loading trips" });
  }
}

export async function updateSeatArrival(req, res) {
  try {
    const { tripId, seatNumber, arrived } = req.body;

    if (!tripId || !seatNumber || typeof arrived === "undefined") {
      return res.status(400).json({ success: false, message: "tripId, seatNumber and arrived are required" });
    }

    const newVal = arrived ? 1 : 0;

    const [result] = await pool.query(
      `UPDATE booking_seats
          SET is_arrived = ?
        WHERE trip_id = ?
          AND seat_number = ?
          AND is_active = 1
          AND status IN ('RESERVED','CONFIRMED')`,
      [newVal, tripId, seatNumber]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Seat not found or not active/confirmed" });
    }

    return res.json({ success: true, is_arrived: newVal });
  } catch (err) {
    console.error("updateSeatArrival error:", err);
    return res.status(500).json({ success: false, message: "Server error updating arrival status" });
  }
}