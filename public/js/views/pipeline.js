// ================================================================
// PIPELINE VIEW
// ================================================================

let _pipelineFilter = 'all';
let _pipelineFilterActive = false;

function setPipelineFilter(v) {
  _pipelineFilter = v;
  _pipelineFilterActive = true;
  renderContent();
}

function fmtBudget(n) {
  if (!n) return '—';
  if (n >= 1000000) {
    const m = n / 1000000;
    return '$' + (m % 1 === 0 ? m : m.toFixed(1)) + 'm';
  }
  return '$' + Math.round(n / 1000) + 'k';
}

function getPipelineStatusClass(s) {
  return { submitted: 'badge-amber', approved: 'badge-blue', in_delivery: 'badge-green', complete: 'badge-grey' }[s] || 'badge-grey';
}

function getPipelineStatusLabel(s) {
  return { submitted: 'Pending', approved: 'Committed', in_delivery: 'Active', complete: 'Complete' }[s] || s;
}

function renderPipeline() {
  if (!_pipelineFilterActive) _pipelineFilter = 'all';
  _pipelineFilterActive = false;
  const filter = _pipelineFilter;

  const list = initiatives.filter(i => {
    const ps = i.pipelineStatus || 'in_delivery';
    return filter === 'all' || ps === filter;
  });

  const ps_counts = { submitted: 0, approved: 0, in_delivery: 0, complete: 0 };
  initiatives.forEach(i => { const ps = i.pipelineStatus || 'in_delivery'; if (ps_counts[ps] !== undefined) ps_counts[ps]++; });

  const btnStyle = 'border-radius:999px';
  return `
    <div class="section-header">
      <div>
        <div class="section-title">Initiative Pipeline</div>
        <div class="section-sub">${initiatives.length} initiatives · ${ps_counts.submitted} pending · ${ps_counts.approved} committed · ${ps_counts.in_delivery} active</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openPipelineModal(null)">+ New Initiative</button>
    </div>

    <div style="display:flex;gap:4px;margin-bottom:18px">
      <button class="btn btn-sm ${filter==='all'         ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPipelineFilter('all')">All</button>
      <button class="btn btn-sm ${filter==='submitted'   ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPipelineFilter('submitted')">Submitted</button>
      <button class="btn btn-sm ${filter==='approved'    ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPipelineFilter('approved')">Approved</button>
      <button class="btn btn-sm ${filter==='in_delivery' ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPipelineFilter('in_delivery')">In Delivery</button>
      <button class="btn btn-sm ${filter==='complete'    ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPipelineFilter('complete')">Complete</button>
    </div>

    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Initiative</th>
            <th>Tier</th>
            <th>Status</th>
            <th>Squads Impacted</th>
            <th>Est. Capacity</th>
            <th>Est. HC</th>
            <th>Budget</th>
            <th>Expected Start</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.length === 0 ? `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:28px">No initiatives match this filter</td></tr>` : ''}
          ${list.map(init => {
            const ps = init.pipelineStatus || 'in_delivery';
            const estCap = Object.entries(init.estimatedCapacity || {}).filter(([,v]) => v > 0);
            const allocs  = Object.entries(init.allocations || {}).filter(([,v]) => v > 0);
            // For squads column: show allocations for active/complete, estimatedCapacity for others
            const squadSource = (ps === 'in_delivery' || ps === 'complete') ? allocs : estCap;
            return `<tr>
              <td><strong>${init.name}</strong>${init.sponsor ? `<div style="font-size:11px;color:var(--text-dim);margin-top:1px">${init.sponsor}</div>` : ''}</td>
              <td><span class="badge ${getTierClass(init.tier)}">${getTierLabel(init.tier)}</span></td>
              <td><span class="badge ${getPipelineStatusClass(ps)}">${getPipelineStatusLabel(ps)}</span></td>
              <td>
                <div style="display:flex;flex-wrap:wrap;gap:4px">
                  ${squadSource.slice(0,4).map(([sqId]) => { const sq = squads.find(s => s.id === sqId); return sq ? `<span class="tag">${sq.name}</span>` : ''; }).join('')}
                  ${squadSource.length > 4 ? `<span class="tag">+${squadSource.length - 4}</span>` : ''}
                  ${squadSource.length === 0 ? '<span style="color:var(--text-dim)">—</span>' : ''}
                </div>
              </td>
              <td>
                <div style="display:flex;flex-wrap:wrap;gap:4px">
                  ${estCap.slice(0,3).map(([sqId, pct]) => { const sq = squads.find(s => s.id === sqId); return sq ? `<span class="tag">${sq.name} ${pct}%</span>` : ''; }).join('')}
                  ${estCap.length > 3 ? `<span class="tag">+${estCap.length - 3}</span>` : ''}
                  ${estCap.length === 0 ? '<span style="color:var(--text-dim)">—</span>' : ''}
                </div>
              </td>
              <td style="font-family:'JetBrains Mono',monospace">${init.estimatedHeadcount || '—'}</td>
              <td style="font-family:'JetBrains Mono',monospace">${fmtBudget(init.budget)}</td>
              <td style="font-family:'JetBrains Mono',monospace">${init.expectedStart ? fmtDate(init.expectedStart) : '—'}</td>
              <td style="font-family:'JetBrains Mono',monospace">${init.expectedDuration ? init.expectedDuration + 'w' : '—'}</td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" onclick="openPipelineModal('${init.id}')">Edit</button>
                  ${ps === 'submitted' ? `<button class="btn btn-sm" style="background:var(--blue-light);color:var(--accent);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;white-space:nowrap" onclick="advancePipelineStatus('${init.id}','approved')">→ Approve</button>` : ''}
                  ${ps === 'approved'  ? `<button class="btn btn-sm" style="background:var(--green-light);color:var(--green);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;white-space:nowrap" onclick="advancePipelineStatus('${init.id}','in_delivery')">→ Activate</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function advancePipelineStatus(initId, newStatus) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  init.pipelineStatus = newStatus;
  // When activating, copy estimatedCapacity → allocations
  if (newStatus === 'in_delivery') {
    const estCap = init.estimatedCapacity || {};
    if (Object.keys(estCap).length > 0) {
      if (!init.allocations) init.allocations = {};
      Object.assign(init.allocations, estCap);
    }
  }
  scheduleSave();
  renderContent();
  renderSidebar();
}

function openPipelineModal(initId) {
  const init = initId ? initiatives.find(i => i.id === initId) : null;
  const ps = init ? (init.pipelineStatus || 'in_delivery') : 'submitted';
  const estCap = init ? (init.estimatedCapacity || {}) : {};

  // Build squad capacity rows grouped by tribe
  const capRows = TRIBES.map(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);
    return `<tr style="background:var(--bg2)">
      <td colspan="2" style="padding:4px 8px;font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:0.05em">${tribe.name.toUpperCase()}</td>
    </tr>` + tribeSquads.map(sq => {
      const pct = estCap[sq.id] || 0;
      return `<tr>
        <td style="padding:4px 8px;font-size:13px">${sq.name}</td>
        <td style="padding:4px 8px"><input class="form-input" type="number" min="0" max="200" style="width:80px;padding:4px 8px" id="ec-${sq.id}" value="${pct || ''}"></td>
      </tr>`;
    }).join('');
  }).join('');

  openModal(`
    <div class="modal-header">
      <div class="modal-title">${init ? 'Edit Initiative' : 'New Initiative'}</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="max-height:65vh;overflow-y:auto">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <div class="form-label">Initiative Name</div>
          <input class="form-input" id="pi-name" value="${init ? init.name : ''}" placeholder="Initiative name">
        </div>
        <div class="form-group">
          <div class="form-label">Tier</div>
          <select class="form-select" id="pi-tier">
            <option value="1" ${(init?.tier||1)===1?'selected':''}>T1 Program</option>
            <option value="2" ${init?.tier===2?'selected':''}>T2 Project</option>
            <option value="3" ${init?.tier===3?'selected':''}>T3 Product</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Pipeline Status</div>
          <select class="form-select" id="pi-pstatus">
            <option value="submitted"   ${ps==='submitted'  ?'selected':''}>Submitted (Pending)</option>
            <option value="approved"    ${ps==='approved'   ?'selected':''}>Approved (Committed)</option>
            <option value="in_delivery" ${ps==='in_delivery'?'selected':''}>In Delivery (Active)</option>
            <option value="complete"    ${ps==='complete'   ?'selected':''}>Complete</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Sponsor</div>
          <input class="form-input" id="pi-sponsor" value="${init?.sponsor||''}" placeholder="e.g. C&amp;S">
        </div>
        <div class="form-group">
          <div class="form-label">Budget ($)</div>
          <input class="form-input" id="pi-budget" type="number" value="${init?.budget||''}" placeholder="e.g. 500000">
        </div>
        <div class="form-group">
          <div class="form-label">Expected Start</div>
          <input class="form-input" id="pi-start" type="date" value="${init?.expectedStart||''}">
        </div>
        <div class="form-group">
          <div class="form-label">Duration (weeks)</div>
          <input class="form-input" id="pi-duration" type="number" value="${init?.expectedDuration||''}" placeholder="e.g. 12">
        </div>
        <div class="form-group">
          <div class="form-label">Est. Headcount</div>
          <input class="form-input" id="pi-hc" type="number" value="${init?.estimatedHeadcount||''}" placeholder="e.g. 5">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <div class="form-label" style="margin-bottom:8px">Estimated Capacity (% per squad)</div>
          <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
            <table class="data-table compact" style="margin:0">
              <thead><tr><th>Squad</th><th>%</th></tr></thead>
              <tbody>${capRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePipelineModal('${initId||''}')">Save</button>
    </div>`);
}

function savePipelineModal(initId) {
  const name = document.getElementById('pi-name').value.trim();
  if (!name) { alert('Please enter an initiative name'); return; }

  const tier             = parseInt(document.getElementById('pi-tier').value);
  const pipelineStatus   = document.getElementById('pi-pstatus').value;
  const sponsor          = document.getElementById('pi-sponsor').value.trim() || null;
  const budget           = parseFloat(document.getElementById('pi-budget').value) || null;
  const expectedStart    = document.getElementById('pi-start').value || null;
  const expectedDuration = parseInt(document.getElementById('pi-duration').value) || null;
  const estimatedHeadcount = parseInt(document.getElementById('pi-hc').value) || null;

  const estimatedCapacity = {};
  squads.forEach(sq => {
    const val = parseInt(document.getElementById('ec-' + sq.id)?.value) || 0;
    if (val > 0) estimatedCapacity[sq.id] = val;
  });

  if (initId) {
    const init = initiatives.find(i => i.id === initId);
    if (init) {
      init.name = name;
      init.tier = tier;
      init.pipelineStatus = pipelineStatus;
      init.sponsor = sponsor;
      init.budget = budget;
      init.expectedStart = expectedStart;
      init.expectedDuration = expectedDuration;
      init.estimatedHeadcount = estimatedHeadcount;
      init.estimatedCapacity = estimatedCapacity;
      if (pipelineStatus === 'in_delivery' && Object.keys(estimatedCapacity).length > 0) {
        if (!init.allocations) init.allocations = {};
        Object.assign(init.allocations, estimatedCapacity);
      }
    }
  } else {
    const newInit = {
      id: 'init_' + Date.now(),
      name,
      tier,
      status: 'Delivery',
      owner: sponsor,
      allocations: pipelineStatus === 'in_delivery' ? { ...estimatedCapacity } : {},
      budget,
      estimatedCapacity,
      estimatedHeadcount,
      expectedStart,
      expectedDuration,
      sponsor,
      pipelineStatus,
    };
    initiatives.push(newInit);
  }

  closeModal();
  scheduleSave();
  renderContent();
  renderSidebar();
}
