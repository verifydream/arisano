import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (
  id            SERIAL PRIMARY KEY,
  wa_group_id   TEXT UNIQUE NOT NULL,
  group_name    TEXT NOT NULL,
  nominal       INTEGER NOT NULL DEFAULT 100000,
  admin_phone   TEXT NOT NULL,
  draw_day      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  is_winner     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name)
);

CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  member_id     INTEGER REFERENCES members(id) ON DELETE CASCADE,
  month         INTEGER NOT NULL,
  year          INTEGER NOT NULL,
  verified      BOOLEAN DEFAULT FALSE,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, member_id, month, year)
);

CREATE TABLE IF NOT EXISTS winners (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  member_id     INTEGER REFERENCES members(id) ON DELETE CASCADE,
  month         INTEGER NOT NULL,
  year          INTEGER NOT NULL,
  drawn_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, month, year)
);
`;

async function migrate() {
  await pool.query(SCHEMA);
  console.log('✅ Database migrated successfully');
  await pool.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
