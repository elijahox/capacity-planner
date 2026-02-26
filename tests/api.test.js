'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// ── Test environment ─────────────────────────────────────────────
// Use TEST_DATABASE_URL if set, otherwise fall back to DATABASE_URL.
// MUST be set before requiring any project module (db.js reads it at load time).
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.PLANNER_PASSWORD = 'testpass';

const app = require('../server.js');
const { initDB, deleteState, close: closeDb } = require('../db.js');

const PORT = 3099;
const PASSWORD = 'testpass';

// ── HTTP helper ──────────────────────────────────────────────────
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Lifecycle ────────────────────────────────────────────────────
let server;

before(async () => {
  await initDB();
  await deleteState(); // ensure each test run starts with no saved state
  await new Promise((resolve) => { server = app.listen(PORT, resolve); });
});

after(async () => {
  await new Promise((resolve) => { server.close(resolve); });
  await closeDb();
});

// ── Tests ────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('returns 200 + { ok: true }', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });
});

describe('POST /api/auth', () => {
  test('returns 200 + { ok: true } with correct password', async () => {
    const res = await request('POST', '/api/auth', { password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  test('returns 401 + { ok: false } with wrong password', async () => {
    const res = await request('POST', '/api/auth', { password: 'wrongpassword' });
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  test('returns 401 with missing password', async () => {
    const res = await request('POST', '/api/auth', {});
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });
});

describe('GET /api/data', () => {
  test('returns { ok: true, data: null } when no state has been saved', async () => {
    const res = await request('GET', '/api/data');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data, null);
  });
});

describe('POST /api/data', () => {
  const testData = {
    squads: [{ id: 's1', name: 'Test Squad', tribeId: 't1' }],
    initiatives: [],
    people: [{ id: 'p1', name: 'Alice', squadId: 's1' }],
    initiativeDates: {},
    workProfiles: {},
    scenarios: [],
  };

  test('returns 401 with wrong password', async () => {
    const res = await request('POST', '/api/data', { password: 'wrong', data: testData });
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  test('returns 200 + { ok: true } with correct password and valid data', async () => {
    const res = await request('POST', '/api/data', { password: PASSWORD, data: testData });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  test('saved data is retrievable via GET /api/data', async () => {
    const res = await request('GET', '/api/data');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.deepEqual(res.body.data, testData);
  });
});
