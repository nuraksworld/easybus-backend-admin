import { Router } from 'express';
import { registerAdmin, loginAdmin } from '../controllers/admin.controller.js';
import { auth } from '../middlewares/auth.js';
const r = Router();
r.post('/register', auth('SUPER'), registerAdmin);
r.post('/login', loginAdmin);
export default r;
