const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)`);

const stmtGet = db.prepare(`SELECT value FROM store WHERE key = 'state'`);
const stmtSet = db.prepare(`INSERT OR REPLACE INTO store (key, value) VALUES ('state', ?)`);

function getData() {
  const row = stmtGet.get();
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    console.error('Failed to parse stored state:', e.message);
    return null;
  }
}

function saveData(obj) {
  try {
    stmtSet.run(JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error('Failed to save state:', e.message);
    return false;
  }
}

module.exports = { getData, saveData };
