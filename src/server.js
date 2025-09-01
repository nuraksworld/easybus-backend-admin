import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import adminRoutes from './routes/admin.routes.js';
import operatorRoutes from './routes/operators.routes.js';
import busRoutes from './routes/buses.routes.js';
import routeRoutes from './routes/routes.routes.js';
import tripRoutes from './routes/trips.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import { startExpireHoldsJob } from './jobs/expireHolds.js';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_,res)=>res.json({ ok:true }));

app.use('/api/admin', adminRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);

startExpireHoldsJob();
app.listen(config.port, ()=> console.log(`API on :${config.port}`));
