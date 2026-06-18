import { pool } from "../db.js";

export async function getAdminUsers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT user_id, name, phone
      FROM users
      ORDER BY created_at DESC
    `);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("getAdminUsers error:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}
