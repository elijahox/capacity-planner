// ================================================================
// APP — view router, sidebar, modals, boot
// ================================================================

let currentView = 'overview';
let selectedSquad = null;
let collapsedTribes = {};

// ── Sidebar ──────────────────────────────────────────────────────

function renderSidebar() {
  const el = document.getElementById('sidebar');
  let html = '';
  TRIBES.forEach(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);
    const totalHC = tribeSquads.reduce((a, s) => a + getEffectiveSquadSize(s.id), 0);
    const isCollapsed = collapsedTribes[tribe.id];
    html += `<div class="sidebar-section">
      <div class="tribe-header" onclick="toggleTribe('${tribe.id}')">
        <div class="tribe-name">
          <div class="tribe-dot" style="background:${tribe.color}"></div>${tribe.name}
        </div>
        <span class="tribe-count">${totalHC}p</span>
      </div>`;
    if (!isCollapsed) {
      tribeSquads.forEach(sq => {
        const { total } = getSquadAllocation(sq.id);
        const active = selectedSquad === sq.id && currentView === 'squads' ? 'active' : '';
        html += `<div class="squad-item ${active}" onclick="goToSquad('${sq.id}')">
          <div class="squad-item-left">
            <div class="util-pip" style="background:${utilColor(total)}"></div>
            <span class="squad-item-name">${sq.name}</span>
          </div>
          <span class="squad-item-size">${getEffectiveSquadSize(sq.id)}</span>
        </div>`;
      });
    }
    html += '</div>';
  });
  el.innerHTML = html;

  // Update contractor watch badge
  const urgent = getContractorsExpiringSoon(30).length;
  const navBtn = document.getElementById('contractors-nav');
  if (navBtn) {
    const existing = navBtn.querySelector('.nav-badge');
    if (existing) existing.remove();
    if (urgent > 0) navBtn.innerHTML += `<span class="nav-badge">${urgent}</span>`;
  }
}

function toggleTribe(id) { collapsedTribes[id] = !collapsedTribes[id]; renderSidebar(); }

function goToSquad(id) {
  selectedSquad = id;
  currentView = 'squads';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-btn')[1].classList.add('active');
  renderContent();
  renderSidebar();
}

// ── View router ──────────────────────────────────────────────────

function showView(view, btn) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderContent();
  renderSidebar();
}

function renderContent() {
  const views = {
    overview:    renderOverview,
    squads:      renderSquads,
    people:      renderPeople,
    orgchart:    renderOrgChart,
    contractors: renderContractorWatch,
    initiatives: renderInitiatives,
    roadmap:     renderRoadmap,
    demand:      renderDemand,
    scenarios:   renderScenarios,
    financials:  renderFinancials,
  };
  document.getElementById('content').innerHTML = (views[currentView] || renderOverview)();
  scheduleSave();
}

// ── Modals ───────────────────────────────────────────────────────

function openModal(html) {
  document.getElementById('modal-inner').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ── Boot ─────────────────────────────────────────────────────────

(async function boot() {
  // Try restoring session password from sessionStorage
  const stored = sessionStorage.getItem('cp_pw');
  if (stored) {
    // Verify it's still valid
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored }),
      });
      const json = await res.json();
      if (json.ok) {
        _sessionPassword = stored;
        await loadAndInit();
        return;
      }
    } catch(e) { /* fall through to auth screen */ }
  }
  showAuthScreen();
})();
