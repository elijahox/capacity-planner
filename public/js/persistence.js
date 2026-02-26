// ================================================================
// PERSISTENCE & AUTH
// ================================================================

let _sessionPassword = null;
let _saveTimer = null;

function getPassword() { return _sessionPassword; }

function collectState() {
  return {
    squads,
    initiatives,
    people,
    initiativeDates,
    workProfiles,
    tribeLeadership,
  };
}

function applyState(data) {
  if (!data) return;
  if (data.squads)         squads         = data.squads;
  if (data.initiatives)    initiatives    = data.initiatives;
  if (data.people)         people         = data.people;
  if (data.initiativeDates) {
    Object.assign(initiativeDates, data.initiativeDates);
  }
  if (data.workProfiles) {
    Object.assign(workProfiles, data.workProfiles);
  }
  if (data.tribeLeadership) {
    Object.assign(tribeLeadership, data.tribeLeadership);
  }
}

function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(persistSave, 1200);
}

async function persistSave() {
  const pw = getPassword();
  if (!pw) return;
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, data: collectState() }),
    });
    showSaveIndicator();
  } catch(e) {
    console.warn('Save failed:', e);
  }
}

function showSaveIndicator() {
  let el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = '✓ Saved';
  el.style.opacity = '1';
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

// ================================================================
// AUTH SCREEN
// ================================================================

function showAuthScreen() {
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  setTimeout(() => document.getElementById('auth-input')?.focus(), 100);
}

function hideAuthScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-root').style.display = 'flex';
}

async function submitAuth() {
  const pw = document.getElementById('auth-input').value.trim();
  const errEl = document.getElementById('auth-error');
  if (!pw) return;

  const btn = document.getElementById('auth-btn');
  btn.textContent = 'Checking…';
  btn.disabled = true;

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const json = await res.json();
    if (json.ok) {
      _sessionPassword = pw;
      sessionStorage.setItem('cp_pw', pw);
      errEl.style.display = 'none';
      await loadAndInit();
    } else {
      errEl.textContent = 'Incorrect password — try again.';
      errEl.style.display = 'block';
      btn.textContent = 'Enter';
      btn.disabled = false;
      document.getElementById('auth-input').value = '';
      document.getElementById('auth-input').focus();
    }
  } catch(e) {
    errEl.textContent = 'Could not reach server. Please refresh.';
    errEl.style.display = 'block';
    btn.textContent = 'Enter';
    btn.disabled = false;
  }
}

async function loadAndInit() {
  try {
    const res = await fetch('/api/data');
    const json = await res.json();
    if (json.data) applyState(json.data);
  } catch(e) {
    console.warn('Could not load saved data, using defaults.');
  }
  hideAuthScreen();
  renderSidebar();
  renderContent();

  // Poll every 30 seconds and merge changes from other users
  if (!window._pollInterval) {
    window._pollInterval = setInterval(async () => {
      try {
        const r = await fetch('/api/data');
        const j = await r.json();
        if (j.data) { applyState(j.data); renderContent(); renderSidebar(); }
      } catch(e) {}
    }, 30000);
  }
}
