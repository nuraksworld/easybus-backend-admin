import { pool } from '../db.js';

export async function listRoutes(_,res){ const [r]=await pool.query('SELECT * FROM routes WHERE active=1'); res.json(r); }
export async function createRoute(req,res){ const {origin,destination}=req.body; const [r]=await pool.query('INSERT INTO routes(origin,destination) VALUES(?,?)',[origin,destination]); res.json({route_id:r.insertId}); }
export async function updateRoute(req,res){ const {id}=req.params; const {origin,destination,active=1}=req.body; await pool.query('UPDATE routes SET origin=?, destination=?, active=? WHERE route_id=?',[origin,destination,active,id]); res.json({ok:true}); }
export async function deleteRoute(req,res){ const {id}=req.params; await pool.query('DELETE FROM routes WHERE route_id=?',[id]); res.json({ok:true}); }
