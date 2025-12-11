// src/server.js
import express from 'express';
import cors from 'cors';
import { config } from './config.js';

import adminRoutes from './routes/admin.routes.js';
import operatorRoutes from './routes/operators.routes.js';
import busRoutes from './routes/buses.routes.js';
import routeRoutes from './routes/routes.routes.js';
import tripRoutes from './routes/trips.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import driverRoutes from './routes/driver.routes.js';

import { startExpireHoldsJob } from './jobs/expireHolds.js';
import './cron/holds.js';

const app = express();
app.use(cors());
app.use(express.json());

// Optional: log all requests to see what mobile is calling
app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// PUBLIC APIS
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);

// ADMIN APIS
app.use('/api/admin', adminRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);

// DRIVER MOBILE APIS
app.use('/api/driver', driverRoutes);

// JOBS
startExpireHoldsJob();

app.listen(config.port, () => {
  console.log(`API on :${config.port}`);
});
