import { pool } from "../db.js";

export async function listBuses(_, res) {
  // Only show active buses by default (recommended)
  // If you want ALL buses including inactive, remove WHERE b.active=1
  const [r] = await pool.query(`
    SELECT b.*, o.company_name
    FROM buses b
    JOIN operators o USING(operator_id)
    WHERE b.active = 1
    ORDER BY b.bus_id DESC
  `);
  res.json(r);
}

export async function createBus(req, res) {
  try {
    const {
      operator_id,
      bus_number,
      bus_name = null,
      ac_type = "NON_AC",
      total_seats = 45,
      driver_name = null,
      driver_phone = null,
      active = 1,
    } = req.body;

    if (!operator_id || !bus_number) {
      return res
        .status(400)
        .json({ error: "operator_id and bus_number are required" });
    }

    // Prevent duplicates: if same operator already has same bus_number, update it instead of creating another row
    const [existing] = await pool.query(
      `SELECT bus_id FROM buses WHERE operator_id=? AND bus_number=? LIMIT 1`,
      [operator_id, bus_number]
    );

    if (existing.length) {
      const bus_id = existing[0].bus_id;
      await pool.query(
        `UPDATE buses
         SET bus_name=?, ac_type=?, total_seats=?, driver_name=?, driver_phone=?, active=?
         WHERE bus_id=?`,
        [bus_name, ac_type, total_seats, driver_name, driver_phone, active, bus_id]
      );
      return res.json({ bus_id, updated: true });
    }

    const [r] = await pool.query(
      `INSERT INTO buses
       (operator_id, bus_number, bus_name, ac_type, total_seats, driver_name, driver_phone, active)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        operator_id,
        bus_number,
        bus_name,
        ac_type,
        total_seats,
        driver_name,
        driver_phone,
        active,
      ]
    );

    res.json({ bus_id: r.insertId, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH-like PUT:
 * - frontend can send only driver_name/driver_phone/active
 * - we keep other fields from current row
 */
export async function updateBus(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`SELECT * FROM buses WHERE bus_id=?`, [id]);
    if (!rows.length) return res.status(404).json({ error: "Bus not found" });

    const cur = rows[0];

    const operator_id = req.body.operator_id ?? cur.operator_id;
    const bus_number = req.body.bus_number ?? cur.bus_number;
    const bus_name = req.body.bus_name ?? cur.bus_name;
    const ac_type = req.body.ac_type ?? cur.ac_type;
    const total_seats = req.body.total_seats ?? cur.total_seats;
    const driver_name = req.body.driver_name ?? cur.driver_name;
    const driver_phone = req.body.driver_phone ?? cur.driver_phone;
    const active = req.body.active ?? cur.active;

    await pool.query(
      `UPDATE buses
       SET operator_id=?, bus_number=?, bus_name=?, ac_type=?, total_seats=?, driver_name=?, driver_phone=?, active=?
       WHERE bus_id=?`,
      [
        operator_id,
        bus_number,
        bus_name,
        ac_type,
        total_seats,
        driver_name,
        driver_phone,
        active,
        id,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Safe delete:
 * - If FK (trips) blocks delete, we soft delete: active=0
 * - Returns {softDeleted:true} when deactivated
 */
export async function deleteBus(req, res) {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM buses WHERE bus_id=?", [id]);
    res.json({ ok: true, deleted: true });
  } catch (err) {
    // FK constraint block => soft delete
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      await pool.query("UPDATE buses SET active=0 WHERE bus_id=?", [id]);
      return res.json({
        ok: true,
        deleted: false,
        softDeleted: true,
        message: "Bus is linked to trips. Deactivated instead of deleting.",
      });
    }
    res.status(500).json({ error: err.message });
  }
}
