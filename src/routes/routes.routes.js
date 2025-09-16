import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

// List routes (Mannar->Colombo, Colombo->Mannar)
router.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT route_id, origin, destination, active FROM routes WHERE active=1');
  res.json(rows);
});

// Ordered stops for a route
router.get('/:id/stops', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT rs.route_stop_id, rs.seq_no, s.stop_id, s.name
       FROM route_stops rs
       JOIN stops s ON s.stop_id=rs.stop_id
      WHERE rs.route_id=?
      ORDER BY rs.seq_no ASC`,
    [id]
  );
  res.json(rows);
});

export default router;
