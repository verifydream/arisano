import { sendMessage } from './fonnte.js';
import * as db from './db.js';

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function fmtRp(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

function nowMY() {
  const d = new Date(Date.now() + 7 * 3600_000);
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Command Router ---
/**
 * Main command router for incoming WhatsApp messages.
 * Parses the command and executes the corresponding handler function.
 * @param {string} phone - The phone number of the sender.
 * @param {string} text - The full text of the incoming message.
 * @param {string} waGroupId - The WhatsApp group ID (or phone number if private).
 * @param {boolean} isGroup - Indicates if the message was sent in a group chat.
 * @param {string} groupName - The name of the WhatsApp group (if applicable).
 * @returns {Promise<any>} The result of the command handler, or null if unknown command.
 */
export async function handleCommand(phone, text, waGroupId, isGroup, groupName) {
  const cmd = text.trim().toLowerCase().split(/\s+/)[0];

  const handlers = {
    '/mulai_arisan': () => handleMulaiArisan(phone, text, waGroupId, groupName),
    '/tambah_anggota': () => handleTambahAnggota(phone, text, waGroupId),
    '/add': () => handleTambahAnggota(phone, text, waGroupId),
    '/hapus_anggota': () => handleHapusAnggota(phone, text, waGroupId),
    '/remove': () => handleHapusAnggota(phone, text, waGroupId),
    '/kocok': () => handleKocok(phone, waGroupId),
    '/undi': () => handleKocok(phone, waGroupId),
    '/bayar': () => handleBayar(phone, text, waGroupId),
    '/rekap': () => handleRekap(phone, waGroupId),
    '/status': () => handleStatus(phone, waGroupId),
    '/help': () => sendHelp(phone),
    '/bantuan': () => sendHelp(phone),
  };

  const handler = handlers[cmd];
  if (handler) return handler();
  return null; // Unknown command — ignore
}

/**
 * Handles the '/mulai_arisan' command to create a new arisan group.
 * @param {string} phone - The phone number of the creator.
 * @param {string} text - The full command text.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @param {string} groupName - The name of the WhatsApp group.
 * @returns {Promise<void>}
 */
async function handleMulaiArisan(phone, text, waGroupId, groupName) {
  const parts = text.trim().split(/\s+/);
  const nominal = parseInt(parts[1]) || 100000;
  const drawDay = parseInt(parts[2]) || 1;

  const group = await db.createGroup(waGroupId, groupName || 'Arisan Baru', nominal, phone, drawDay);

  await sendMessage(phone,
    `✅ *Arisan dibuat!*\n\n` +
    `📋 Grup: ${group.group_name}\n` +
    `💰 Iuran: ${fmtRp(nominal)}/bulan\n` +
    `📅 Hari kocok: Tanggal ${drawDay}\n\n` +
    `Langkah selanjutnya:\n` +
    `1. Tambah anggota: /tambah_anggota Budi Andi Citra\n` +
    `2. Lihat status: /status\n` +
    `3. Mulai kocok: /kocok`
  );
}

/**
 * Handles the '/tambah_anggota' command to add new members to the arisan.
 * @param {string} phone - The phone number of the sender.
 * @param {string} text - The full command text containing member names.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleTambahAnggota(phone, text, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return sendMessage(phone, '❌ Arisan belum dibuat. Ketik /mulai_arisan dulu.');

  const names = text.replace(/\/tambah_anggota|\/add/gi, '').trim().split(/\s*,\s*|\s+/).filter(Boolean);
  if (!names.length) return sendMessage(phone, '❌ Format: /tambah_anggota Budi Andi Citra');

  const added = [];
  for (const name of names) {
    const m = await db.addMember(group.id, name);
    if (m) added.push(name);
  }

  if (added.length) {
    const members = await db.getMembers(group.id);
    await sendMessage(phone,
      `✅ *${added.length} anggota ditambahkan:*\n${added.map(n => `• ${n}`).join('\n')}\n\n` +
      `Total anggota: ${members.length}`
    );
  } else {
    await sendMessage(phone, '⚠️ Semua nama sudah terdaftar.');
  }
}

/**
 * Handles the '/hapus_anggota' command to remove a member from the arisan.
 * @param {string} phone - The phone number of the sender.
 * @param {string} text - The full command text containing the member name.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleHapusAnggota(phone, text, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return sendMessage(phone, '❌ Arisan belum dibuat.');

  const name = text.replace(/\/hapus_anggota|\/remove/gi, '').trim();
  if (!name) return sendMessage(phone, '❌ Format: /hapus_anggota Budi');

  const removed = await db.removeMember(group.id, name);
  if (removed) {
    await sendMessage(phone, `✅ *${removed.name}* dihapus dari arisan.`);
  } else {
    await sendMessage(phone, '❌ Anggota tidak ditemukan.');
  }
}

/**
 * Handles the '/kocok' command to randomly draw a winner for the current month.
 * Ensures that past winners are not drawn again until all members have won, then resets.
 * @param {string} phone - The phone number of the sender.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleKocok(phone, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return sendMessage(phone, '❌ Arisan belum dibuat.');

  const members = await db.getMembers(group.id);
  if (members.length < 2) return sendMessage(phone, '❌ Minimal 2 anggota untuk kocok.');

  const winners = await db.getWinners(group.id);
  const winnerIds = new Set(winners.map(w => w.member_id));

  let eligible = members.filter(m => !winnerIds.has(m.id));
  if (!eligible.length) {
    // All have won — season over, reset
    await db.resetWinners(group.id);
    eligible = members;
  }

  // 🎲 Animasi kocok
  await sendMessage(waGroupId,
    `🎲 *KOCAK ARISAN* 🎲\n\n` +
    `Mengundi dari ${eligible.length} nama...\n` +
    `Yang belum menang: ${eligible.map(m => m.name).join(', ')}`
  );

  await sleep(2000);
  await sendMessage(waGroupId, '⏳ *Mengocok...* 🎰');
  await sleep(1500);

  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  const { month, year } = nowMY();

  await db.addWinner(group.id, winner.id, month, year);

  await sendMessage(waGroupId,
    `🎉🎉🎉 *PEMENANG BULAN ${MONTH_NAMES[month - 1]} ${year}* 🎉🎉🎉\n\n` +
    `🏆 *${winner.name}* 🏆\n\n` +
    `Selamat! Kamu mendapatkan ${fmtRp(group.nominal * members.length)}!\n\n` +
    `📊 Total anggota: ${members.length}\n` +
    `💰 Total kumpulan: ${fmtRp(group.nominal * members.length)}`
  );
}

/**
 * Handles the '/bayar' command to mark a specific member as having paid for the current month.
 * @param {string} phone - The phone number of the sender.
 * @param {string} text - The full command text containing the member name.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleBayar(phone, text, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return;

  const name = text.replace(/\/bayar/gi, '').trim();
  if (!name) return sendMessage(phone, '❌ Format: /bayar Budi');

  const { month, year } = nowMY();
  const payment = await db.markPaid(group.id, name, month, year);

  if (payment) {
    await sendMessage(phone,
      `✅ *${name}* sudah ditandai bayar ${MONTH_NAMES[month - 1]} ${year}.`
    );
  } else {
    await sendMessage(phone, `❌ Anggota *${name}* tidak ditemukan.`);
  }
}

/**
 * Handles the '/rekap' command to display a summary of who has and hasn't paid for the current month.
 * @param {string} phone - The phone number of the sender.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleRekap(phone, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return sendMessage(phone, '❌ Arisan belum dibuat.');

  const members = await db.getMembers(group.id);
  const { month, year } = nowMY();
  const payments = await db.getPayments(group.id, month, year);
  const paidSet = new Set(payments.filter(p => p.verified).map(p => p.name.toLowerCase()));

  const paid = [], unpaid = [];
  for (const m of members) {
    (paidSet.has(m.name.toLowerCase()) ? paid : unpaid).push(m.name);
  }

  const totalKumpulan = members.length * group.nominal;

  await sendMessage(waGroupId,
    `📊 *REKAP ARISAN ${MONTH_NAMES[month - 1]} ${year}*\n\n` +
    `✅ *Sudah bayar (${paid.length}/${members.length}):*\n${paid.length ? paid.map(n => `  ✓ ${n}`).join('\n') : '  (belum ada)'}\n\n` +
    `❌ *Belum bayar (${unpaid.length}):*\n${unpaid.length ? unpaid.map(n => `  ✗ ${n}`).join('\n') : '  (semua sudah bayar!)'}\n\n` +
    `💰 Total kumpulan: ${fmtRp(totalKumpulan)}\n` +
    `💵 Sudah masuk: ${fmtRp(paid.length * group.nominal)}\n` +
    `📋 Belum masuk: ${fmtRp(totalKumpulan - paid.length * group.nominal)}`
  );
}

/**
 * Handles the '/status' command to show the current status and settings of the arisan.
 * @param {string} phone - The phone number of the sender.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @returns {Promise<void|any>}
 */
async function handleStatus(phone, waGroupId) {
  const group = await db.getGroupByWaId(waGroupId);
  if (!group) return sendMessage(phone, '❌ Arisan belum dibuat di grup ini.');

  const members = await db.getMembers(group.id);
  const winners = await db.getWinners(group.id);
  const recentWinners = winners.slice(0, 3);

  await sendMessage(waGroupId,
    `ℹ️ *STATUS ARISAN*\n\n` +
    `📋 Grup: ${group.group_name}\n` +
    `💰 Iuran: ${fmtRp(group.nominal)}/bulan\n` +
    `📅 Hari kocok: Tanggal ${group.draw_day}\n` +
    `👥 Anggota: ${members.length} orang\n\n` +
    (recentWinners.length
      ? `🏆 *Pemenang terakhir:*\n${recentWinners.map(w => `  • ${MONTH_NAMES[w.month - 1]} ${w.year}: ${w.name}`).join('\n')}`
      : '🏆 Belum ada pemenang.')
  );
}

/**
 * Handles the '/help' command to display the available bot commands.
 * @param {string} phone - The phone number to send the help message to.
 * @returns {Promise<void>}
 */
async function sendHelp(phone) {
  await sendMessage(phone,
    `📒 *Arisano — Bot Arisan WhatsApp*\n\n` +
    `Perintah:\n` +
    `• /mulai_arisan [iuran] [hari_kocok] — Buat arisan baru\n` +
    `• /tambah_anggota Budi Andi — Tambah anggota\n` +
    `• /hapus_anggota Budi — Hapus anggota\n` +
    `• /kocok — Undi pemenang bulanan\n` +
    `• /bayar Budi — Tandai sudah bayar\n` +
    `• /rekap — Lihat rekap pembayaran\n` +
    `• /status — Info arisan\n` +
    `• /help — Bantuan ini`
  );
}
