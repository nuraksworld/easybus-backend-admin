import { pool } from '../db.js';

export async function listOperators(_, res){ const [r]=await pool.query('SELECT * FROM operators ORDER BY operator_id DESC'); res.json(r); }
export async function createOperator(req,res){ const {company_name,owner_name,phone}=req.body; const [r]=await pool.query('INSERT INTO operators(company_name,owner_name,phone) VALUES (?,?,?)',[company_name,owner_name,phone]); res.json({operator_id:r.insertId}); }
export async function updateOperator(req,res){ const {id}=req.params; const {company_name,owner_name,phone}=req.body; await pool.query('UPDATE operators SET company_name=?, owner_name=?, phone=? WHERE operator_id=?',[company_name,owner_name,phone,id]); res.json({ok:true}); }
export async function deleteOperator(req,res){ const {id}=req.params; await pool.query('DELETE FROM operators WHERE operator_id=?',[id]); res.json({ok:true}); }
