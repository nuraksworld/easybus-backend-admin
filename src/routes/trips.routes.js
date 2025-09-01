import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { createTrip, searchTrips, getTrip } from '../controllers/trips.controller.js';
const r = Router();
r.get('/search', searchTrips);
r.get('/:id', getTrip);
r.post('/', auth(), createTrip);
export default r;
