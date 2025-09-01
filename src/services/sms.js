import axios from 'axios';
import { config } from '../config.js';
const GATEWAY_URL = 'https://your-sms-gateway.example/send';

export async function sendBookingSms({ to, message }) {
  if (!to) return false;
  try {
    await axios.post(GATEWAY_URL, {
      apiKey: config.sms.apiKey,
      userId: config.sms.userId,
      senderId: config.sms.senderId,
      to, message
    }, { timeout: 8000 });
    return true;
  } catch (e) {
    console.error('SMS failed', e?.response?.data || e.message);
    return false;
  }
}
