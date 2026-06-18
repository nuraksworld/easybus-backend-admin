import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';

export async function registerAdmin(req, res) {
  try {
    const { full_name, username, password, role = 'STAFF' } = req.body;
    if (!full_name || !username || !password) {
      return res.status(400).json({ error: 'full_name, username and password are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO admins(full_name, username, password_hash, role) VALUES (?,?,?,?)',
      [full_name, username, hash, role]
    );
    res.json({ admin_id: r.insertId, username });
  } catch (err) {
    console.error('registerAdmin error:', err);
    // duplicate username
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

export async function loginAdmin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    // If you *just* added the 'active' column, this query now works.
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE username=? AND active=1',
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid username' });
    }

    const a = rows[0];
    const ok = await bcrypt.compare(password, a.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { admin_id: a.admin_id, role: a.role },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({ token, full_name: a.full_name, role: a.role });
  } catch (err) {
    console.error('loginAdmin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
