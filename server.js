try { require('dotenv').config(); } catch (e) { /* dotenv not installed — Railway injects env vars directly */ }

const express = require('express');
const path = require('path');
const { getData, saveData } = require('./db');

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
app.get('/api/data', (req, res) => {
  const data = getData(); // null if no saved state yet
  res.json({ ok: true, data });
});

// ── Save data ────────────────────────────────────────────────────
app.post('/api/data', (req, res) => {
  const { password, data } = req.body || {};
  if (password !== PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorised' });
  }
  const ok = saveData(data);
  res.json({ ok });
});

// ── Catch-all: serve index.html ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Capacity Planner running on port ${PORT}`);
  });
}

module.exports = app;
