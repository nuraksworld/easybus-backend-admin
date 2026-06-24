import { pool } from "../db.js";

<<<<<<< Updated upstream
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
=======
const DEFAULT_AC_TYPE = "NON_AC";
const VALID_AC_TYPES = ["AC", "NON_AC", "LUXURY"];

function clean(value, fallback = "") {
  const v = String(value ?? "").trim();
  return v || fallback;
}

function nullable(value) {
  const v = String(value ?? "").trim();
  return v || null;
}

function acType(value) {
  const v = clean(value, DEFAULT_AC_TYPE);
  return VALID_AC_TYPES.includes(v) ? v : DEFAULT_AC_TYPE;
}

export async function listBuses(_, res) {
  try {
    const [r] = await pool.query(`
      SELECT b.*, o.company_name
      FROM buses b
      LEFT JOIN operators o ON o.operator_id = b.operator_id
      WHERE b.active = 1
      ORDER BY b.bus_id DESC
    `);

    res.json(r);
  } catch (err) {
    console.error("listBuses error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function createBus(req, res) {
  try {
    const {
      operator_id,
      bus_number,
      bus_name = null,
      ac_type = DEFAULT_AC_TYPE,
      total_seats = 45,
      driver_name = null,
      driver_phone = null,
      active = 1,
    } = req.body;

    const cleanOperatorId = Number(operator_id);
    const cleanBusNumber = clean(bus_number);
    const cleanBusName = nullable(bus_name);
    const cleanAcType = acType(ac_type);
    const cleanTotalSeats = Number(total_seats || 45);
    const cleanDriverName = nullable(driver_name);
    const cleanDriverPhone = nullable(driver_phone);
    const cleanActive = Number(active ?? 1);

    if (!cleanOperatorId || !cleanBusNumber) {
      return res.status(400).json({
        error: "operator_id and bus_number are required",
      });
    }

    const [existing] = await pool.query(
      `SELECT bus_id FROM buses WHERE operator_id=? AND bus_number=? LIMIT 1`,
      [cleanOperatorId, cleanBusNumber]
    );

    if (existing.length) {
      const bus_id = existing[0].bus_id;

      await pool.query(
        `UPDATE buses
         SET bus_name=?, ac_type=?, total_seats=?, driver_name=?, driver_phone=?, active=?
         WHERE bus_id=?`,
        [
          cleanBusName,
          cleanAcType,
          cleanTotalSeats,
          cleanDriverName,
          cleanDriverPhone,
          cleanActive,
          bus_id,
        ]
      );

      return res.json({ bus_id, updated: true });
    }

    const [r] = await pool.query(
      `INSERT INTO buses
       (operator_id, bus_number, bus_name, ac_type, total_seats, driver_name, driver_phone, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanOperatorId,
        cleanBusNumber,
        cleanBusName,
        cleanAcType,
        cleanTotalSeats,
        cleanDriverName,
        cleanDriverPhone,
        cleanActive,
      ]
    );

    res.json({ bus_id: r.insertId, created: true });
  } catch (err) {
    console.error("createBus error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateBus(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`SELECT * FROM buses WHERE bus_id=?`, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const cur = rows[0];

    const operator_id =
      req.body.operator_id !== undefined
        ? Number(req.body.operator_id)
        : cur.operator_id;

    const bus_number =
      req.body.bus_number !== undefined
        ? clean(req.body.bus_number)
        : cur.bus_number;

    const bus_name =
      req.body.bus_name !== undefined ? nullable(req.body.bus_name) : cur.bus_name;

    const ac_type =
      req.body.ac_type !== undefined ? acType(req.body.ac_type) : acType(cur.ac_type);

    const total_seats =
      req.body.total_seats !== undefined
        ? Number(req.body.total_seats || 45)
        : cur.total_seats;

    const driver_name =
      req.body.driver_name !== undefined
        ? nullable(req.body.driver_name)
        : cur.driver_name;

    const driver_phone =
      req.body.driver_phone !== undefined
        ? nullable(req.body.driver_phone)
        : cur.driver_phone;

    const active =
      req.body.active !== undefined ? Number(req.body.active) : cur.active;

    if (!operator_id || !bus_number) {
      return res.status(400).json({
        error: "operator_id and bus_number are required",
      });
    }

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

    res.json({ ok: true, updated: true });
  } catch (err) {
    console.error("updateBus error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteBus(req, res) {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM buses WHERE bus_id=?", [id]);
    res.json({ ok: true, deleted: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      await pool.query("UPDATE buses SET active=0 WHERE bus_id=?", [id]);

      return res.json({
        ok: true,
        deleted: false,
        softDeleted: true,
        message: "Bus is linked to trips. Deactivated instead of deleting.",
      });
    }

    console.error("deleteBus error:", err);
    res.status(500).json({ error: err.message });
  }
}
>>>>>>> Stashed changes
