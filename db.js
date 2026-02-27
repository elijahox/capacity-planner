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
  console.log('🌱 Checking if seed needed...');

  // Check for a dedicated seed flag — if present, this DB has been seeded before
  // and we must NEVER overwrite user data regardless of what the state looks like.
  const flagResult = await pool.query(
    "SELECT value FROM store WHERE key = 'seeded'"
  );

  if (flagResult.rows.length > 0) {
    console.log('🌱 Already seeded — skipping (flag found)');
    return;
  }

  // No seed flag — this is a fresh database. Seed it.
  console.log('🌱 Fresh database — seeding with defaults...');
  console.log('🌱 Seed data: squads:', defaultState.squads.length,
    'people:', defaultState.people.length);
  await saveData(defaultState);

  // Write the seed flag so we never seed again
  await pool.query(
    "INSERT INTO store (key, value) VALUES ('seeded', 'true') ON CONFLICT (key) DO NOTHING"
  );

  console.log('🌱 Seed complete and flag written');
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
    console.log('✅ DB write complete');
    return true;
  } catch (e) {
    console.error('❌ Failed to save state:', e.message);
    return false;
  }
}

// Used by tests to reset state between runs
// Also clears the 'seeded' flag so initDB() re-seeds on next test run
async function deleteState() {
  await pool.query(`DELETE FROM store WHERE key IN ('state', 'seeded')`);
}

async function close() {
  await pool.end();
}

module.exports = { initDB, checkHealth, getData, saveData, deleteState, close };
