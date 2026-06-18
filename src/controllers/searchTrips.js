export async function searchTrips(req, res) {
  const { date, seats = 1 } = req.query;
  const route_id     = req.query.route_id ? Number(req.query.route_id) : null;
  const from_stop_id = req.query.from_stop_id ? Number(req.query.from_stop_id) : null;
  const to_stop_id   = req.query.to_stop_id ? Number(req.query.to_stop_id) : null;

  const params = [];
  let where = "1=1";
  if (date)     { where += " AND DATE(t.trip_date)=?"; params.push(date); }
  if (route_id) { where += " AND t.route_id=?";        params.push(route_id); }

  let joinStops = "";
  if (from_stop_id && to_stop_id) {
    joinStops = `
      JOIN route_stops rs_from ON rs_from.route_id=t.route_id AND rs_from.stop_id=?
      JOIN route_stops rs_to   ON rs_to.route_id=t.route_id   AND rs_to.stop_id=? AND rs_from.seq_no < rs_to.seq_no
    `;
  }

  const [rows] = await pool.query(
  `SELECT
      t.trip_id, t.trip_date, t.departure_time, t.price_per_seat,
      r.origin, r.destination,
      b.bus_number, b.bus_name, b.ac_type, b.total_seats AS seats,
      b.driver_name, b.driver_phone,
      (b.total_seats - (
        SELECT COUNT(*) FROM booking_seats bs
        WHERE bs.trip_id=t.trip_id AND bs.is_active=1 AND bs.status IN ('RESERVED','CONFIRMED')
      )) AS available
   FROM trips t
   JOIN routes r ON r.route_id=t.route_id
   JOIN buses  b ON b.bus_id=t.bus_id
   ${joinStops}
   WHERE ${where}
   HAVING available >= ?
   ORDER BY t.trip_date, t.departure_time IS NULL, t.departure_time`,
   [
     ...(from_stop_id && to_stop_id ? [from_stop_id, to_stop_id] : []),
     ...params,
     Number(seats),
   ]
  );

  res.json(rows);
}
