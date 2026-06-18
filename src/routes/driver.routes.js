// src/routes/driver.routes.js
import { Router } from "express";
import {
  sendDriverOtp,
  verifyDriverOtp,
  driverTrips,
  updateSeatArrival,
} from "../controllers/driver.controller.js";

const router = Router();

// Auth
router.post("/auth/send-otp", sendDriverOtp);
router.post("/auth/verify-otp", verifyDriverOtp);

// Trips for driver mobile app
router.get("/trips", driverTrips);

router.post("/seat-arrival", updateSeatArrival);

export default router;
