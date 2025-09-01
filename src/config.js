import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'seat_booking',
    waitForConnections: true,
    connectionLimit: 10,
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  holdMinutes: parseInt(process.env.HOLD_MINUTES || '15', 10),
  sms: {
    apiKey: process.env.OTP_API_KEY,
    userId: process.env.OTP_USER_ID,
    senderId: process.env.OTP_SENDER_ID,
  }
};
