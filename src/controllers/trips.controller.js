import { pool } from '../db.js';

export async function createTrip(req,res){
  const {route_id,bus_id,trip_date,departure_time=null,price_per_seat,notes=null}=req.body;
  const [r]=await pool.query(`INSERT INTO trips(route_id,bus_id,trip_date,departure_time,price_per_seat,notes) VALUES (?,?,?,?,?,?)`,
    [route_id,bus_id,trip_date,departure_time,price_per_seat,notes]);
  res.json({trip_id:r.insertId});
}

export async function searchTrips(req,res){
  const { date, from:origin, to:destination, seats=1 } = req.query;
  const [rows]=await pool.query(
`SELECT t.trip_id, t.trip_date, t.departure_time, t.price_per_seat,
        r.origin, r.destination, b.bus_name, b.bus_number, b.total_seats, b.ac_type, b.driver_name, b.driver_phone,
        (b.total_seats - (
           SELECT COUNT(*) FROM booking_seats bs
           JOIN bookings bks ON bks.booking_id = bs.booking_id
           WHERE bks.trip_id = t.trip_id AND bs.is_active=1 AND bs.status IN ('RESERVED','CONFIRMED')
        )) AS available
 FROM trips t
 JOIN routes r ON r.route_id=t.route_id
 JOIN buses  b ON b.bus_id=t.bus_id
 WHERE t.trip_date=? AND r.origin=? AND r.destination=?
 HAVING available >= ?
 ORDER BY t.departure_time IS NULL, t.departure_time`, [date, origin, destination, Number(seats)]);
  res.json(rows);
}

export async function getTrip(req,res){
  const { id } = req.params;
  const [rows]=await pool.query(
`SELECT t.*, r.origin, r.destination, b.bus_name, b.bus_number, b.total_seats, b.ac_type, b.driver_name, b.driver_phone
 FROM trips t JOIN routes r ON r.route_id=t.route_id JOIN buses b ON b.bus_id=t.bus_id WHERE t.trip_id=?`, [id]);
  if (!rows.length) return res.status(404).json({error:'Not found'});
  const trip = rows[0];
  const [locked]=await pool.query(`SELECT seat_number, status, gender FROM booking_seats WHERE trip_id=? AND is_active=1 AND status IN ('RESERVED','CONFIRMED')`, [id]);
  res.json({ ...trip, lockedSeats: locked });
}
