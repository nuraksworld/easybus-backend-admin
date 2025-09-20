import dayjs from 'dayjs';
import { pool, withTx } from '../db.js';
import { config } from '../config.js';
import { sendBookingSms } from '../services/sms.js';
import ExcelJS from 'exceljs'; // npm i exceljs

/** Hold (reserve) seats for a limited time */
// --- inside bookings.controller.js ---
export async function holdSeats(req, res) {
  try {
    const {
      trip_id,
      seats,
      customer_name,
      customer_phone,
      genders = [],
      expected_amount,
      from_stop_id,                // NEW
      to_stop_id,                  // NEW
    } = req.body;

    if (!trip_id || !customer_name || !customer_phone || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'trip_id, customer_name, customer_phone, seats[] required' });
    }

    // ensure from/to provided
    if (!from_stop_id || !to_stop_id) {
      return res.status(400).json({ error: 'from_stop_id and to_stop_id are required' });
    }

    // Validate that (from -> to) is a forward direction on THIS trip's route
    const [[dir]] = await pool.query(
      `SELECT rs_from.seq_no AS from_seq, rs_to.seq_no AS to_seq
         FROM trips t
         JOIN route_stops rs_from ON rs_from.route_id = t.route_id AND rs_from.stop_id = ?
         JOIN route_stops rs_to   ON rs_to.route_id   = t.route_id AND rs_to.stop_id   = ?
        WHERE t.trip_id = ?`,
      [from_stop_id, to_stop_id, trip_id]
    );
    if (!dir || dir.from_seq >= dir.to_seq) {
      return res.status(400).json({ error: 'Invalid boarding/destination for this route' });
    }

    // conflict check (same as before)
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

    const holdUntil = new Date(Date.now() + (1000 * 60 * (Number(process.env.HOLD_MINUTES) || 15)));

    const result = await withTx(async (conn) => {
      // NOTE: now saving from_stop_id / to_stop_id in bookings
      const [br] = await conn.query(
        `INSERT INTO bookings(
            trip_id, customer_name, customer_phone,
            from_stop_id, to_stop_id,
            status, payment_status, hold_expires_at, total_amount
         ) VALUES (?,?,?,?,?, 'RESERVED','PENDING', ?, ?)`,
        [trip_id, customer_name, customer_phone, from_stop_id, to_stop_id, holdUntil, expected_amount || 0]
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

/** ------- Shared fetch for Manage Bookings (Date + Bus Number + Status) ------- */
// keep your existing helper name; just replace the SQL body
async function fetchBookingsByDateBus({ date, bus_number, status }) {
  const params = [];
  let where = '1=1';
  if (date)       { where += ' AND t.trip_date = ?'; params.push(date); }
  if (bus_number) { where += ' AND b.bus_number = ?'; params.push(bus_number); }
  if (status)     { where += ' AND bk.status = ?';    params.push(status); }

  const [rows] = await pool.query(
    `
    SELECT
      bk.booking_id,
      bk.trip_id,
      bk.status,
      bk.payment_status,
      bk.total_amount,
      bk.customer_name,
      bk.customer_phone,
      bk.created_at,
      bk.from_stop_id,
      bk.to_stop_id,

      t.trip_date,
      t.departure_time,

      r.origin, r.destination,      -- route endpoints (fallback)
      b.bus_id, b.bus_number, b.bus_name,

      sf.name AS from_name,         -- << actual boarding stop name
      st.name AS to_name,           -- << actual destination stop name

      GROUP_CONCAT(
        CASE
          WHEN bs.is_active=1 AND bs.status IN ('RESERVED','CONFIRMED') THEN bs.seat_number
          ELSE NULL
        END
        ORDER BY CAST(bs.seat_number AS UNSIGNED), bs.seat_number
      ) AS seats_csv,

      SUM(CASE WHEN bs.is_active=1 AND bs.status IN ('RESERVED','CONFIRMED') THEN 1 ELSE 0 END) AS seat_count
    FROM bookings bk
    JOIN trips  t ON t.trip_id = bk.trip_id
    JOIN routes r ON r.route_id = t.route_id
    JOIN buses  b ON b.bus_id  = t.bus_id
    LEFT JOIN stops sf ON sf.stop_id = bk.from_stop_id
    LEFT JOIN stops st ON st.stop_id = bk.to_stop_id
    LEFT JOIN booking_seats bs
           ON bs.booking_id = bk.booking_id
    WHERE ${where}
    GROUP BY
      bk.booking_id, bk.trip_id, bk.status, bk.payment_status, bk.total_amount,
      bk.customer_name, bk.customer_phone, bk.created_at,
      bk.from_stop_id, bk.to_stop_id,
      t.trip_date, t.departure_time, r.origin, r.destination,
      b.bus_id, b.bus_number, b.bus_name, sf.name, st.name
    ORDER BY t.trip_date DESC, t.departure_time IS NULL, t.departure_time ASC, bk.booking_id DESC
    `,
    params
  );
  return rows;
}

// and in listBookings, allow status filter (if you already have it, keep it)
export async function listBookings(req, res) {
  try {
    const { date, bus_number, status } = req.query;
    const rows = await fetchBookingsByDateBus({ date, bus_number, status });
    res.json(rows || []);
  } catch (e) {
    console.error('listBookings error:', e);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
}


/** Manage Bookings list (filters: date, bus_number, status) */
// export async function listBookings(req, res) {
//   try {
//     const { date, bus_number, status } = req.query;
//     const rows = await fetchBookingsByDateBus({ date, bus_number, status });
//     res.json(rows || []);
//   } catch (e) {
//     console.error('listBookings error:', e);
//     res.status(500).json({ error: 'Failed to load bookings' });
//   }
// }

/** Export filtered bookings as an Excel file (.xlsx) */
export async function exportBookingsExcel(req, res) {
  try {
    const { date, bus_number, status } = req.query;
    const rows = await fetchBookingsByDateBus({ date, bus_number, status });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bookings');

    // Header info row
    ws.addRow([`Date: ${date || 'All'}   Bus: ${bus_number || 'All'}   Status: ${status || 'All'}`]);
    ws.mergeCells(1,1,1,10);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: 'center' };

    // Column headers
    ws.addRow([
      'Booking ID','Status','Date','Time','From','To','Bus','Seat Nos','Amount','Customer Phone'
    ]);
    const headerRow = ws.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    // Column widths
    const widths = [12,12,12,10,16,16,22,28,12,18];
    widths.forEach((w, i) => { ws.getColumn(i+1).width = w; });

    // Data rows
    rows.forEach(r => {
      const bus = `${r.bus_number}${r.bus_name ? ` (${r.bus_name})` : ''}`;
      const seatStr = r.seats_csv ? r.seats_csv.split(',').filter(Boolean).join(', ') : '-';
      ws.addRow([
        r.booking_id,
        r.status || '-',
        r.trip_date || '-',
        r.departure_time || '-',
        r.origin || '-',
        r.destination || '-',
        bus,
        seatStr,
        Number(r.total_amount ?? 0),
        r.customer_phone || '-',
      ]);
    });

    // Amount column numeric format
    ws.getColumn(9).numFmt = '0.00';

    // Freeze header
    ws.views = [{ state: 'frozen', ySplit: 2 }];

    // Autofilter on header row
    ws.autoFilter = { from: 'A2', to: 'J2' };

    // Stream to response
    const safeBus = (bus_number || 'all').replace(/[^a-z0-9_-]/gi,'');
    const filename = `bookings_${date || 'all'}_${safeBus}_${status || 'all'}.xlsx`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('exportBookingsExcel error:', e);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
}

/** Confirm payment (force-confirm) + conflict check + SMS */
export async function confirmPayment(req, res) {
  try {
    const { id } = req.params;
    const { payment_ref, amount, notify_to } = req.body;

    let info, seats = [];
    await withTx(async (conn) => {
      const [[b]] = await conn.query(
        `SELECT * FROM bookings WHERE booking_id=? FOR UPDATE`, [id]
      );
      if (!b) throw new Error('Not found');

      const [mySeatRows] = await conn.query(
        `SELECT seat_number
           FROM booking_seats
          WHERE booking_id=?
          ORDER BY seat_number`, [id]
      );
      if (!mySeatRows.length) throw new Error('No seats on this booking');
      const mySeats = mySeatRows.map(s => String(s.seat_number));
      const placeholders = mySeats.map(() => '?').join(',');

      const [conflicts] = await conn.query(
        `SELECT seat_number
           FROM booking_seats
          WHERE trip_id=?
            AND booking_id<>?
            AND is_active=1
            AND status IN ('RESERVED','CONFIRMED')
            AND seat_number IN (${placeholders})`,
        [b.trip_id, id, ...mySeats]
      );
      if (conflicts.length) {
        return res.status(409).json({
          error: 'Seat conflict. These seats are already taken.',
          seats: conflicts.map(s => s.seat_number)
        });
      }

      await conn.query(
        `UPDATE bookings
            SET status='CONFIRMED',
                payment_status='PAID',
                payment_ref=COALESCE(?, payment_ref),
                total_amount=COALESCE(?, total_amount),
                hold_expires_at=NULL
          WHERE booking_id=?`,
        [payment_ref, amount, id]
      );
      await conn.query(
        `UPDATE booking_seats
            SET status='CONFIRMED', is_active=1
          WHERE booking_id=?`,
        [id]
      );

      const [[row]] = await conn.query(
        `SELECT b.booking_id, b.customer_name, b.customer_phone, b.total_amount,
                t.trip_date, t.departure_time,
                r.origin, r.destination,
                bu.bus_number, bu.bus_name
           FROM bookings b
           JOIN trips  t  ON t.trip_id  = b.trip_id
           JOIN routes r  ON r.route_id = t.route_id
           JOIN buses  bu ON bu.bus_id  = t.bus_id
          WHERE b.booking_id=?`, [id]
      );
      info = row;

      const [seatRows] = await conn.query(
        `SELECT seat_number
           FROM booking_seats
          WHERE booking_id=?
          ORDER BY seat_number`, [id]
      );
      seats = seatRows.map(s => String(s.seat_number));
    });

    const toPhone = notify_to || info?.customer_phone;
    if (toPhone) {
      const seatStr = seats.length ? seats.join(',') : '-';
      const busStr = info.bus_name ? `${info.bus_number} (${info.bus_name})` : info.bus_number;
      const dt = [info.trip_date, info.departure_time || ''].filter(Boolean).join(' ');
      const text =
        `BOOKMYSEAT Seat CONFIRMED\n` +
        `#${id} | Hello ${info.customer_name}\n` +
        `${info.origin} → ${info.destination}\n` +
        `${dt} | Bus ${busStr}\n` +
        `Seat Number: ${seatStr}\n` +
        `Amount: Rs ${Number(info.total_amount || 0).toFixed(2)}\n` +
        `Show this SMS when boarding.`;
      try { await sendBookingSms({ to: toPhone, message: text }); } catch (_) {}
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('confirmPayment error:', err.message);
    res.status(400).json({ error: err.message || 'Payment confirmation failed' });
  }
}

/** Cancel booking (delete seat locks to avoid unique-key clash) + SMS */
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const { notify_to } = req.body || {};

    let info, seatNumbers = [];

    await withTx(async (conn) => {
      const [[b]] = await conn.query(
        `SELECT * FROM bookings WHERE booking_id=? FOR UPDATE`, [id]
      );
      if (!b) throw new Error('Not found');

      const [[row]] = await conn.query(
        `SELECT b.booking_id, b.customer_name, b.customer_phone,
                t.trip_date, t.departure_time,
                r.origin, r.destination,
                bu.bus_number, bu.bus_name
           FROM bookings b
           JOIN trips  t  ON t.trip_id  = b.trip_id
           JOIN routes r  ON r.route_id = t.route_id
           JOIN buses  bu ON bu.bus_id  = t.bus_id
          WHERE b.booking_id=?`, [id]
      );
      info = row;

      const [seatsRows] = await conn.query(
        `SELECT seat_number
           FROM booking_seats
          WHERE booking_id=?
          ORDER BY CAST(seat_number AS UNSIGNED), seat_number`, [id]
      );
      seatNumbers = seatsRows.map(s => String(s.seat_number));

      // Delete seat rows to avoid unique-key collisions on is_active=0
      await conn.query(`DELETE FROM booking_seats WHERE booking_id=?`, [id]);

      if (b.status !== 'CANCELLED') {
        await conn.query(`UPDATE bookings SET status='CANCELLED' WHERE booking_id=?`, [id]);
      }
    });

    try {
      const toPhone = notify_to || info?.customer_phone;
      if (toPhone) {
        const seatStr = seatNumbers.length ? seatNumbers.join(',') : '-';
        const busStr  = info.bus_name ? `${info.bus_number} (${info.bus_name})` : info.bus_number;
        const dt      = [info.trip_date, info.departure_time || ''].filter(Boolean).join(' ');
        const text =
          `BOOKMYSEAT Seat CANCELLED\n` +
          `#${id} | Hello ${info.customer_name}\n` +
          `${info.origin} → ${info.destination}\n` +
          `${dt} | Bus ${busStr}\n` +
          `Seat Numbers: ${seatStr}\n` +
          `Your booking has been cancelled.`;
        const smsRes = await sendBookingSms({ to: toPhone, message: text }).catch(() => null);
        if (!smsRes?.ok) console.warn("SMSLenz send failed (cancel):", smsRes?.error, smsRes?.data);
      }
    } catch (e) {
      console.warn("cancelBooking SMS warn:", e?.message || e);
    }

    res.json({ ok: true, cancelled_seats: seatNumbers.length });
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
