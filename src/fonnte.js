import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.FONNTE_BASE_URL || 'https://api.fonnte.com';
const TOKEN = process.env.FONNTE_TOKEN || '';

/**
 * Sends a WhatsApp message using the Fonnte API.
 * If the FONNTE_TOKEN is not set, it logs the message to the console (mock mode).
 * @param {string} phone - The target phone number or WhatsApp group ID.
 * @param {string} text - The message text to send.
 * @returns {Promise<object>} The JSON response from the Fonnte API or a mock status object.
 */
export async function sendMessage(phone, text) {
  if (!TOKEN) { console.log('[FONNTE MOCK]', phone, text); return { status: 'mock' }; }
  const res = await fetch(`${BASE}/send`, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: phone, message: text }),
  });
  return res.json();
}

/**
 * Reacts to a specific WhatsApp message using the Fonnte API.
 * If the FONNTE_TOKEN is not set, it returns a mock status.
 * @param {string} phone - The target phone number or WhatsApp group ID.
 * @param {string} messageId - The ID of the message to react to.
 * @param {string} emoji - The emoji to use for the reaction.
 * @returns {Promise<object>} The JSON response from the Fonnte API or a mock status object.
 */
export async function reactMessage(phone, messageId, emoji) {
  if (!TOKEN) return { status: 'mock' };
  const res = await fetch(`${BASE}/react`, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: phone, message_id: messageId, emoji }),
  });
  return res.json();
}
