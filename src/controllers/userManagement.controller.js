// src/controllers/userManagement.controller.js
import { pool } from "../db.js";

/**
 * ✅ Get all users
 * Supports optional filters: ?search= or ?phone=
 */
export async function listUsers(req, res) {
  try {
    const { search, phone } = req.query;
    const params = [];
    let where = "1=1";

    if (search) {
      where += " AND (name LIKE ? OR phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (phone) {
      where += " AND phone = ?";
      params.push(phone);
    }

    const [rows] = await pool.query(
      `SELECT user_id, name, phone, created_at
         FROM users
        WHERE ${where}
        ORDER BY created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
}

/**
 * ✅ Get single user by ID
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const [[user]] = await pool.query(
      `SELECT user_id, name, phone, created_at FROM users WHERE user_id = ?`,
      [id]
    );

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
}

/**
 * ✅ Create a new user manually (admin use)
 */
export async function createUser(req, res) {
  try {
    const { name, phone } = req.body;
    if (!name || !phone)
      return res.status(400).json({ error: "Name and phone required" });

    const [exists] = await pool.query(`SELECT user_id FROM users WHERE phone = ?`, [phone]);
    if (exists.length)
      return res.status(409).json({ error: "User with this phone already exists" });

    const [result] = await pool.query(
      `INSERT INTO users (name, phone) VALUES (?, ?)`,
      [name, phone]
    );

    res.status(201).json({ user_id: result.insertId, name, phone });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
}

/**
 * ✅ Update user details
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    if (!name && !phone)
      return res.status(400).json({ error: "Nothing to update" });

    const [existing] = await pool.query(
      `SELECT user_id FROM users WHERE user_id = ?`,
      [id]
    );
    if (!existing.length)
      return res.status(404).json({ error: "User not found" });

    await pool.query(
      `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE user_id = ?`,
      [name, phone, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
}

/**
 * ✅ Delete user
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM users WHERE user_id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
}
