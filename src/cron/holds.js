// src/cron/holds.js
import cron from 'node-cron';
import { pool } from '../db.js';

cron.schedule('* * * * *', async () => {
  try {
    await pool.query(
      `UPDATE bookings 
          SET status='EXPIRED'
        WHERE status='RESERVED' AND hold_expires_at IS NOT NULL AND hold_expires_at < NOW()`
    );
    await pool.query(
      `UPDATE booking_seats bs
          JOIN bookings bk ON bk.booking_id=bs.booking_id
         SET bs.status='CANCELLED', bs.is_active=0
       WHERE bk.status='EXPIRED' AND bs.is_active=1 AND bs.status IN ('HELD','RESERVED')`
    );
  } catch (e) {
    console.error('cron expire holds error:', e.message);
  }
});
