// ================================================================
// PERSISTENCE & AUTH
// ================================================================

const SAVE_DEBOUNCE_MS   = 1200;  // debounce delay before save fires
const SAVE_RETRY_MS      = 3000;  // retry delay after failed save
const SAVE_DEFER_MS      = 500;   // retry delay when save already in-flight
const SAVE_INDICATOR_MS  = 2000;  // how long "✓ Saved" stays visible
const POLL_INTERVAL_MS   = 60000; // remote state polling interval

let _sessionPassword = null;
let _saveTimer = null;
let _pendingSave = false;
let _isSaving = false;
let _initialized = false; // true only after API data has loaded — blocks saves before then

function getPassword() { return _sessionPassword; }

function collectState() {
  return {
    squads,
    initiatives,
    people,
    initiativeDates,
    workProfiles,
    tribeLeadership,
    squadOrder,
    fy27PlannedHeadcount,
  };
}

function applyState(data) {
  if (!data) return;
  // Full replacement for arrays — DB data completely replaces defaults
  if (data.squads)          squads          = data.squads;
  if (data.initiatives) {
    initiatives = data.initiatives;
    // Defensive migration: estimatedRoles → estimates + assignments
    for (const init of initiatives) {
      if (init.estimatedRoles && !init.estimates) {
        init.estimates = [];
        init.assignments = [];
        for (const r of init.estimatedRoles) {
          if (r.personId) {
            init.assignments.push({
              id: r.id || ('asg-' + Date.now() + '-' + Math.random().toString(36).slice(2,6)),
              estimateId: null,
              personId: r.personId,
              role: r.role || '',
              type: r.type || 'contractor',
              allocation: r.allocation != null ? r.allocation : 100,
              dayRate: r.dayRate || 0,
              squad: r.squad || '',
              homeSquad: r.homeSquad || null,
              inBudget: r.inBudget !== false,
            });
          } else {
            init.estimates.push({
              id: r.id || ('est-' + Date.now() + '-' + Math.random().toString(36).slice(2,6)),
              role: r.role || '',
              type: r.type || 'contractor',
              days: r.days || 0,
              dayRate: r.dayRate || 0,
              budget: r.budget || 0,
              squad: r.squad || '',
            });
          }
        }
        delete init.estimatedRoles;
      }
      if (!init.estimates) init.estimates = [];
      if (!init.assignments) init.assignments = [];
      for (const est of init.estimates) {
        if (!est.type) est.type = 'contractor';
      }
      for (const asg of init.assignments) {
        if (asg.allocation === undefined) asg.allocation = 100;
        if (asg.inBudget === undefined) asg.inBudget = true;
        if (asg.personId === undefined) asg.personId = null;
        if (asg.homeSquad === undefined) asg.homeSquad = null;
        if (asg.estimateId === undefined) asg.estimateId = null;
      }
    }
  }
  if (data.people)          people          = data.people;
  // Full replacement for objects — wipe defaults, use only DB data.
  // Object.assign was merging, leaving stale default keys behind.
  if (data.initiativeDates) {
    for (const k in initiativeDates) delete initiativeDates[k];
    Object.assign(initiativeDates, data.initiativeDates);
  }
  if (data.workProfiles) {
    for (const k in workProfiles) delete workProfiles[k];
    Object.assign(workProfiles, data.workProfiles);
  }
  if (data.tribeLeadership) {
    for (const k in tribeLeadership) delete tribeLeadership[k];
    Object.assign(tribeLeadership, data.tribeLeadership);
  }
  if (data.squadOrder) {
    for (const k in squadOrder) delete squadOrder[k];
    Object.assign(squadOrder, data.squadOrder);
  }
  if (data.hasOwnProperty('fy27PlannedHeadcount')) {
    fy27PlannedHeadcount = data.fy27PlannedHeadcount;
  }
}

function scheduleSave() {
  if (!_initialized) {
    console.warn('💾 Save blocked — app not yet initialized');
    return;
  }
  _pendingSave = true;
  clearTimeout(_saveTimer);
  console.log('💾 Save scheduled...');
  _saveTimer = setTimeout(persistSave, SAVE_DEBOUNCE_MS);
}

async function persistSave() {
  const pw = getPassword();
  if (!pw) { console.warn('💾 Save skipped — no password'); return; }
  if (_isSaving) {
    // Don't drop the save — reschedule so it runs after the current one finishes
    console.log('💾 Save deferred — another save in progress');
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(persistSave, SAVE_DEFER_MS);
    return;
  }
  _isSaving = true;
  const state = collectState();
  console.log('💾 Saving state...', 'people:', state.people?.length, 'squads:', state.squads?.length);
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, data: state }),
    });
    if (res.ok) {
      console.log('✅ State saved successfully');
      showSaveIndicator();
      _pendingSave = false;
    } else {
      console.error('❌ Save failed — server returned', res.status);
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(persistSave, SAVE_RETRY_MS);
    }
  } catch(e) {
    console.error('❌ Save failed — network error:', e.message);
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(persistSave, SAVE_RETRY_MS);
  } finally {
    _isSaving = false;
  }
}

function showSaveIndicator() {
  let el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = '✓ Saved';
  el.style.opacity = '1';
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => { el.style.opacity = '0'; }, SAVE_INDICATOR_MS);
}

// ── Emergency save on tab close ──────────────────────────────────
// If there's a pending save when the user closes the tab, fire it
// via sendBeacon so the browser completes it in the background.
window.addEventListener('beforeunload', () => {
  if (!_initialized) return; // never save defaults to DB
  if (_pendingSave || _isSaving) {
    const pw = getPassword();
    if (pw) {
      const blob = new Blob(
        [JSON.stringify({ password: pw, data: collectState() })],
        { type: 'application/json' }
      );
      navigator.sendBeacon('/api/data', blob);
      console.log('💾 Emergency save via sendBeacon');
    }
  }
});

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
    const res = await fetch('/api/data?t=' + Date.now());
    const json = await res.json();
    if (json.data) applyState(json.data);
  } catch(e) {
    console.warn('Could not load saved data, using defaults.');
  }
  // NOW allow saves — data has been loaded (or we're using defaults intentionally)
  _initialized = true;
  hideAuthScreen();
  renderSidebar();
  renderContent();
  if (typeof _highlightActiveNav === 'function') _highlightActiveNav();

  // Poll every 60 seconds and merge changes from other users
  // Clear-and-reset: prevents stale intervals stacking on re-auth
  if (window._pollInterval) clearInterval(window._pollInterval);
  window._pollInterval = setInterval(async () => {
      if (_pendingSave || _isSaving) {
        console.log('Poll skipped — save in progress');
        return;
      }
      try {
        const r = await fetch('/api/data?t=' + Date.now());
        const j = await r.json();
        if (j.data) {
          const orgChart = document.getElementById('orgchart-scroll');
          const scrollLeft = orgChart ? orgChart.scrollLeft : 0;
          const scrollTop = window.scrollY;
          applyState(j.data);
          renderContent();
          renderSidebar();
          requestAnimationFrame(() => {
            const newOrgChart = document.getElementById('orgchart-scroll');
            if (newOrgChart) newOrgChart.scrollLeft = scrollLeft;
            window.scrollTo(0, scrollTop);
          });
        }
      } catch(e) {}
    }, POLL_INTERVAL_MS);
}
