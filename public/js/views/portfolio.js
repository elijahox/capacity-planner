// ================================================================
// PORTFOLIO VIEW — combined Pipeline + Initiatives
// ================================================================

let _portfolioFilter = 'all';
let _portfolioFilterActive = false;
let _portfolioExpanded = {}; // { initId: true } for expanded cards

function setPortfolioFilter(v) {
  _portfolioFilter = v;
  _portfolioFilterActive = true;
  renderContent();
}

function togglePortfolioCard(initId) {
  _portfolioExpanded[initId] = !_portfolioExpanded[initId];
  renderContent();
}

function getPortfolioStatusClass(s) {
  return { submitted: 'badge-blue', approved: 'badge-amber', in_delivery: 'badge-green', complete: 'badge-grey' }[s] || 'badge-grey';
}

function getPortfolioStatusLabel(s) {
  return { submitted: 'Submitted', approved: 'Approved', in_delivery: 'In Delivery', complete: 'Complete' }[s] || s;
}

function portfolioFmtBudget(n) {
  if (!n) return '—';
  if (n >= 1000000) {
    const m = n / 1000000;
    return '$' + (m % 1 === 0 ? m : m.toFixed(1)) + 'm';
  }
  if (n >= 1000) return '$' + Math.round(n / 1000).toLocaleString() + 'k';
  return '$' + n.toLocaleString();
}

