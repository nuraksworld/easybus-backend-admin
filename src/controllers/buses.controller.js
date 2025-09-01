import { pool } from '../db.js';

export async function listBuses(_,res){
  const [r]=await pool.query(`SELECT b.*, o.company_name FROM buses b JOIN operators o USING(operator_id) ORDER BY b.bus_id DESC`);
  res.json(r);
}
export async function createBus(req,res){
  const {operator_id,bus_number,bus_name,ac_type,total_seats,driver_name,driver_phone}=req.body;
  const [r]=await pool.query(`INSERT INTO buses(operator_id,bus_number,bus_name,ac_type,total_seats,driver_name,driver_phone) VALUES (?,?,?,?,?,?,?)`,
  [operator_id,bus_number,bus_name,ac_type,total_seats,driver_name,driver_phone]);
  res.json({bus_id:r.insertId});
}
export async function updateBus(req,res){
  const {id}=req.params; const {operator_id,bus_number,bus_name,ac_type,total_seats,driver_name,driver_phone}=req.body;
  await pool.query(`UPDATE buses SET operator_id=?, bus_number=?, bus_name=?, ac_type=?, total_seats=?, driver_name=?, driver_phone=? WHERE bus_id=?`,
  [operator_id,bus_number,bus_name,ac_type,total_seats,driver_name,driver_phone,id]);
  res.json({ok:true});
}
export async function deleteBus(req,res){ const {id}=req.params; await pool.query('DELETE FROM buses WHERE bus_id=?',[id]); res.json({ok:true}); }
