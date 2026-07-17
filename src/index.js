import express from 'express';
import dotenv from 'dotenv';
import { handleCommand } from './bot.js';
import { sendMessage } from './fonnte.js';

dotenv.config();

const app = express();
app.use(express.json());

// --- Health check ---
/**
 * Health check endpoint.
 * @route GET /health
 * @param {express.Request} _ - Express request object.
 * @param {express.Response} res - Express response object.
 * @returns {void}
 */
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'arisano' }));

// --- Fonnte Webhook ---
/**
 * Fonnte Webhook endpoint to receive incoming WhatsApp messages.
 * Parses the incoming message and routes it to the bot command handler.
 * @route POST /webhook/fonnte
 * @param {express.Request} req - Express request object. Expected body includes phone, message, group_id, group_name, and is_group.
 * @param {express.Response} res - Express response object.
 * @returns {Promise<void>}
 */
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
/**
 * Starts the Express server.
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📒 Arisano bot running on port ${PORT}`);
  console.log(`   Webhook: POST http://0.0.0.0:${PORT}/webhook/fonnte`);
});