function renderPortfolio() {
  if (!_portfolioFilterActive) _portfolioFilter = 'all';
  _portfolioFilterActive = false;
  const filter = _portfolioFilter;

  const filtered = initiatives.filter(i => {
    const ps = i.pipelineStatus || 'in_delivery';
    return filter === 'all' || ps === filter;
  });

  const counts = { all: initiatives.length, submitted: 0, approved: 0, in_delivery: 0, complete: 0 };
  initiatives.forEach(i => { const ps = i.pipelineStatus || 'in_delivery'; if (counts[ps] !== undefined) counts[ps]++; });

  const filterBtn = (key, label) => {
    const active = filter === key;
    return `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}" style="border-radius:999px" onclick="setPortfolioFilter('${key}')">${label} (${counts[key]})</button>`;
  };

  const tiers = [1, 2, 3];

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Portfolio</div>
        <div class="section-sub">${initiatives.length} initiatives · ${counts.submitted} submitted · ${counts.approved} approved · ${counts.in_delivery} in delivery</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openPortfolioModal(null)">+ New Initiative</button>
    </div>

    <div style="display:flex;gap:4px;margin-bottom:18px;flex-wrap:wrap">
      ${filterBtn('all', 'All')}
      ${filterBtn('submitted', 'Submitted')}
      ${filterBtn('approved', 'Approved')}
      ${filterBtn('in_delivery', 'In Delivery')}
      ${filterBtn('complete', 'Complete')}
    </div>

    ${tiers.map(tier => {
      const tierInits = filtered.filter(i => i.tier === tier);
      if (tierInits.length === 0) return '';
      return `
      <div class="section">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span class="badge ${getTierClass(tier)}">${getTierLabel(tier)}</span>
          <span style="font-size:12px;color:var(--text-muted)">${tierInits.length} initiative${tierInits.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${tierInits.map(init => renderPortfolioCard(init)).join('')}
        </div>
      </div>`;
    }).join('')}

    ${filtered.length === 0 ? `<div style="text-align:center;color:var(--text-muted);padding:40px">No initiatives match this filter</div>` : ''}`;
}

function renderPortfolioCard(init) {
  const ps = init.pipelineStatus || 'in_delivery';
  const expanded = _portfolioExpanded[init.id];
  const roles = init.estimatedRoles || [];
  const allocs = Object.entries(init.allocations || {}).filter(([,v]) => v > 0);

  // Role estimate summaries
  const totalRoleBudget = roles.reduce((a, r) => a + (r.budget || 0), 0);
  const totalRoleDays = roles.reduce((a, r) => a + (r.days || 0), 0);

  // People equivalent from allocations (same calc as old initiatives view)
  const totalPpl = allocs.reduce((acc, [sqId, pct]) => {
    const sq = squads.find(s => s.id === sqId);
    return acc + (sq ? pct / 100 * getEffectiveSquadSize(sq.id) : 0);
  }, 0);

  // Status transition button
  let statusBtn = '';
  if (ps === 'submitted') statusBtn = `<button class="btn btn-sm" style="background:var(--blue-light);color:var(--accent);border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;white-space:nowrap" onclick="event.stopPropagation();advancePortfolioStatus('${init.id}','approved')">Approve &rarr;</button>`;
  if (ps === 'approved') statusBtn = `<button class="btn btn-sm" style="background:var(--green-light);color:var(--green);border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;white-space:nowrap" onclick="event.stopPropagation();advancePortfolioStatus('${init.id}','in_delivery')">Activate &rarr;</button>`;
  if (ps === 'in_delivery') statusBtn = `<button class="btn btn-sm" style="background:var(--bg2);color:var(--text-muted);border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;white-space:nowrap" onclick="event.stopPropagation();advancePortfolioStatus('${init.id}','complete')">Complete &rarr;</button>`;

  return `<div class="card" style="padding:0;overflow:hidden">
    <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:flex-start;gap:12px;justify-content:space-between" onclick="togglePortfolioCard('${init.id}')">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <strong style="font-size:15px">${init.name}</strong>
          <span class="badge ${getPortfolioStatusClass(ps)}" style="border-radius:999px">${getPortfolioStatusLabel(ps)}</span>
          <span class="badge ${getTierClass(init.tier)}">${getTierLabel(init.tier)}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-muted)">
          ${init.owner || init.sponsor ? `<span>${[init.owner, init.sponsor].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')}</span>` : ''}
          ${init.expectedStart ? `<span>Start: ${fmtDate(init.expectedStart)}</span>` : ''}
          ${init.expectedDuration ? `<span>${init.expectedDuration}w</span>` : ''}
          ${totalRoleBudget > 0 ? `<span style="font-family:'JetBrains Mono',monospace">${portfolioFmtBudget(totalRoleBudget)}</span>` : ''}
          ${totalRoleDays > 0 ? `<span style="font-family:'JetBrains Mono',monospace">${totalRoleDays} days</span>` : ''}
          ${roles.length > 0 ? `<span>${roles.length} role${roles.length !== 1 ? 's' : ''} estimated</span>` : ''}
        </div>
        ${allocs.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          ${allocs.slice(0, 5).map(([sqId, pct]) => { const sq = squads.find(s => s.id === sqId); return sq ? `<span class="tag">${sq.name} ${pct}%</span>` : ''; }).join('')}
          ${allocs.length > 5 ? `<span class="tag">+${allocs.length - 5}</span>` : ''}
        </div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${statusBtn}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openPortfolioModal('${init.id}')">Edit</button>
        <span style="font-size:16px;color:var(--text-muted);transition:transform 0.15s;transform:rotate(${expanded ? '180' : '0'}deg)">&#9660;</span>
      </div>
    </div>
    ${expanded ? renderPortfolioExpanded(init) : ''}
  </div>`;
}

function renderPortfolioExpanded(init) {
  const roles = init.estimatedRoles || [];
  const allocs = Object.entries(init.allocations || {}).filter(([,v]) => v > 0);
  const estCap = Object.entries(init.estimatedCapacity || {}).filter(([,v]) => v > 0);
  const ps = init.pipelineStatus || 'in_delivery';

  // People equivalent
  const totalPpl = allocs.reduce((acc, [sqId, pct]) => {
    const sq = squads.find(s => s.id === sqId);
    return acc + (sq ? pct / 100 * getEffectiveSquadSize(sq.id) : 0);
  }, 0);

  // Daily cost
  const dailyCost = allocs.reduce((acc, [sqId, pct]) => {
    const sqConts = people.filter(p => p.squad === sqId && p.type !== 'perm' && p.status === 'active' && p.dayRate);
    return acc + sqConts.reduce((a, p) => a + p.dayRate * (pct / 100), 0);
  }, 0);

  const squadOpts = TRIBES.map(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);
    return `<optgroup label="${tribe.name}">${tribeSquads.map(sq => `<option value="${sq.id}">${sq.name}</option>`).join('')}</optgroup>`;
  }).join('');

  return `<div style="border-top:1px solid var(--border);padding:14px 18px;background:var(--bg2)">
    <div style="display:flex;gap:24px;margin-bottom:14px;flex-wrap:wrap;font-size:12px;color:var(--text-muted)">
      ${allocs.length > 0 ? `<span>People equiv: <strong style="color:var(--text)">${totalPpl.toFixed(1)}</strong></span>` : ''}
      ${dailyCost > 0 ? `<span>Daily cost: <strong style="color:var(--text)">${fmtCurrency(Math.round(dailyCost))}</strong></span>` : ''}
      ${init.estimatedHeadcount ? `<span>Est. HC: <strong style="color:var(--text)">${init.estimatedHeadcount}</strong></span>` : ''}
      ${init.budget ? `<span>Init. budget: <strong style="color:var(--text)">${portfolioFmtBudget(init.budget)}</strong></span>` : ''}
    </div>

    ${estCap.length > 0 && (ps === 'submitted' || ps === 'approved') ? `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">ESTIMATED CAPACITY</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${estCap.map(([sqId, pct]) => { const sq = squads.find(s => s.id === sqId); return sq ? `<span class="tag">${sq.name} ${pct}%</span>` : ''; }).join('')}
      </div>
    </div>` : ''}

    <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">ROLE ESTIMATES</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed">
        <colgroup>
          <col style="width:auto">
          <col style="width:86px">
          <col style="width:100px">
          <col style="width:110px">
          <col style="width:160px">
          <col style="width:36px">
        </colgroup>
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Role</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Days</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Day Rate</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Budget</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Squad</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${roles.length === 0 ? `<tr><td colspan="6" style="padding:12px 8px;text-align:center;color:var(--text-dim);font-size:12px">No role estimates yet</td></tr>` : ''}
          ${roles.map((r, idx) => `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:4px 8px"><input type="text" value="${(r.role || '').replace(/"/g, '&quot;')}" placeholder="e.g. Senior Developer" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;background:var(--bg);color:var(--text)" onchange="updatePortfolioRole('${init.id}',${idx},'role',this.value)"></td>
            <td style="padding:4px 8px"><input type="number" value="${r.days || ''}" min="0" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;text-align:right;font-family:'JetBrains Mono',monospace;background:var(--bg);color:var(--text)" onchange="updatePortfolioRole('${init.id}',${idx},'days',+this.value||0)"></td>
            <td style="padding:4px 8px"><input type="number" value="${r.dayRate || ''}" min="0" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;text-align:right;font-family:'JetBrains Mono',monospace;background:var(--bg);color:var(--text)" onchange="updatePortfolioRole('${init.id}',${idx},'dayRate',+this.value||0)"></td>
            <td style="padding:4px 8px"><input type="number" value="${r.budget || ''}" min="0" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;text-align:right;font-family:'JetBrains Mono',monospace;background:var(--bg);color:var(--text)" onchange="updatePortfolioRole('${init.id}',${idx},'budget',+this.value||0)"></td>
            <td style="padding:4px 8px"><select style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;background:var(--bg);color:var(--text)" onchange="updatePortfolioRole('${init.id}',${idx},'squad',this.value)">
              <option value="">— None —</option>
              ${squadOpts.replace(`value="${r.squad}"`, `value="${r.squad}" selected`)}
            </select></td>
            <td style="padding:4px 4px;text-align:center"><button style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:16px;padding:2px 6px" title="Remove" onclick="removePortfolioRole('${init.id}',${idx})">&#x2715;</button></td>
          </tr>`).join('')}
        </tbody>
        ${roles.length > 0 ? `<tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:600;font-size:12px">
            <td style="padding:6px 8px">Total</td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace">${roles.reduce((a, r) => a + (r.days || 0), 0)}</td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace">${portfolioFmtBudget(roles.reduce((a, r) => a + (r.budget || 0), 0))}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
    <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addPortfolioRole('${init.id}')">+ Add Role</button>
  </div>`;
}

// ── Role estimate inline editing ─────────────────────────────────

function addPortfolioRole(initId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  if (!init.estimatedRoles) init.estimatedRoles = [];
  init.estimatedRoles.push({
    id: 'er-' + Date.now(),
    role: '',
    days: 0,
    dayRate: 0,
    budget: 0,
    squad: ''
  });
  _portfolioExpanded[initId] = true;
  scheduleSave();
  renderContent();
}

function updatePortfolioRole(initId, idx, field, value) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.estimatedRoles || !init.estimatedRoles[idx]) return;
  init.estimatedRoles[idx][field] = value;
  scheduleSave();
  // Re-render to update totals but preserve expanded state
  _portfolioFilterActive = true;
  renderContent();
}

