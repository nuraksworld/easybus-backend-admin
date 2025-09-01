import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';

export async function registerAdmin(req, res) {
  const { full_name, username, password, role='STAFF' } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO admins(full_name, username, password_hash, role) VALUES (?,?,?,?)',
    [full_name, username, hash, role]
  );
  res.json({ admin_id: r.insertId, username });
}

export async function loginAdmin(req, res) {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM admins WHERE username=? AND active=1', [username]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid' });
  const a = rows[0];
  const ok = await bcrypt.compare(password, a.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid' });
  const token = jwt.sign({ admin_id: a.admin_id, role: a.role }, config.jwtSecret, { expiresIn: '8h' });
  res.json({ token, full_name: a.full_name, role: a.role });
}
