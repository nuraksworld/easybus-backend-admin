// src/routes/trips.routes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import {
  createTrip,
  searchTrips,
  getTrip,
  listTrips,
  updateTrip,
  deleteTrip,
} from '../controllers/trips.controller.js';

const router = Router();

/** -------------------- PUBLIC -------------------- */
// Search trips by date/from/to/seats
router.get('/search', searchTrips);

// Trip details + locked seats (for seat map)
router.get('/:id', getTrip);

/** -------------------- ADMIN -------------------- */
// List all trips (with optional filters: date, origin, destination)
router.get('/', auth(), listTrips);

// Create a new trip
router.post('/', auth(), createTrip);

// Update an existing trip
router.put('/:id', auth(), updateTrip);

// Delete a trip (SUPER role only)
router.delete('/:id', auth('SUPER'), deleteTrip);

export default router;
