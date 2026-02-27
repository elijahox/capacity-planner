try { require('dotenv').config(); } catch (e) { /* Railway injects env vars directly */ }

const crypto    = require('crypto');
const express   = require('express');
const path      = require('path');
const helmet    = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { initDB, checkHealth, getData, saveData } = require('./db');

const app      = express();
const PORT     = process.env.PORT || 3000;
const PASSWORD = process.env.PLANNER_PASSWORD || 'ecomm2026';

// ── Security headers ──────────────────────────────────────────────
// CSP: allows 'unsafe-inline' for onclick/onchange handlers in dynamic HTML.
//      Does NOT allow 'unsafe-eval' — eval()/new Function() are blocked.
// COEP disabled: app loads cross-origin resources (Google Fonts etc).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],   // onclick/onchange handlers in dynamic HTML
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com"],
      imgSrc:        ["'self'", "data:"],
      connectSrc:    ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting: brute-force protection on /api/auth ────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many login attempts — try again in 15 minutes' },
});

// ── Timing-safe password comparison ──────────────────────────────
// HMAC normalises both inputs to the same fixed-length digest so that
// crypto.timingSafeEqual can compare them without leaking length info.
function checkPassword(provided, expected) {
  if (typeof provided !== 'string') return false;
  const a = crypto.createHmac('sha256', 'cp_pw_check').update(provided).digest();
  const b = crypto.createHmac('sha256', 'cp_pw_check').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const health = await checkHealth();
  const status = health.ok ? 200 : 503;
  res.status(status).json(health);
});

// ── Auth ─────────────────────────────────────────────────────────
app.post('/api/auth', authLimiter, (req, res) => {
  const { password } = req.body || {};
  if (checkPassword(password, PASSWORD)) {
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
    console.error('GET /api/data error:', e.message);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ── Save data ────────────────────────────────────────────────────
app.post('/api/data', async (req, res) => {
  const { password, data } = req.body || {};
  if (!checkPassword(password, PASSWORD)) {
    return res.status(401).json({ ok: false, error: 'Unauthorised' });
  }
  // Validate that data is a plain object — reject null, strings, arrays etc.
  if (data === undefined || data === null || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: 'data must be a plain object' });
  }
  console.log('💾 State received, saving to DB...',
    'people:', data.people?.length,
    'squads:', data.squads?.length);
  try {
    const ok = await saveData(data);
    if (ok) {
      console.log('✅ State saved to DB successfully');
    } else {
      console.error('❌ saveData returned false');
    }
    res.json({ ok });
  } catch (e) {
    console.error('POST /api/data error:', e.message);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ── Catch-all: serve index.html ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── JSON parse error handler ─────────────────────────────────────
// Must come after all routes; 4-parameter signature is how Express
// identifies error-handling middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }
  next(err);
});

if (require.main === module) {
  async function start() {
    try {
      await initDB();
    } catch (e) {
      console.error('Fatal: could not connect to database:', e.message);
      process.exit(1);
    }
    app.listen(PORT, () => {
      console.log(`Capacity Planner running on port ${PORT}`);
    });
  }
  start();
}

module.exports = app;
