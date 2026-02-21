// ================================================================
// SCENARIOS VIEW
// ================================================================

function renderScenarios() {
  return `
    <div class="section-header">
      <div>
        <div class="section-title">Scenario Modelling</div>
        <div class="section-sub">Model "what if" changes and see impact across all squads</div>
      </div>
    </div>

    <div class="scenario-panel" style="margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-weight:600;margin-bottom:14px">⚡ Add Scenario Change</div>
      <div class="form-grid">
        <div class="form-group">
          <div class="form-label">Squad</div>
          <select class="form-select" id="sc-squad">
            ${squads.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Change Type</div>
          <select class="form-select" id="sc-type">
            <option value="alloc_add">Add initiative allocation %</option>
            <option value="alloc_remove">Remove initiative allocation %</option>
            <option value="hire">Add headcount (hire)</option>
            <option value="lose">Lose headcount (roll-off/leave)</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Amount (% or people)</div>
          <input class="form-input" id="sc-amount" type="number" min="0" max="100" placeholder="e.g. 20" />
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <div class="form-label">Label / Description</div>
          <input class="form-input" id="sc-label" placeholder="e.g. Rocket extension, 2 new hires" />
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" onclick="applyScenario()" style="width:100%">Apply Scenario →</button>
        </div>
      </div>
    </div>

    ${scenarios.length > 0 ? `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">Active Scenarios (${scenarios.length})</div>
        <button class="btn btn-danger btn-sm" onclick="clearScenarios()">Clear All</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Squad</th><th>Change</th><th>Delta</th><th>Before</th><th>After</th><th></th></tr></thead>
        <tbody>
          ${scenarios.map((s,i) => {
            const sq = squads.find(q=>q.id===s.squadId);
            const { total } = getSquadAllocation(s.squadId);
            const before = total - s.delta;
            return `<tr>
              <td><strong>${sq?sq.name:s.squadId}</strong></td>
              <td style="color:var(--text-muted)">${s.label}</td>
              <td style="font-family:'JetBrains Mono',monospace;color:${s.delta>0?'var(--red)':'var(--green)'}">${s.delta>0?'+':''}${s.delta}%</td>
              <td style="font-family:'JetBrains Mono',monospace">${Math.round(before)}%</td>
              <td><span class="badge ${utilClass(total)}">${Math.round(total)}%</span></td>
              <td><button class="btn btn-danger btn-sm" onclick="removeScenario(${i})">✕</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="section-title" style="font-family:'Syne',sans-serif;font-weight:700;margin-bottom:14px">Snapshot — All Squads</div>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Squad</th><th>Tribe</th><th>Headcount</th><th>Contractors</th><th>Utilisation</th><th>Status</th></tr></thead>
        <tbody>
          ${squads.map(sq => {
            const { total } = getSquadAllocation(sq.id);
            const tribe = TRIBES.find(t=>t.id===sq.tribe);
            const hc = getEffectiveSquadSize(sq.id);
            const conts = people.filter(p=>p.squad===sq.id&&p.type!=='perm'&&p.status==='active').length;
            return `<tr>
              <td><strong>${sq.name}</strong></td>
              <td><span style="display:flex;align-items:center;gap:5px"><div style="width:7px;height:7px;border-radius:50%;background:${tribe.color}"></div>${tribe.name}</span></td>
              <td style="font-family:'JetBrains Mono',monospace">${hc}</td>
              <td style="font-family:'JetBrains Mono',monospace">${conts}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:80px;height:5px;background:var(--bg2);border-radius:3px;overflow:hidden">
                    <div style="width:${Math.min(total,100)}%;height:100%;background:${utilColor(total)};border-radius:3px"></div>
                  </div>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px">${Math.round(total)}%</span>
                </div>
              </td>
              <td><span class="badge ${utilClass(total)}">${utilLabel(total)}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function applyScenario() {
  const squadId = document.getElementById('sc-squad').value;
  const type = document.getElementById('sc-type').value;
  const amount = parseFloat(document.getElementById('sc-amount').value)||0;
  const label = document.getElementById('sc-label').value||'Change';
  const sq = squads.find(s=>s.id===squadId);
  let delta = 0;
  if (type==='alloc_add') delta = amount;
  else if (type==='alloc_remove') delta = -amount;
  else if (type==='hire') delta = sq ? (amount/getEffectiveSquadSize(sq.id))*100 : 0;
  else if (type==='lose') delta = sq ? -(amount/getEffectiveSquadSize(sq.id))*100 : 0;
  scenarios.push({ id: Date.now(), squadId, label, delta: Math.round(delta) });
  renderContent();
  renderSidebar();
}

function removeScenario(i) { scenarios.splice(i,1); renderContent(); renderSidebar(); }
function clearScenarios() { scenarios=[]; renderContent(); renderSidebar(); }
