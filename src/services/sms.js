// src/services/sms.js
// npm i axios
import axios from "axios";

/**
 * SMSLenz credentials (env > hardcoded)
 */
const SMS_USER_ID   = process.env.SMSLENZ_USER_ID   || "560";
const SMS_API_KEY   = process.env.SMSLENZ_API_KEY   || "f9f37474-8162-4165-90d6-1bbd6d34ed63";
const SMS_SENDER_ID = process.env.SMSLENZ_SENDER_ID || "BOOKMYSEAT";   // must be approved at SMSLenz
const SMS_BASE_URL  = process.env.SMSLENZ_BASE_URL  || "https://smslenz.lk/api";

/**
 * Normalize to the format **+94XXXXXXXXX** (as required by SMSLenz "contact")
 * Accepts: 0771234567, 94771234567, +94771234567
 */
function normalizeE164LK(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[^\d+]/g, "");

  if (n.startsWith("+")) {
    // +9477...
  } else if (n.startsWith("94")) {
    n = "+" + n;                     // 94xxxx -> +94xxxx
  } else if (n.startsWith("0")) {
    n = "+94" + n.slice(1);          // 0xxxxxxx -> +94xxxxxxx
  } else {
    // assume local without prefixes
    if (n.length >= 9 && n.length <= 10) n = "+94" + n.replace(/^0/, "");
    else if (n.length >= 11 && n.startsWith("94")) n = "+" + n;
  }

  // sanity: +94 and 11–15 chars total
  if (!n.startsWith("+94") || n.length < 12 || n.length > 16) return null;
  return n;
}

/**
 * Send an SMS via SMSLenz.
 * API docs: https://smslenz.lk/developers/api  (endpoint: /send-sms, fields: user_id, api_key, sender_id, contact, message)
 * Returns { ok: boolean, data?: any, error?: string }
 */
export async function sendBookingSms({ to, message }) {
  const contact = normalizeE164LK(to);
  if (!contact) return { ok: false, error: "Invalid phone number format" };

  const url = `${SMS_BASE_URL}/send-sms`;
  const payload = {
    user_id: SMS_USER_ID,
    api_key: SMS_API_KEY,
    sender_id: SMS_SENDER_ID,     // case-sensitive; use 'SMSlenzDEMO' only for testing
    contact,                      // <-- REQUIRED by SMSLenz (NOT 'to')
    message,
  };

  // Prefer x-www-form-urlencoded (most compatible)
  try {
    const form = new URLSearchParams(payload);
    const r = await axios.post(url, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    // If it returns HTTP 2xx, we treat it as success
    if (r.status >= 200 && r.status < 300) return { ok: true, data: r.data };
  } catch (e) {
    // fall through
  }

  // Try JSON POST (some examples suggest JSON is accepted)
  try {
    const r = await axios.post(url, payload, { timeout: 15000 });
    if (r.status >= 200 && r.status < 300) return { ok: true, data: r.data };
  } catch (e) {
    // fall through
  }

  // Try GET with query params
  try {
    const r = await axios.get(url, { params: payload, timeout: 15000 });
    if (r.status >= 200 && r.status < 300) return { ok: true, data: r.data };
  } catch (e) {
    // fall through
  }

  return { ok: false, error: "SMS send failed (non-2xx from provider)" };
}
