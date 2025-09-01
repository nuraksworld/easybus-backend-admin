import cron from 'node-cron';
import { pool } from '../db.js';

export function startExpireHoldsJob() {
  cron.schedule('* * * * *', async () => {
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();
      await c.query(`UPDATE bookings SET status='EXPIRED'
        WHERE status='RESERVED' AND hold_expires_at IS NOT NULL AND hold_expires_at < NOW()`);
      await c.query(`UPDATE booking_seats bs
        JOIN bookings b ON b.booking_id=bs.booking_id
        SET bs.status='EXPIRED', bs.is_active=0
        WHERE b.status='EXPIRED' AND bs.is_active=1`);
      await c.commit();
    } catch (e) {
      await c.rollback();
      console.error('expire job', e.message);
    } finally {
      c.release();
    }
  });
}
