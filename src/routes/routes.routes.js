import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { listRoutes, createRoute, updateRoute, deleteRoute } from '../controllers/routes.controller.js';
const r = Router();
r.get('/', listRoutes);           // public for search dropdowns
r.post('/', auth(), createRoute);
r.put('/:id', auth(), updateRoute);
r.delete('/:id', auth('SUPER'), deleteRoute);
export default r;
