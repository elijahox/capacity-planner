try { require('dotenv').config(); } catch (e) { /* dotenv not installed — Railway injects env vars directly */ }

const express = require('express');
const path = require('path');
const { initDB, getData, saveData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.PLANNER_PASSWORD || 'ecomm2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ── Auth ─────────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body || {};
  if (password === PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Incorrect password' });
  }
});

// ── Load data ────────────────────────────────────────────────────
app.get('/api/data', async (req, res) => {
  try {
    const data = await getData();
    res.json({ ok: true, data });
  } catch (e) {
    console.error('GET /api/data error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ── Save data ────────────────────────────────────────────────────
app.post('/api/data', async (req, res) => {
  const { password, data } = req.body || {};
  if (password !== PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorised' });
  }
  try {
    const ok = await saveData(data);
    res.json({ ok });
  } catch (e) {
    console.error('POST /api/data error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ── Catch-all: serve index.html ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  async function start() {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Capacity Planner running on port ${PORT}`);
    });
  }
  start();
}

module.exports = app;
