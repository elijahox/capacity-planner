const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

async function getData() {
  const res = await pool.query(`SELECT value FROM store WHERE key = 'state'`);
  if (!res.rows.length) return null;
  try {
    return JSON.parse(res.rows[0].value);
  } catch (e) {
    console.error('Failed to parse stored state:', e.message);
    return null;
  }
}

async function saveData(obj) {
  try {
    await pool.query(
      `INSERT INTO store (key, value) VALUES ('state', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(obj)]
    );
    return true;
  } catch (e) {
    console.error('Failed to save state:', e.message);
    return false;
  }
}

// Used by tests to reset state between runs
async function deleteState() {
  await pool.query(`DELETE FROM store WHERE key = 'state'`);
}

async function close() {
  await pool.end();
}

module.exports = { initDB, getData, saveData, deleteState, close };
