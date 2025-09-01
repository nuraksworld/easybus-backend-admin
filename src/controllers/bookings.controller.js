import dayjs from 'dayjs';
import { pool, withTx } from '../db.js';
import { config } from '../config.js';
import { sendBookingSms } from '../services/sms.js';

export async function holdSeats(req,res){
  const { trip_id, seats, customer_name, customer_phone, genders, expected_amount } = req.body;
  if (!Array.isArray(seats) || seats.length===0) return res.status(400).json({error:'No seats'});
  const holdUntil = dayjs().add(config.holdMinutes, 'minute').toDate();

  const result = await withTx(async (conn)=>{
    const [br]=await conn.query(
      `INSERT INTO bookings(trip_id,customer_name,customer_phone,status,payment_status,hold_expires_at,total_amount)
       VALUES (?,?,?,?,?,?,?)`,
      [trip_id,customer_name,customer_phone,'RESERVED','PENDING',holdUntil,expected_amount||0]
    );
    const booking_id = br.insertId;
    for (let i=0;i<seats.length;i++){
      const seat=String(seats[i]);
      const gender=genders?.[i]==='F'?'F':'M';
      await conn.query(
        `INSERT INTO booking_seats(booking_id,trip_id,seat_number,gender,status,is_active) VALUES (?,?,?,?, 'RESERVED', 1)`,
        [booking_id, trip_id, seat, gender]
      );
    }
    return { booking_id };
  });

  res.json({ booking_id: result.booking_id, hold_expires_at: holdUntil });
}

export async function confirmPayment(req,res){
  const { id } = req.params; const { payment_ref, amount, notify_to } = req.body;
  await withTx(async (conn)=>{
    const [rows]=await conn.query('SELECT * FROM bookings WHERE booking_id=? FOR UPDATE',[id]);
    if (!rows.length) throw new Error('Not found');
    const b=rows[0];
    if (b.status!=='RESERVED') throw new Error('Not RESERVED');
    if (b.hold_expires_at && new Date(b.hold_expires_at)<new Date()) throw new Error('Hold expired');

    await conn.query(`UPDATE bookings SET status='CONFIRMED', payment_status='PAID', payment_ref=?, total_amount=? WHERE booking_id=?`,
      [payment_ref || b.payment_ref, amount || b.total_amount, id]);
    await conn.query(`UPDATE booking_seats SET status='CONFIRMED' WHERE booking_id=?`, [id]);
  });
  sendBookingSms({ to: notify_to, message: `EasyBus: Booking #${id} CONFIRMED.` }).catch(()=>{});
  res.json({ ok:true });
}

export async function cancelBooking(req,res){
  const { id } = req.params;
  await withTx(async (conn)=>{
    const [rows]=await conn.query('SELECT * FROM bookings WHERE booking_id=? FOR UPDATE',[id]);
    if (!rows.length) throw new Error('Not found');
    const b=rows[0];
    if (['CANCELLED','EXPIRED'].includes(b.status)) return;
    await conn.query(`UPDATE bookings SET status='CANCELLED' WHERE booking_id=?`, [id]);
    await conn.query(`UPDATE booking_seats SET status='CANCELLED', is_active=0 WHERE booking_id=?`, [id]);
  });
  res.json({ ok:true });
}

export async function getBooking(req,res){
  const { id } = req.params;
  const [[book]] = await pool.query('SELECT * FROM bookings WHERE booking_id=?',[id]);
  if (!book) return res.status(404).json({error:'Not found'});
  const [seats]=await pool.query('SELECT seat_number, gender, status FROM booking_seats WHERE booking_id=?',[id]);
  res.json({ ...book, seats });
}

export async function listBookings(req,res){
  const { status } = req.query;
  const params=[]; let sql=
`SELECT b.*, t.trip_date, r.origin, r.destination
 FROM bookings b
 JOIN trips t ON t.trip_id=b.trip_id
 JOIN routes r ON r.route_id=t.route_id`;
  if (status){ sql+=' WHERE b.status=?'; params.push(status); }
  sql+=' ORDER BY b.created_at DESC LIMIT 200';
  const [rows]=await pool.query(sql, params);
  res.json(rows);
}
