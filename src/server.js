// src/server.js
import express from 'express';
import cors from 'cors';
import { config } from './config.js';

// ROUTES
import userRoutes from './routes/user.routes.js';
import userManagementRoutes from './routes/userManagement.routes.js';
import adminRoutes from './routes/admin.routes.js';
import operatorRoutes from './routes/operators.routes.js';
import busRoutes from './routes/buses.routes.js';
import routeRoutes from './routes/routes.routes.js';
import tripRoutes from './routes/trips.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import driverRoutes from './routes/driver.routes.js';

// JOBS & CRONS
import { startExpireHoldsJob } from './jobs/expireHolds.js';
import './cron/holds.js';

// ✅ Create Express App FIRST
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Optional logging middleware
app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ------------------ ROUTE MOUNTS ------------------

// PUBLIC APIs
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);

// ADMIN APIs
app.use('/api/admin', adminRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);

// DRIVER APIs
app.use('/api/driver', driverRoutes);

// USER (OTP Login) APIs
app.use('/api/user', userRoutes);

// USER MANAGEMENT (Admin-only)
app.use('/api/user-mgmt', userManagementRoutes);

// ------------------ START BACKGROUND JOBS ------------------
startExpireHoldsJob();

// ------------------ START SERVER ------------------
app.listen(config.port, () => {
  console.log(`🚀 API running on port ${config.port}`);
});
