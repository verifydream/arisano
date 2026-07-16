import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', err => console.error('Pool error:', err));

export default pool;

export async function resetWinners(groupId) {
  await pool.query('DELETE FROM winners WHERE group_id = $1', [groupId]);
}

// --- Groups ---
export async function getGroupByWaId(waGroupId) {
  const { rows } = await pool.query('SELECT * FROM groups WHERE wa_group_id = $1', [waGroupId]);
  return rows[0] || null;
}

export async function createGroup(waGroupId, groupName, nominal, adminPhone, drawDay = 1) {
  const { rows } = await pool.query(
    `INSERT INTO groups (wa_group_id, group_name, nominal, admin_phone, draw_day)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (wa_group_id) DO UPDATE
     SET group_name = $2, nominal = $3, admin_phone = $4, draw_day = $5
     RETURNING *`,
    [waGroupId, groupName, nominal, adminPhone, drawDay]
  );
  return rows[0];
}

// --- Members ---
export async function getMembers(groupId) {
  const { rows } = await pool.query('SELECT * FROM members WHERE group_id = $1 ORDER BY id', [groupId]);
  return rows;
}

export async function addMember(groupId, name, phone = null) {
  const { rows } = await pool.query(
    `INSERT INTO members (group_id, name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (group_id, name) DO NOTHING RETURNING *`,
    [groupId, name, phone]
  );
  return rows[0] || null;
}

export async function removeMember(groupId, name) {
  const { rows } = await pool.query(
    'DELETE FROM members WHERE group_id = $1 AND name ILIKE $2 RETURNING *',
    [groupId, name]
  );
  return rows[0] || null;
}

// --- Payments ---
export async function getPayments(groupId, month, year) {
  const { rows } = await pool.query(
    `SELECT p.*, m.name FROM payments p
     JOIN members m ON p.member_id = m.id
     WHERE p.group_id = $1 AND p.month = $2 AND p.year = $3`,
    [groupId, month, year]
  );
  return rows;
}

export async function markPaid(groupId, memberName, month, year) {
  const mem = await pool.query(
    'SELECT id FROM members WHERE group_id = $1 AND name ILIKE $2',
    [groupId, memberName]
  );
  if (!mem.rows[0]) return null;

  const { rows } = await pool.query(
    `INSERT INTO payments (group_id, member_id, month, year, verified, paid_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (group_id, member_id, month, year)
     DO UPDATE SET verified = TRUE, paid_at = NOW()
     RETURNING *`,
    [groupId, mem.rows[0].id, month, year]
  );
  return rows[0];
}

// --- Winners ---
export async function getWinners(groupId) {
  const { rows } = await pool.query(
    `SELECT w.*, m.name FROM winners w
     JOIN members m ON w.member_id = m.id
     WHERE w.group_id = $1 ORDER BY w.year DESC, w.month DESC`,
    [groupId]
  );
  return rows;
}

export async function addWinner(groupId, memberId, month, year) {
  const { rows } = await pool.query(
    `INSERT INTO winners (group_id, member_id, month, year)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *`,
    [groupId, memberId, month, year]
  );
  return rows[0];
}
