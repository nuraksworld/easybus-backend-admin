import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import {
  holdSeats,
  confirmPayment,
  cancelBooking,
  getBooking,
  listBookings,
  exportBookingsExcel, // NEW
} from '../controllers/bookings.controller.js';

const router = Router();

/** Validate :id params (numeric only). */
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }
  next();
});

/** -------------------- PUBLIC -------------------- */
router.post('/hold', holdSeats);

/** -------------------- ADMIN (protected) -------------------- */
// Place export before '/:id' to avoid route shadowing
router.get('/export/excel', auth(), exportBookingsExcel); // NEW
router.get('/', auth(), listBookings);                    // ?date=&bus_number=&status=
router.post('/:id/pay', auth(), confirmPayment);
router.post('/:id/cancel', auth(), cancelBooking);
router.get('/:id', auth(), getBooking);

export default router;
