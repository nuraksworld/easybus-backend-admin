// src/controllers/bookings.controller.js
import dayjs from 'dayjs';
import { pool, withTx } from '../db.js';
import { config } from '../config.js';
import { sendBookingSms } from '../services/sms.js';

/** Hold (reserve) seats for a limited time */
export async function holdSeats(req, res) {
  try {
    const { trip_id, seats, customer_name, customer_phone, genders = [], expected_amount } = req.body;
    if (!trip_id || !customer_name || !customer_phone || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'trip_id, customer_name, customer_phone, seats[] required' });
    }

    // seat conflict check
    const placeholders = seats.map(() => '?').join(',');
    const [conflicts] = await pool.query(
      `SELECT seat_number
         FROM booking_seats
        WHERE trip_id=? AND is_active=1 AND status IN ('RESERVED','CONFIRMED')
          AND seat_number IN (${placeholders})`,
      [trip_id, ...seats]
    );
    if (conflicts.length) {
      return res.status(409).json({ error: 'Some seats already taken', seats: conflicts.map(s => s.seat_number) });
    }

    // create booking + seat rows transactionally
    const holdUntil = dayjs().add(config.holdMinutes || 15, 'minute').toDate();

    const result = await withTx(async (conn) => {
      const [br] = await conn.query(
        `INSERT INTO bookings(trip_id, customer_name, customer_phone, status, payment_status, hold_expires_at, total_amount)
         VALUES (?,?,?,?,?,?,?)`,
        [trip_id, customer_name, customer_phone, 'RESERVED', 'PENDING', holdUntil, expected_amount || 0]
      );
      const booking_id = br.insertId;

      for (let i = 0; i < seats.length; i++) {
        const seat = String(seats[i]);
        const gender = genders?.[i] === 'F' ? 'F' : 'M';
        await conn.query(
          `INSERT INTO booking_seats(booking_id, trip_id, seat_number, gender, status, is_active)
           VALUES (?,?,?,?, 'RESERVED', 1)`,
          [booking_id, trip_id, seat, gender]
        );
      }
      return { booking_id };
    });

    res.status(201).json({ booking_id: result.booking_id, hold_expires_at: holdUntil });
  } catch (err) {
    console.error('holdSeats error:', err.code, err.sqlMessage || err.message);
    res.status(500).json({ error: 'Server error holding seats' });
  }
}

/** Flexible list (admin) — supports filters by status/date/trip_id */
export async function listBookings(req, res) {
  const { status, date, trip_id } = req.query;

  const params = [];
  let where = '1=1';
  if (status) { where += ' AND b.status=?'; params.push(status); }
  if (date)   { where += ' AND t.trip_date=?'; params.push(date); }
  if (trip_id){ where += ' AND b.trip_id=?'; params.push(trip_id); }

  const sql = `
    SELECT b.*, t.trip_date, t.departure_time, r.origin, r.destination
      FROM bookings b
      JOIN trips  t ON t.trip_id  = b.trip_id
      JOIN routes r ON r.route_id = t.route_id
     WHERE ${where}
     ORDER BY b.created_at DESC
     LIMIT 500
  `;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

/** Confirm payment (mark seats confirmed) */
export async function confirmPayment(req, res) {
  try {
    const { id } = req.params;
    const { payment_ref, amount, notify_to } = req.body;

    await withTx(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM bookings WHERE booking_id=? FOR UPDATE', [id]);
      if (!rows.length) throw new Error('Not found');
      const b = rows[0];

      if (b.status !== 'RESERVED') throw new Error('Not RESERVED');
      if (b.hold_expires_at && new Date(b.hold_expires_at) < new Date()) throw new Error('Hold expired');

      await conn.query(
        `UPDATE bookings
            SET status='CONFIRMED', payment_status='PAID', payment_ref=?, total_amount=?
          WHERE booking_id=?`,
        [payment_ref || b.payment_ref, amount || b.total_amount, id]
      );
      await conn.query(`UPDATE booking_seats SET status='CONFIRMED' WHERE booking_id=?`, [id]);
    });

    // fire-and-forget SMS
    sendBookingSms({ to: notify_to, message: `EasyBus: Booking #${id} CONFIRMED.` }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('confirmPayment error:', err.message);
    res.status(400).json({ error: err.message || 'Payment confirmation failed' });
  }
}

/** Cancel booking (manual) */
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    await withTx(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM bookings WHERE booking_id=? FOR UPDATE', [id]);
      if (!rows.length) throw new Error('Not found');
      const b = rows[0];
      if (['CANCELLED', 'EXPIRED'].includes(b.status)) return;

      await conn.query(`UPDATE bookings SET status='CANCELLED' WHERE booking_id=?`, [id]);
      await conn.query(`UPDATE booking_seats SET status='CANCELLED', is_active=0 WHERE booking_id=?`, [id]);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('cancelBooking error:', err.message);
    res.status(400).json({ error: err.message || 'Cancel failed' });
  }
}

/** Get one booking with its seats */
export async function getBooking(req, res) {
  const { id } = req.params;
  const [[book]] = await pool.query('SELECT * FROM bookings WHERE booking_id=?', [id]);
  if (!book) return res.status(404).json({ error: 'Not found' });
  const [seats] = await pool.query(
    'SELECT seat_number, gender, status FROM booking_seats WHERE booking_id=?',
    [id]
  );
  res.json({ ...book, seats });
}
