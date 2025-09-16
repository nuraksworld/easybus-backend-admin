// src/controllers/trips.controller.js
import { pool } from '../db.js';

/** CREATE (admin) — uses only existing columns in your DB */
export async function createTrip(req, res) {
  try {
    const {
      route_id,
      bus_id,
      trip_date,                 // 'YYYY-MM-DD'
      departure_time = null,     // 'HH:mm:ss' or null
      price_per_seat
    } = req.body;

    if (!route_id || !bus_id || !trip_date || price_per_seat == null) {
      return res.status(400).json({ error: 'route_id, bus_id, trip_date, price_per_seat are required' });
    }

    await pool.query(
      `INSERT INTO trips (route_id, bus_id, trip_date, departure_time, price_per_seat)
       VALUES (?,?,?,?,?)`,
      [route_id, bus_id, trip_date, departure_time, price_per_seat]
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

/** SEARCH (public) – used by the booking flow */
export async function searchTrips(req, res) {
  const { date, from: origin, to: destination, seats = 1 } = req.query;
  const params = [];
  let where = '1=1';

  if (date)        { where += ' AND t.trip_date=?'; params.push(date); }
  if (origin)      { where += ' AND r.origin=?'; params.push(origin); }
  if (destination) { where += ' AND r.destination=?'; params.push(destination); }

  const [rows] = await pool.query(
  `SELECT
      t.trip_id, t.trip_date, t.departure_time, t.price_per_seat,
      r.route_id, r.origin, r.destination,
      b.bus_id, b.bus_number, b.bus_name, b.ac_type, b.total_seats,
      b.driver_name, b.driver_phone,
      b.total_seats AS seats,
      (
        b.total_seats -
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
   HAVING available >= ?
   ORDER BY t.trip_date, t.departure_time IS NULL, t.departure_time`,
   [...params, Number(seats)]
  );

  res.json(rows);
}

/** DETAILS (public) – returns seat lock info for seat map */
export async function getTrip(req, res) {
  const { id } = req.params;

  const [[trip]] = await pool.query(
  `SELECT
      t.trip_id, t.trip_date, t.departure_time, t.price_per_seat,
      r.route_id, r.origin, r.destination,
      b.bus_id, b.bus_number, b.bus_name, b.ac_type, b.total_seats,
      b.driver_name, b.driver_phone,
      b.total_seats AS seats
   FROM trips t
   JOIN routes r ON r.route_id = t.route_id
   JOIN buses  b ON b.bus_id  = t.bus_id
   WHERE t.trip_id=?`,
   [id]
  );

  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const [locked] = await pool.query(
    `SELECT seat_number, status, gender
       FROM booking_seats
      WHERE trip_id=? AND is_active=1 AND status IN ('RESERVED','CONFIRMED')`,
    [id]
  );

  res.json({ ...trip, lockedSeats: locked });
}

/** LIST (admin) */
export async function listTrips(req, res) {
  const { date, from: origin, to: destination } = req.query;
  const params = [];
  let where = '1=1';
  if (date)        { where += ' AND t.trip_date=?'; params.push(date); }
  if (origin)      { where += ' AND r.origin=?'; params.push(origin); }
  if (destination) { where += ' AND r.destination=?'; params.push(destination); }

  const [rows] = await pool.query(
  `SELECT
      t.trip_id, t.trip_date, t.departure_time, t.price_per_seat,
      r.route_id, r.origin, r.destination,
      b.bus_id, b.bus_number, b.bus_name, b.ac_type, b.total_seats,
      b.driver_name, b.driver_phone,
      b.total_seats AS seats,
      (
        b.total_seats -
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

/** UPDATE (admin) — updates only existing columns */
export async function updateTrip(req, res) {
  const { id } = req.params;
  const {
    route_id,
    bus_id,
    trip_date,
    departure_time = null,
    price_per_seat
  } = req.body;

  await pool.query(
    `UPDATE trips
       SET route_id=?, bus_id=?, trip_date=?, departure_time=?, price_per_seat=?
     WHERE trip_id=?`,
    [route_id, bus_id, trip_date, departure_time, price_per_seat, id]
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
