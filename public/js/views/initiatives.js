// ================================================================
// INITIATIVES VIEW
// ================================================================

function renderInitiatives() {
  const tiers = [1,2,3];
  return `
    <div class="section-header">
      <div>
        <div class="section-title">Initiatives</div>
        <div class="section-sub">${initiatives.length} total</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddInitiativeModal()">+ New Initiative</button>
    </div>
    ${tiers.map(tier => {
      const list = initiatives.filter(i => i.tier === tier);
      return `
      <div class="section">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span class="badge ${getTierClass(tier)}">${getTierLabel(tier)}</span>
          <span style="font-size:12px;color:var(--text-muted)">${list.length} initiatives</span>
        </div>
        <div class="card">
          <table class="data-table">
            <thead><tr><th>Initiative</th><th>Status</th><th>Owner</th><th>Squads</th><th>People Equiv.</th><th>Daily Cost</th></tr></thead>
            <tbody>
              ${list.map(init => {
                const allocs = Object.entries(init.allocations||{}).filter(([,v])=>v>0);
                const totalPpl = allocs.reduce((acc,[sqId,pct]) => {
                  const sq = squads.find(s=>s.id===sqId);
                  return acc + (sq ? pct/100*getEffectiveSquadSize(sq.id) : 0);
                }, 0);
                // Rough daily cost: sum contractors in those squads proportionally
                const dailyCost = allocs.reduce((acc,[sqId,pct]) => {
                  const sqConts = people.filter(p=>p.squad===sqId&&p.type!=='perm'&&p.status==='active'&&p.dayRate);
                  return acc + sqConts.reduce((a,p)=>a+p.dayRate*(pct/100),0);
                },0);
                return `<tr>
                  <td><strong>${init.name}</strong></td>
                  <td><span class="badge ${getStatusClass(init.status)}">${init.status}</span></td>
                  <td style="color:var(--text-muted)">${init.owner||'—'}</td>
                  <td>
                    <div style="display:flex;flex-wrap:wrap;gap:4px">
                      ${allocs.slice(0,3).map(([sqId,pct])=>{const sq=squads.find(s=>s.id===sqId);return sq?`<span class="tag">${sq.name} ${pct}%</span>`:''}).join('')}
                      ${allocs.length>3?`<span class="tag">+${allocs.length-3}</span>`:''}
                      ${allocs.length===0?'<span style="color:var(--text-dim)">None</span>':''}
                    </div>
                  </td>
                  <td style="font-family:'JetBrains Mono',monospace">${totalPpl.toFixed(1)}</td>
                  <td style="font-family:'JetBrains Mono',monospace;color:var(--text-muted)">${dailyCost>0?fmtCurrency(Math.round(dailyCost)):'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('')}`;
}

// --- Add initiative modal ---
function openAddInitiativeModal() {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">New Initiative</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <div class="form-label">Name</div>
          <input class="form-input" id="ni-name" placeholder="Initiative name" />
        </div>
        <div class="form-group">
          <div class="form-label">Tier</div>
          <select class="form-select" id="ni-tier">
            <option value="1">T1 — Program</option>
            <option value="2" selected>T2 — Project</option>
            <option value="3">T3 — Product</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Status</div>
          <select class="form-select" id="ni-status">
            <option>Delivery</option>
            <option>Business Case</option>
            <option>Assess</option>
            <option>High Level Design</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addInitiative()">Create Initiative</button>
    </div>`);
}

function addInitiative() {
  const name = document.getElementById('ni-name').value.trim();
  if (!name) { alert('Name is required'); return; }
  initiatives.push({
    id: 'init_' + Date.now(),
    name,
    tier: parseInt(document.getElementById('ni-tier').value),
    status: document.getElementById('ni-status').value,
    owner: 'C&S',
    allocations: {}
  });
  closeModal();
  renderContent();
}
