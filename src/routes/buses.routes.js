import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { listBuses, createBus, updateBus, deleteBus } from '../controllers/buses.controller.js';
const r = Router();
r.get('/', auth(), listBuses);
r.post('/', auth(), createBus);
r.put('/:id', auth(), updateBus);
r.delete('/:id', auth('SUPER'), deleteBus);
export default r;
