import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { listOperators, createOperator, updateOperator, deleteOperator } from '../controllers/operators.controller.js';
const r = Router();
r.get('/', auth(), listOperators);
r.post('/', auth(), createOperator);
r.put('/:id', auth(), updateOperator);
r.delete('/:id', auth('SUPER'), deleteOperator);
export default r;
