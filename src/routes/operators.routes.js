// src/routes/operators.routes.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { listOperators, createOperator, updateOperator, deleteOperator } from '../controllers/operators.controller.js';

const r = Router();
r.get('/', listOperators);               // public
r.post('/', auth(), createOperator);     // needs token
r.put('/:id', auth(), updateOperator);   // needs token
r.delete('/:id', auth('SUPER'), deleteOperator); // SUPER only
export default r;
