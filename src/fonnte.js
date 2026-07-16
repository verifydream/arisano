import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.FONNTE_BASE_URL || 'https://api.fonnte.com';
const TOKEN = process.env.FONNTE_TOKEN || '';

export async function sendMessage(phone, text) {
  if (!TOKEN) { console.log('[FONNTE MOCK]', phone, text); return { status: 'mock' }; }
  const res = await fetch(`${BASE}/send`, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: phone, message: text }),
  });
  return res.json();
}

export async function reactMessage(phone, messageId, emoji) {
  if (!TOKEN) return { status: 'mock' };
  const res = await fetch(`${BASE}/react`, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: phone, message_id: messageId, emoji }),
  });
  return res.json();
}
