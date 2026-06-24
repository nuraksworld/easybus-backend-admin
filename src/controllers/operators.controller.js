import { pool } from "../db.js";

const DEFAULT_AC_TYPE = "NON_AC";

function clean(v, fallback = "") {
  const x = String(v ?? "").trim();
  return x || fallback;
}

function nullable(v) {
  const x = String(v ?? "").trim();
  return x || null;
}

function normalizeBus(b = {}) {
  return {
    bus_id: b.bus_id ? Number(b.bus_id) : null,
    bus_number: clean(b.bus_number),
    bus_name: nullable(b.bus_name),
    ac_type: clean(b.ac_type, DEFAULT_AC_TYPE),
    total_seats: Number(b.total_seats || 45),
    driver_name: nullable(b.driver_name),
    driver_phone: nullable(b.driver_phone),
  };
}

export async function listOperators(_, res) {
  try {
    const [operators] = await pool.query(`
      SELECT *
      FROM operators
      ORDER BY operator_id DESC
    `);

    const [buses] = await pool.query(`
      SELECT *
      FROM buses
      WHERE active = 1
      ORDER BY bus_id ASC
    `);

    const data = operators.map((op) => ({
      ...op,
      buses: buses.filter((b) => b.operator_id === op.operator_id),
    }));

    res.json(data);
  } catch (err) {
    console.error("listOperators error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function createOperator(req, res) {
  const conn = await pool.getConnection();

  try {
    const { company_name, owner_name, phone, buses = [] } = req.body;

    await conn.beginTransaction();

    const [r] = await conn.query(
      `INSERT INTO operators(company_name, owner_name, phone)
       VALUES (?, ?, ?)`,
      [clean(company_name), clean(owner_name), clean(phone)]
    );

    const operator_id = r.insertId;

    const cleanBuses = Array.isArray(buses)
      ? buses.map(normalizeBus).filter((b) => b.bus_number)
      : [];

    for (const bus of cleanBuses) {
      await conn.query(
        `INSERT INTO buses
         (operator_id, bus_number, bus_name, ac_type, total_seats, driver_name, driver_phone, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          operator_id,
          bus.bus_number,
          bus.bus_name,
          bus.ac_type,
          bus.total_seats,
          bus.driver_name,
          bus.driver_phone,
        ]
      );
    }

    await conn.commit();
    res.json({ operator_id, created: true });
  } catch (err) {
    await conn.rollback();
    console.error("createOperator error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

export async function updateOperator(req, res) {
  const conn = await pool.getConnection();

  try {
    const { id } = req.params;
    const { company_name, owner_name, phone, buses } = req.body;

    await conn.beginTransaction();

    await conn.query(
      `UPDATE operators
       SET company_name=?, owner_name=?, phone=?
       WHERE operator_id=?`,
      [clean(company_name), clean(owner_name), clean(phone), id]
    );

    if (Array.isArray(buses)) {
      const cleanBuses = buses.map(normalizeBus).filter((b) => b.bus_number);

      for (const bus of cleanBuses) {
        if (bus.bus_id) {
          await conn.query(
            `UPDATE buses
             SET bus_number=?,
                 bus_name=?,
                 ac_type=?,
                 total_seats=?,
                 driver_name=?,
                 driver_phone=?,
                 active=1
             WHERE bus_id=? AND operator_id=?`,
            [
              bus.bus_number,
              bus.bus_name,
              bus.ac_type,
              bus.total_seats,
              bus.driver_name,
              bus.driver_phone,
              bus.bus_id,
              id,
            ]
          );
        } else {
          await conn.query(
            `INSERT INTO buses
             (operator_id, bus_number, bus_name, ac_type, total_seats, driver_name, driver_phone, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              id,
              bus.bus_number,
              bus.bus_name,
              bus.ac_type,
              bus.total_seats,
              bus.driver_name,
              bus.driver_phone,
            ]
          );
        }
      }
    }

    await conn.commit();
    res.json({ ok: true, updated: true });
  } catch (err) {
    await conn.rollback();
    console.error("updateOperator error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

export async function deleteOperator(req, res) {
  try {
    const { id } = req.params;

    await pool.query(`UPDATE buses SET active=0 WHERE operator_id=?`, [id]);

    await pool.query(`DELETE FROM operators WHERE operator_id=?`, [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error("deleteOperator error:", err);
    res.status(500).json({ error: err.message });
  }
}