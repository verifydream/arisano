import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', err => console.error('Pool error:', err));

export default pool;

/**
 * Resets all winners for a specific group, typically called when everyone has won once.
 * @param {number} groupId - The internal ID of the group.
 * @returns {Promise<void>}
 */
export async function resetWinners(groupId) {
  await pool.query('DELETE FROM winners WHERE group_id = $1', [groupId]);
}

// --- Groups ---
/**
 * Retrieves a group by its WhatsApp Group ID.
 * @param {string} waGroupId - The WhatsApp group ID (or phone number).
 * @returns {Promise<object|null>} The group object or null if not found.
 */
export async function getGroupByWaId(waGroupId) {
  const { rows } = await pool.query('SELECT * FROM groups WHERE wa_group_id = $1', [waGroupId]);
  return rows[0] || null;
}

/**
 * Creates a new arisan group or updates an existing one for the given WhatsApp Group ID.
 * @param {string} waGroupId - The WhatsApp group ID.
 * @param {string} groupName - The name of the group.
 * @param {number} nominal - The monthly contribution amount.
 * @param {string} adminPhone - The phone number of the admin creating the group.
 * @param {number} [drawDay=1] - The day of the month for the draw.
 * @returns {Promise<object>} The created or updated group object.
 */
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
/**
 * Retrieves all members for a specific group.
 * @param {number} groupId - The internal ID of the group.
 * @returns {Promise<object[]>} An array of member objects.
 */
export async function getMembers(groupId) {
  const { rows } = await pool.query('SELECT * FROM members WHERE group_id = $1 ORDER BY id', [groupId]);
  return rows;
}

/**
 * Adds a new member to the group.
 * @param {number} groupId - The internal ID of the group.
 * @param {string} name - The name of the new member.
 * @param {string|null} [phone=null] - The phone number of the member (optional).
 * @returns {Promise<object|null>} The added member object, or null if the member already exists.
 */
export async function addMember(groupId, name, phone = null) {
  const { rows } = await pool.query(
    `INSERT INTO members (group_id, name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (group_id, name) DO NOTHING RETURNING *`,
    [groupId, name, phone]
  );
  return rows[0] || null;
}

/**
 * Removes a member from the group by name.
 * @param {number} groupId - The internal ID of the group.
 * @param {string} name - The name of the member to remove.
 * @returns {Promise<object|null>} The removed member object, or null if not found.
 */
export async function removeMember(groupId, name) {
  const { rows } = await pool.query(
    'DELETE FROM members WHERE group_id = $1 AND name ILIKE $2 RETURNING *',
    [groupId, name]
  );
  return rows[0] || null;
}

// --- Payments ---
/**
 * Retrieves payment records for a specific group, month, and year.
 * @param {number} groupId - The internal ID of the group.
 * @param {number} month - The month (1-12).
 * @param {number} year - The year.
 * @returns {Promise<object[]>} An array of payment objects, joined with member names.
 */
export async function getPayments(groupId, month, year) {
  const { rows } = await pool.query(
    `SELECT p.*, m.name FROM payments p
     JOIN members m ON p.member_id = m.id
     WHERE p.group_id = $1 AND p.month = $2 AND p.year = $3`,
    [groupId, month, year]
  );
  return rows;
}

/**
 * Marks a specific member as having paid for a given month and year.
 * @param {number} groupId - The internal ID of the group.
 * @param {string} memberName - The name of the member.
 * @param {number} month - The month (1-12).
 * @param {number} year - The year.
 * @returns {Promise<object|null>} The payment record, or null if the member is not found.
 */
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
/**
 * Retrieves the history of winners for a specific group.
 * @param {number} groupId - The internal ID of the group.
 * @returns {Promise<object[]>} An array of winner objects, ordered by date descending.
 */
export async function getWinners(groupId) {
  const { rows } = await pool.query(
    `SELECT w.*, m.name FROM winners w
     JOIN members m ON w.member_id = m.id
     WHERE w.group_id = $1 ORDER BY w.year DESC, w.month DESC`,
    [groupId]
  );
  return rows;
}

/**
 * Records a member as the winner for a given month and year.
 * @param {number} groupId - The internal ID of the group.
 * @param {number} memberId - The internal ID of the member who won.
 * @param {number} month - The month (1-12).
 * @param {number} year - The year.
 * @returns {Promise<object>} The newly created winner record.
 */
export async function addWinner(groupId, memberId, month, year) {
  const { rows } = await pool.query(
    `INSERT INTO winners (group_id, member_id, month, year)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *`,
    [groupId, memberId, month, year]
  );
  return rows[0];
}
