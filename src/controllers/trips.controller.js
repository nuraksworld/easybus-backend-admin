// src/controllers/trips.controller.js
<<<<<<< Updated upstream
import { pool } from '../db.js';
=======
import { pool } from "../db.js";
>>>>>>> Stashed changes

/** CREATE (admin) — supports per-trip seats_override */
export async function createTrip(req, res) {
  try {
    const {
      route_id,
      bus_id,
<<<<<<< Updated upstream
      trip_date,                 // DATE 'YYYY-MM-DD'
      departure_time = null,     // 'HH:mm:ss' or null
      price_per_seat,
      seats_override = null,     // NEW (optional)
    } = req.body;

    if (!route_id || !bus_id || !trip_date || price_per_seat == null) {
      return res.status(400).json({ error: 'route_id, bus_id, trip_date, price_per_seat are required' });
    }

    // Validate seats_override if provided: 1..bus.total_seats
    if (seats_override != null) {
      const [[bus]] = await pool.query('SELECT total_seats FROM buses WHERE bus_id=?', [bus_id]);
      if (!bus) return res.status(409).json({ error: 'Invalid bus_id' });
      const n = Number(seats_override);
      if (!Number.isInteger(n) || n < 1 || n > Number(bus.total_seats)) {
        return res.status(400).json({ error: `seats_override must be between 1 and ${bus.total_seats}` });
=======
      trip_date,
      departure_time = null,
      price_per_seat,
      seats_override = null,
    } = req.body;

    if (!route_id || !bus_id || !trip_date || price_per_seat == null) {
      return res.status(400).json({
        error: "route_id, bus_id, trip_date, price_per_seat are required",
      });
    }

    if (seats_override != null) {
      const [[bus]] = await pool.query(
        "SELECT total_seats FROM buses WHERE bus_id=?",
        [bus_id],
      );

      if (!bus) {
        return res.status(409).json({ error: "Invalid bus_id" });
      }

      const n = Number(seats_override);

      if (!Number.isInteger(n) || n < 1 || n > Number(bus.total_seats)) {
        return res.status(400).json({
          error: `seats_override must be between 1 and ${bus.total_seats}`,
        });
>>>>>>> Stashed changes
      }
    }

    await pool.query(
<<<<<<< Updated upstream
      `INSERT INTO trips (route_id, bus_id, trip_date, departure_time, price_per_seat, seats_override)
       VALUES (?,?,?,?,?,?)`,
      [route_id, bus_id, trip_date, departure_time, price_per_seat, seats_override]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('createTrip error:', err.code, err.sqlMessage || err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Trip already exists for same route/bus/date/time' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(409).json({ error: 'Invalid route_id or bus_id (foreign key failed)' });
    }
    res.status(500).json({ error: 'Server error creating trip' });
  }
}

/** SEARCH (public) – STRICT direction (seq(from) < seq(to)) and date; seats respect seats_override */
export async function searchTrips(req, res) {
  try {
    const seats = Number(req.query.seats ?? 1);
    const date = req.query.date; // 'YYYY-MM-DD'
    const route_id     = req.query.route_id ? Number(req.query.route_id) : null;
    const from_stop_id = req.query.from_stop_id ? Number(req.query.from_stop_id) : null;
    const to_stop_id   = req.query.to_stop_id ? Number(req.query.to_stop_id) : null;

    if (!route_id || !date) {
      return res.status(400).json({ error: 'route_id and date are required' });
    }
    if (!from_stop_id || !to_stop_id) {
      return res.status(400).json({ error: 'from_stop_id and to_stop_id are required' });
=======
      `INSERT INTO trips 
        (route_id, bus_id, trip_date, departure_time, price_per_seat, seats_override)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        route_id,
        bus_id,
        trip_date,
        departure_time,
        price_per_seat,
        seats_override,
      ],
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("createTrip error:", err.code, err.sqlMessage || err.message);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Trip already exists for same route/bus/date/time",
      });
    }

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({
        error: "Invalid route_id or bus_id (foreign key failed)",
      });
    }

    return res.status(500).json({ error: "Server error creating trip" });
  }
}

/** SEARCH (public) – strict direction and date; seats respect seats_override */
export async function searchTrips(req, res) {
  try {
    const seats = Number(req.query.seats ?? 1);
    const date = req.query.date;
    const route_id = req.query.route_id ? Number(req.query.route_id) : null;
    const from_stop_id = req.query.from_stop_id
      ? Number(req.query.from_stop_id)
      : null;
    const to_stop_id = req.query.to_stop_id
      ? Number(req.query.to_stop_id)
      : null;

    if (!route_id || !date) {
      return res.status(400).json({
        error: "route_id and date are required",
      });
    }

    if (!from_stop_id || !to_stop_id) {
      return res.status(400).json({
        error: "from_stop_id and to_stop_id are required",
      });
>>>>>>> Stashed changes
    }

    const sql = `
      SELECT
        t.trip_id,
<<<<<<< Updated upstream
        t.trip_date,
        t.departure_time,
        t.price_per_seat,
        r.route_id,
        r.origin,
        r.destination,
=======

        DATE_FORMAT(t.trip_date, '%Y-%m-%d') AS trip_date,
        TIME_FORMAT(t.departure_time, '%H:%i:%s') AS departure_time,

        t.price_per_seat,

        r.route_id,
        r.origin,
        r.destination,

>>>>>>> Stashed changes
        b.bus_id,
        b.bus_number,
        b.bus_name,
        b.ac_type,
        COALESCE(t.seats_override, b.total_seats) AS seats,
        b.driver_name,
        b.driver_phone,
<<<<<<< Updated upstream
=======

        o.company_name AS company_name,

>>>>>>> Stashed changes
        (
          COALESCE(t.seats_override, b.total_seats) - (
            SELECT COUNT(*)
              FROM booking_seats bs
             WHERE bs.trip_id = t.trip_id
               AND bs.is_active = 1
               AND bs.status IN ('RESERVED', 'CONFIRMED')
          )
        ) AS available
<<<<<<< Updated upstream
      FROM trips t
      JOIN routes r ON r.route_id = t.route_id
      JOIN buses  b ON b.bus_id  = t.bus_id
      -- Direction lock: ensure "from" comes before "to" along THIS route
      JOIN route_stops rs_from
        ON rs_from.route_id = t.route_id AND rs_from.stop_id = ?
      JOIN route_stops rs_to
        ON rs_to.route_id   = t.route_id AND rs_to.stop_id   = ?
      WHERE t.trip_date = ?
        AND t.route_id = ?
        AND rs_from.seq_no < rs_to.seq_no
      HAVING available >= ?
      ORDER BY t.trip_date ASC,
               t.departure_time IS NULL ASC,
               t.departure_time ASC
    `;
    const params = [from_stop_id, to_stop_id, date, route_id, seats];

    const [rows] = await pool.query(sql, params);
    return res.json(rows || []);
  } catch (e) {
    console.error('searchTrips error:', e);
    return res.status(500).json({ error: 'Failed to search trips' });
  }
}

/** DETAILS (public) – returns seat lock info for seat map; seats respect seats_override */
// src/controllers/trips.controller.js
export async function getTrip(req, res) {
  const { id } = req.params;

  // Main trip details
  const [[trip]] = await pool.query(
    `SELECT
        t.trip_id,
        t.trip_date,
        t.departure_time,
        t.price_per_seat,
        r.route_id,
        r.origin,
        r.destination,
        b.bus_id,
        b.bus_number,
        b.bus_name,
        b.ac_type,
        b.driver_name,
        b.driver_phone,
        COALESCE(t.seats_override, b.total_seats) AS seats
     FROM trips t
     JOIN routes r ON r.route_id = t.route_id
     JOIN buses  b ON b.bus_id  = t.bus_id
     WHERE t.trip_id = ?`,
    [id]
  );

  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  // Locked seats (RESERVED / CONFIRMED) with passenger info
  const [locked] = await pool.query(
    `SELECT
        bs.seat_number,
        bs.status,
        bs.gender,
        bs.is_arrived,
        bk.customer_name,
        bk.customer_phone
       FROM booking_seats bs
       JOIN bookings bk ON bk.booking_id = bs.booking_id
      WHERE bs.trip_id = ?
        AND bs.is_active = 1
        AND bs.status IN ('RESERVED','CONFIRMED')
      ORDER BY CAST(bs.seat_number AS UNSIGNED), bs.seat_number`,
    [id]
  );

  return res.json({
    ...trip,
    lockedSeats: locked, // array of seats with passenger details
  });
}


/** LIST (admin) — seats & availability respect seats_override */
export async function listTrips(req, res) {
  const { date, from: origin, to: destination } = req.query;
  const params = [];
  let where = '1=1';
  if (date)        { where += ' AND t.trip_date=?'; params.push(date); }
  if (origin)      { where += ' AND r.origin=?'; params.push(origin); }
  if (destination) { where += ' AND r.destination=?'; params.push(destination); }

  const [rows] = await pool.query(
  `SELECT
      t.trip_id,
      t.trip_date,
      t.departure_time,
      t.price_per_seat,
      t.seats_override,
      r.route_id, r.origin, r.destination,
      b.bus_id, b.bus_number, b.bus_name, b.ac_type,
      b.driver_name, b.driver_phone,
      COALESCE(t.seats_override, b.total_seats) AS seats,
      (
        COALESCE(t.seats_override, b.total_seats) -
        (
          SELECT COUNT(*)
            FROM booking_seats bs
           WHERE bs.trip_id = t.trip_id
             AND bs.is_active = 1
             AND bs.status IN ('RESERVED','CONFIRMED')
        )
      ) AS available
   FROM trips t
   JOIN routes r ON r.route_id = t.route_id
   JOIN buses  b ON b.bus_id  = t.bus_id
   WHERE ${where}
   ORDER BY t.trip_date, t.departure_time IS NULL, t.departure_time`,
   params
  );
  res.json(rows);
}

/** UPDATE (admin) — supports seats_override */
export async function updateTrip(req, res) {
  const { id } = req.params;
  const {
    route_id,
    bus_id,
    trip_date,
    departure_time = null,
    price_per_seat,
    seats_override = null, // NEW
  } = req.body;

  // Validate seats_override if provided
  if (seats_override != null) {
    const [[bus]] = await pool.query('SELECT total_seats FROM buses WHERE bus_id=?', [bus_id]);
    if (!bus) return res.status(409).json({ error: 'Invalid bus_id' });
    const n = Number(seats_override);
    if (!Number.isInteger(n) || n < 1 || n > Number(bus.total_seats)) {
      return res.status(400).json({ error: `seats_override must be between 1 and ${bus.total_seats}` });
    }
  }

  await pool.query(
    `UPDATE trips
       SET route_id=?, bus_id=?, trip_date=?, departure_time=?, price_per_seat=?, seats_override=?
     WHERE trip_id=?`,
    [route_id, bus_id, trip_date, departure_time, price_per_seat, seats_override, id]
  );
  res.json({ ok: true });
}

/** DELETE (admin) */
export async function deleteTrip(req, res) {
  const { id } = req.params;
  const [[c]] = await pool.query(
    `SELECT COUNT(*) AS cnt
       FROM bookings
      WHERE trip_id=? AND status='CONFIRMED'`, [id]
  );
  if (c.cnt > 0) return res.status(409).json({ error: 'Cannot delete. Confirmed bookings exist.' });

  await pool.query('DELETE FROM trips WHERE trip_id=?', [id]);
  res.json({ ok: true });
}

=======

      FROM trips t

      JOIN routes r 
        ON r.route_id = t.route_id

      JOIN buses b 
        ON b.bus_id = t.bus_id

      LEFT JOIN operators o
        ON o.operator_id = b.operator_id

      JOIN route_stops rs_from
        ON rs_from.route_id = t.route_id 
       AND rs_from.stop_id = ?

      JOIN route_stops rs_to
        ON rs_to.route_id = t.route_id 
       AND rs_to.stop_id = ?

      WHERE DATE_FORMAT(t.trip_date, '%Y-%m-%d') = ?
        AND t.route_id = ?
        AND rs_from.seq_no < rs_to.seq_no

      HAVING available >= ?

      ORDER BY 
        t.trip_date ASC,
        t.departure_time IS NULL ASC,
        t.departure_time ASC
    `;

    const params = [from_stop_id, to_stop_id, date, route_id, seats];

    const [rows] = await pool.query(sql, params);

    return res.json(rows || []);
  } catch (e) {
    console.error("searchTrips error:", e);
    return res.status(500).json({ error: "Failed to search trips" });
  }
}

/** DETAILS (public) – returns seat lock info for seat map; seats respect seats_override */
export async function getTrip(req, res) {
  try {
    const { id } = req.params;

    const [[trip]] = await pool.query(
      `SELECT
          t.trip_id,

          DATE_FORMAT(t.trip_date, '%Y-%m-%d') AS trip_date,
          TIME_FORMAT(t.departure_time, '%H:%i:%s') AS departure_time,

          t.price_per_seat,

          r.route_id,
          r.origin,
          r.destination,

          b.bus_id,
          b.bus_number,
          b.bus_name,
          b.ac_type,
          b.driver_name,
          b.driver_phone,

          o.company_name AS company_name,

          COALESCE(t.seats_override, b.total_seats) AS seats

       FROM trips t

       JOIN routes r 
         ON r.route_id = t.route_id

       JOIN buses b 
         ON b.bus_id = t.bus_id

       LEFT JOIN operators o
         ON o.operator_id = b.operator_id

       WHERE t.trip_id = ?`,
      [id],
    );

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const [locked] = await pool.query(
      `SELECT
          bs.seat_number,
          bs.status,
          bs.gender,
          bs.is_arrived,
          bk.customer_name,
          bk.customer_phone
         FROM booking_seats bs
         JOIN bookings bk 
           ON bk.booking_id = bs.booking_id
        WHERE bs.trip_id = ?
          AND bs.is_active = 1
          AND bs.status IN ('RESERVED', 'CONFIRMED')
        ORDER BY CAST(bs.seat_number AS UNSIGNED), bs.seat_number`,
      [id],
    );

    return res.json({
      ...trip,
      lockedSeats: locked,
    });
  } catch (e) {
    console.error("getTrip error:", e);
    return res.status(500).json({ error: "Failed to load trip" });
  }
}

/** LIST (admin) — seats & availability respect seats_override */
export async function listTrips(req, res) {
  try {
    const { date, from: origin, to: destination } = req.query;

    const params = [];
    let where = "1=1";

    if (date) {
      where += " AND DATE_FORMAT(t.trip_date, '%Y-%m-%d') = ?";
      params.push(date);
    }

    if (origin) {
      where += " AND r.origin = ?";
      params.push(origin);
    }

    if (destination) {
      where += " AND r.destination = ?";
      params.push(destination);
    }

    const [rows] = await pool.query(
      `SELECT
          t.trip_id,

          DATE_FORMAT(t.trip_date, '%Y-%m-%d') AS trip_date,
          TIME_FORMAT(t.departure_time, '%H:%i:%s') AS departure_time,

          t.price_per_seat,
          t.seats_override,

          r.route_id,
          r.origin,
          r.destination,

          b.bus_id,
          b.bus_number,
          b.bus_name,
          b.ac_type,
          b.driver_name,
          b.driver_phone,

          o.company_name AS company_name,

          COALESCE(t.seats_override, b.total_seats) AS seats,

          (
            COALESCE(t.seats_override, b.total_seats) -
            (
              SELECT COUNT(*)
                FROM booking_seats bs
               WHERE bs.trip_id = t.trip_id
                 AND bs.is_active = 1
                 AND bs.status IN ('RESERVED', 'CONFIRMED')
            )
          ) AS available

       FROM trips t

       JOIN routes r 
         ON r.route_id = t.route_id

       JOIN buses b 
         ON b.bus_id = t.bus_id

       LEFT JOIN operators o
         ON o.operator_id = b.operator_id

       WHERE ${where}

       ORDER BY 
         t.trip_date ASC,
         t.departure_time IS NULL ASC,
         t.departure_time ASC`,
      params,
    );

    return res.json(rows || []);
  } catch (e) {
    console.error("listTrips error:", e);
    return res.status(500).json({ error: "Failed to list trips" });
  }
}

/** UPDATE (admin) — supports seats_override */
export async function updateTrip(req, res) {
  try {
    const { id } = req.params;

    const {
      route_id,
      bus_id,
      trip_date,
      departure_time = null,
      price_per_seat,
      seats_override = null,
    } = req.body;

    if (seats_override != null) {
      const [[bus]] = await pool.query(
        "SELECT total_seats FROM buses WHERE bus_id=?",
        [bus_id],
      );

      if (!bus) {
        return res.status(409).json({ error: "Invalid bus_id" });
      }

      const n = Number(seats_override);

      if (!Number.isInteger(n) || n < 1 || n > Number(bus.total_seats)) {
        return res.status(400).json({
          error: `seats_override must be between 1 and ${bus.total_seats}`,
        });
      }
    }

    await pool.query(
      `UPDATE trips
          SET route_id = ?,
              bus_id = ?,
              trip_date = ?,
              departure_time = ?,
              price_per_seat = ?,
              seats_override = ?
        WHERE trip_id = ?`,
      [
        route_id,
        bus_id,
        trip_date,
        departure_time,
        price_per_seat,
        seats_override,
        id,
      ],
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("updateTrip error:", e);
    return res.status(500).json({ error: "Failed to update trip" });
  }
}

/** DELETE (admin) */
export async function deleteTrip(req, res) {
  try {
    const { id } = req.params;

    const [[c]] = await pool.query(
      `SELECT COUNT(*) AS cnt
         FROM bookings
        WHERE trip_id = ?
          AND status = 'CONFIRMED'`,
      [id],
    );

    if (c.cnt > 0) {
      return res.status(409).json({
        error: "Cannot delete. Confirmed bookings exist.",
      });
    }

    await pool.query("DELETE FROM trips WHERE trip_id = ?", [id]);

    return res.json({ ok: true });
  } catch (e) {
    console.error("deleteTrip error:", e);
    return res.status(500).json({ error: "Failed to delete trip" });
  }
}
>>>>>>> Stashed changes
