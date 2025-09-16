// src/routes/bookings.routes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js'; // make sure this path & named export match your file
import {
  holdSeats,
  confirmPayment,
  cancelBooking,
  getBooking,
  listBookings,
} from '../controllers/bookings.controller.js';

const router = Router();

/**
 * Validate :id params (numeric only). If your booking_id is a string/UUID,
 * remove this block or change the regex accordingly.
 */
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }
  next();
});

/** -------------------- PUBLIC -------------------- */
/** Reserve seats temporarily (no auth) */
router.post('/hold', holdSeats);

/** -------------------- ADMIN (protected) -------------------- */
/** Confirm payment -> marks booking CONFIRMED and seats CONFIRMED */
router.post('/:id/pay', auth(), confirmPayment);

/** Cancel a booking manually -> releases seats */
router.post('/:id/cancel', auth(), cancelBooking);

/** Get one booking with its seats */
router.get('/:id', auth(), getBooking);

/** List bookings (supports ?status=&date=&trip_id= filters) */
router.get('/', auth(), listBookings);

export default router;
