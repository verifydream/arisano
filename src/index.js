import express from 'express';
import dotenv from 'dotenv';
import { handleCommand } from './bot.js';
import { sendMessage } from './fonnte.js';

dotenv.config();

const app = express();
app.use(express.json());

// --- Health check ---
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'arisano' }));

// --- Fonnte Webhook ---
app.post('/webhook/fonnte', async (req, res) => {
  try {
    const { phone, message, group_id, group_name, is_group } = req.body;

    if (!phone || !message) return res.json({ status: 'ignored' });

    const waGroupId = group_id || phone;
    const reply = await handleCommand(phone, message.trim(), waGroupId, !!is_group, group_name);

    // Bot only replies when there's a command response
    // In group chat, only reply if command matched
    if (reply) {
      await sendMessage(waGroupId, reply);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📒 Arisano bot running on port ${PORT}`);
  console.log(`   Webhook: POST http://0.0.0.0:${PORT}/webhook/fonnte`);
});