function removePortfolioRole(initId, idx) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.estimatedRoles) return;
  init.estimatedRoles.splice(idx, 1);
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

// ── Pipeline status transitions ──────────────────────────────────

function advancePortfolioStatus(initId, newStatus) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  init.pipelineStatus = newStatus;
  // When activating, copy estimatedCapacity -> allocations
  if (newStatus === 'in_delivery') {
    const estCap = init.estimatedCapacity || {};
    if (Object.keys(estCap).length > 0) {
      if (!init.allocations) init.allocations = {};
      Object.assign(init.allocations, estCap);
    }
  }
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
  renderSidebar();
}

// ── Initiative modal ─────────────────────────────────────────────

function openPortfolioModal(initId) {
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
        <td style="padding:4px 8px"><input class="form-input" type="number" min="0" max="200" style="width:80px;padding:4px 8px" id="pf-ec-${sq.id}" value="${pct || ''}"></td>
      </tr>`;
    }).join('');
  }).join('');

  openModal(`
    <div class="modal-header">
      <div class="modal-title">${init ? 'Edit Initiative' : 'New Initiative'}</div>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="max-height:65vh;overflow-y:auto">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <div class="form-label">Initiative Name</div>
          <input class="form-input" id="pf-name" value="${init ? init.name : ''}" placeholder="Initiative name">
        </div>
        <div class="form-group">
          <div class="form-label">Tier</div>
          <select class="form-select" id="pf-tier">
            <option value="1" ${(init?.tier || 1) === 1 ? 'selected' : ''}>T1 Program</option>
            <option value="2" ${init?.tier === 2 ? 'selected' : ''}>T2 Project</option>
            <option value="3" ${init?.tier === 3 ? 'selected' : ''}>T3 Product</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Pipeline Status</div>
          <select class="form-select" id="pf-pstatus">
            <option value="submitted" ${ps === 'submitted' ? 'selected' : ''}>Submitted</option>
            <option value="approved" ${ps === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="in_delivery" ${ps === 'in_delivery' ? 'selected' : ''}>In Delivery</option>
            <option value="complete" ${ps === 'complete' ? 'selected' : ''}>Complete</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Status</div>
          <select class="form-select" id="pf-status">
            <option ${init?.status === 'Delivery' ? 'selected' : ''}>Delivery</option>
            <option ${init?.status === 'Business Case' ? 'selected' : ''}>Business Case</option>
            <option ${init?.status === 'Assess' ? 'selected' : ''}>Assess</option>
            <option ${init?.status === 'High Level Design' ? 'selected' : ''}>High Level Design</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Owner</div>
          <input class="form-input" id="pf-owner" value="${init?.owner || ''}" placeholder="e.g. C&amp;S">
        </div>
        <div class="form-group">
          <div class="form-label">Sponsor</div>
          <input class="form-input" id="pf-sponsor" value="${init?.sponsor || ''}" placeholder="e.g. C&amp;S">
        </div>
        <div class="form-group">
          <div class="form-label">Budget ($)</div>
          <input class="form-input" id="pf-budget" type="number" value="${init?.budget || ''}" placeholder="e.g. 500000">
        </div>
        <div class="form-group">
          <div class="form-label">Expected Start</div>
          <input class="form-input" id="pf-start" type="date" value="${init?.expectedStart || ''}">
        </div>
        <div class="form-group">
          <div class="form-label">Duration (weeks)</div>
          <input class="form-input" id="pf-duration" type="number" value="${init?.expectedDuration || ''}" placeholder="e.g. 12">
        </div>
        <div class="form-group">
          <div class="form-label">Est. Headcount</div>
          <input class="form-input" id="pf-hc" type="number" value="${init?.estimatedHeadcount || ''}" placeholder="e.g. 5">
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
      <button class="btn btn-primary" onclick="savePortfolioModal('${initId || ''}')">Save</button>
    </div>`);
}

function savePortfolioModal(initId) {
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { alert('Please enter an initiative name'); return; }

  const tier = parseInt(document.getElementById('pf-tier').value);
  const pipelineStatus = document.getElementById('pf-pstatus').value;
  const status = document.getElementById('pf-status').value;
  const owner = document.getElementById('pf-owner').value.trim() || null;
  const sponsor = document.getElementById('pf-sponsor').value.trim() || null;
  const budget = parseFloat(document.getElementById('pf-budget').value) || null;
  const expectedStart = document.getElementById('pf-start').value || null;
  const expectedDuration = parseInt(document.getElementById('pf-duration').value) || null;
  const estimatedHeadcount = parseInt(document.getElementById('pf-hc').value) || null;

  const estimatedCapacity = {};
  squads.forEach(sq => {
    const val = parseInt(document.getElementById('pf-ec-' + sq.id)?.value) || 0;
    if (val > 0) estimatedCapacity[sq.id] = val;
  });

  if (initId) {
    const init = initiatives.find(i => i.id === initId);
    if (init) {
      init.name = name;
      init.tier = tier;
      init.pipelineStatus = pipelineStatus;
      init.status = status;
      init.owner = owner;
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
      status,
      owner,
      allocations: pipelineStatus === 'in_delivery' ? { ...estimatedCapacity } : {},
      budget,
      estimatedCapacity,
      estimatedHeadcount,
      expectedStart,
      expectedDuration,
      sponsor,
      pipelineStatus,
      estimatedRoles: [],
    };
    initiatives.push(newInit);
  }

  closeModal();
  _portfolioFilterActive = true;
  scheduleSave();
  renderContent();
  renderSidebar();
}
