const { Pool } = require('pg');
const defaultState = require('./seed');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDB() {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS store (
          key   TEXT PRIMARY KEY,
          value TEXT
        )
      `);
      console.log(`DB connected successfully (attempt ${attempt}/${MAX_RETRIES})`);
      await seedIfEmpty();
      return;
    } catch (e) {
      lastError = e;
      console.error(`DB connection attempt ${attempt}/${MAX_RETRIES} failed: ${e.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  console.error('All DB connection attempts failed. Exiting.');
  throw lastError;
}

async function checkHealth() {
  try {
    await pool.query('SELECT 1');
    return { ok: true, db: 'connected' };
  } catch (e) {
    return { ok: false, db: 'disconnected', error: e.message };
  }
}

async function seedIfEmpty() {
  console.log('=== DB INIT START ===');
  const existing = await getData();

  const isValidState = existing &&
    existing.squads &&
    existing.squads.length > 5 &&
    existing.people &&
    existing.people.length > 10;

  console.log('Existing state:', isValidState ?
    'VALID (squads: ' + existing.squads.length +
    ', people: ' + existing.people.length + ')' :
    'INVALID OR EMPTY — seeding');

  if (!isValidState) {
    await saveData(defaultState);
    console.log('Seed complete. Squads:',
      defaultState.squads.length,
      'People:', defaultState.people.length);
  }
  console.log('=== DB INIT COMPLETE ===');
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

module.exports = { initDB, checkHealth, getData, saveData, deleteState, close };
