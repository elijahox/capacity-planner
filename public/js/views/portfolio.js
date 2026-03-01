// ================================================================
// PORTFOLIO VIEW — combined Pipeline + Initiatives
// ================================================================

let _portfolioFilter = 'all';
let _portfolioFilterActive = false;
let _portfolioExpanded = {}; // { initId: true } for expanded cards
let _portfolioEstimatesUnlocked = {}; // { initId: true } for temporarily unlocked estimates

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
  const estimates = init.estimates || [];
  const assignments = init.assignments || [];
  const allocs = Object.entries(init.allocations || {}).filter(([,v]) => v > 0);

  // Estimate summaries
  const totalRoleBudget = estimates.reduce((a, e) => a + (e.budget || 0), 0);
  const totalRoleDays = estimates.reduce((a, e) => a + (e.days || 0), 0);

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
          ${estimates.length > 0 ? `<span>${estimates.length} estimate${estimates.length !== 1 ? 's' : ''}</span>` : ''}
          ${assignments.length > 0 ? `<span>${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
        ${(() => {
          const useAssignments = (ps === 'in_delivery' || ps === 'approved') && assignments.length > 0;
          let squadPills = [];
          if (useAssignments) {
            const squadAlloc = {};
            assignments.forEach(asg => {
              const person = asg.personId ? people.find(p => p.id === asg.personId) : null;
              const sqId = person ? person.squad : asg.squad;
              if (!sqId) return;
              squadAlloc[sqId] = (squadAlloc[sqId] || 0) + (asg.allocation != null ? asg.allocation : 100);
            });
            const total = Object.values(squadAlloc).reduce((a, v) => a + v, 0);
            if (total > 0) {
              squadPills = Object.entries(squadAlloc)
                .map(([sqId, val]) => ({ sqId, pct: Math.round(val / total * 100) }))
                .sort((a, b) => b.pct - a.pct);
            }
          } else {
            const squadDays = {};
            estimates.forEach(e => {
              if (!e.squad || !e.days) return;
              squadDays[e.squad] = (squadDays[e.squad] || 0) + e.days;
            });
            const total = Object.values(squadDays).reduce((a, v) => a + v, 0);
            if (total > 0) {
              squadPills = Object.entries(squadDays)
                .map(([sqId, val]) => ({ sqId, pct: Math.round(val / total * 100) }))
                .sort((a, b) => b.pct - a.pct);
            }
          }
          return squadPills.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${squadPills.map(({ sqId, pct }) => { const sq = squads.find(s => s.id === sqId); return sq ? `<span class="tag">${sq.name} ${pct}%</span>` : ''; }).join('')}
          </div>` : '';
        })()}
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
  const estimates = init.estimates || [];
  const assignments = init.assignments || [];
  const allocs = Object.entries(init.allocations || {}).filter(([,v]) => v > 0);
  const estCap = Object.entries(init.estimatedCapacity || {}).filter(([,v]) => v > 0);
  const ps = init.pipelineStatus || 'in_delivery';

  // Lock state for estimates
  const isLocked = (ps === 'approved' || ps === 'in_delivery' || ps === 'complete') && !_portfolioEstimatesUnlocked[init.id];

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

  // ── Build unfilled estimates list for assignment linking ──
  const linkedEstimateIds = new Set(assignments.filter(a => a.estimateId).map(a => a.estimateId));

  // Assignment HC equivalent
  const totalAssignedHC = assignments.reduce((a, asg) => a + ((asg.allocation != null ? asg.allocation : 100) / 100), 0);

  // ── Input style constants ──
  const inputStyle = 'width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 6px;font-size:13px;background:var(--bg);color:var(--text)';
  const numStyle = inputStyle + ';text-align:right;font-family:\'JetBrains Mono\',monospace';
  const readonlyStyle = 'width:100%;box-sizing:border-box;border:1px solid transparent;border-radius:4px;padding:4px 6px;font-size:13px;background:transparent;color:var(--text)';
  const readonlyNumStyle = readonlyStyle + ';text-align:right;font-family:\'JetBrains Mono\',monospace';

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

    <!-- ── ESTIMATES (Business Case) ── -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted)">ESTIMATES</div>
      ${isLocked ? `<button style="background:none;border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:11px;cursor:pointer;color:var(--text-muted)" onclick="unlockPortfolioEstimates('${init.id}')" title="Unlock estimates for editing">🔓 Unlock</button>` : ''}
      ${!isLocked && (ps === 'approved' || ps === 'in_delivery' || ps === 'complete') ? `<button style="background:none;border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:11px;cursor:pointer;color:var(--text-muted)" onclick="unlockPortfolioEstimates('${init.id}')" title="Lock estimates">🔒 Lock</button>` : ''}
      <span style="font-size:11px;color:var(--text-dim)">${isLocked ? 'Read-only — locked at approval' : ''}</span>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed">
        <colgroup>
          <col style="width:auto">
          <col style="width:120px">
          <col style="width:66px">
          <col style="width:82px">
          <col style="width:90px">
          <col style="width:150px">
          ${!isLocked ? '<col style="width:30px">' : ''}
        </colgroup>
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Role</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Type</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Days</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Day Rate</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Budget</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Squad</th>
            ${!isLocked ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${estimates.length === 0 ? `<tr><td colspan="${isLocked ? 6 : 7}" style="padding:12px 8px;text-align:center;color:var(--text-dim);font-size:12px">No estimates yet</td></tr>` : ''}
          ${estimates.map((e, idx) => {
            if (isLocked) {
              const sqName = e.squad ? (squads.find(s => s.id === e.squad)?.name || e.squad) : '—';
              const typeLabel = e.type === 'perm' ? 'Perm (OPEX)' : 'Contractor (CAPEX)';
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:4px 8px">${e.role || '—'}</td>
                <td style="padding:4px 8px;font-size:12px;color:var(--text-muted)">${typeLabel}</td>
                <td style="padding:4px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${e.days || 0}</td>
                <td style="padding:4px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${e.dayRate ? '$' + e.dayRate.toLocaleString() : '—'}</td>
                <td style="padding:4px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${e.budget ? portfolioFmtBudget(e.budget) : '—'}</td>
                <td style="padding:4px 8px;font-size:12px;color:var(--text-muted)">${sqName}</td>
              </tr>`;
            }
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 8px"><input type="text" value="${(e.role || '').replace(/"/g, '&quot;')}" placeholder="e.g. Senior Developer" style="${inputStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'role',this.value)"></td>
              <td style="padding:4px 8px"><select style="${inputStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'type',this.value)">
                <option value="contractor"${(e.type || 'contractor') === 'contractor' ? ' selected' : ''}>Contractor (CAPEX)</option>
                <option value="perm"${e.type === 'perm' ? ' selected' : ''}>Permanent (OPEX)</option>
              </select></td>
              <td style="padding:4px 8px"><input type="number" value="${e.days || ''}" min="0" style="${numStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'days',+this.value||0)"></td>
              <td style="padding:4px 8px"><input type="number" value="${e.dayRate || ''}" min="0" style="${numStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'dayRate',+this.value||0)"></td>
              <td style="padding:4px 8px"><input type="number" value="${e.budget || ''}" min="0" style="${numStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'budget',+this.value||0)"></td>
              <td style="padding:4px 8px"><select style="${inputStyle}" onchange="updatePortfolioEstimate('${init.id}',${idx},'squad',this.value)">
                <option value="">— None —</option>
                ${squadOpts.replace(new RegExp(`value="${e.squad}"`), `value="${e.squad}" selected`)}
              </select></td>
              <td style="padding:4px 4px;text-align:center"><button style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:16px;padding:2px 4px" title="Remove" onclick="removePortfolioEstimate('${init.id}',${idx})">&#x2715;</button></td>
            </tr>`;
          }).join('')}
        </tbody>
        ${estimates.length > 0 ? `<tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:600;font-size:12px">
            <td style="padding:6px 8px">Total</td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${estimates.reduce((a, e) => a + (e.days || 0), 0)}</td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${portfolioFmtBudget(estimates.reduce((a, e) => a + (e.budget || 0), 0))}</td>
            <td colspan="${isLocked ? 1 : 2}"></td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
    ${!isLocked ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addPortfolioEstimate('${init.id}')">+ Add Estimate</button>` : ''}

    <!-- ── ASSIGNMENTS (Actual People) ── -->
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-top:18px;margin-bottom:8px">ASSIGNMENTS</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed">
        <colgroup>
          <col style="width:150px">
          <col style="width:auto">
          <col style="width:90px">
          <col style="width:58px">
          <col style="width:76px">
          <col style="width:60px">
          <col style="width:82px">
          <col style="width:120px">
          <col style="width:130px">
          <col style="width:42px">
          <col style="width:30px">
        </colgroup>
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Person</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Role</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Type</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Alloc</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Day Rate</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Days</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Cost</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Squad</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:var(--text-muted)">Fills&nbsp;Est.</th>
            <th style="text-align:center;padding:6px 4px;font-weight:600;font-size:11px;color:var(--text-muted)">In&nbsp;$</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${assignments.length === 0 ? `<tr><td colspan="11" style="padding:12px 8px;text-align:center;color:var(--text-dim);font-size:12px">No assignments yet</td></tr>` : ''}
          ${assignments.map((asg, idx) => {
            const personObj = asg.personId ? people.find(p => p.id === asg.personId) : null;
            const homeSquadLabel = (() => {
              if (!asg.homeSquad || asg.homeSquad === asg.squad) return '';
              const hs = squads.find(s => s.id === asg.homeSquad);
              return hs ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">(from ${hs.name})</div>` : '';
            })();
            const typeLabel = asg.type === 'perm' ? 'Perm' : asg.type === 'msp' ? 'MSP' : 'Contractor';

            // Build unfilled estimates dropdown options — include current link + all unfilled
            const estimateOpts = estimates.map(e => {
              const isFilled = linkedEstimateIds.has(e.id) && asg.estimateId !== e.id;
              if (isFilled) return '';
              const label = (e.role || 'Unnamed') + (e.squad ? ' (' + (squads.find(s => s.id === e.squad)?.name || e.squad) + ')' : '');
              return `<option value="${e.id}"${asg.estimateId === e.id ? ' selected' : ''}>${label}</option>`;
            }).join('');

            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 8px"><select style="${inputStyle}" onchange="assignPortfolioAssignmentPerson('${init.id}',${idx},this.value)">
                <option value="">— Select Person —</option>
                ${people.filter(p => p.status === 'active' && !p.isVacant).sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}"${asg.personId === p.id ? ' selected' : ''}>${p.name}</option>`).join('')}
              </select></td>
              <td style="padding:4px 8px"><input type="text" value="${(asg.role || '').replace(/"/g, '&quot;')}" placeholder="e.g. Developer" style="${inputStyle}" onchange="updatePortfolioAssignment('${init.id}',${idx},'role',this.value)"></td>
              <td style="padding:4px 8px;font-size:12px;color:var(--text-muted)">${typeLabel}${homeSquadLabel}</td>
              <td style="padding:4px 8px"><input type="number" value="${asg.allocation != null ? asg.allocation : 100}" min="0" max="100" placeholder="%" style="${numStyle}" onchange="updatePortfolioAssignment('${init.id}',${idx},'allocation',+this.value||0)"></td>
              <td style="padding:4px 8px"><input type="number" value="${asg.dayRate || ''}" min="0" style="${numStyle}" onchange="updatePortfolioAssignment('${init.id}',${idx},'dayRate',+this.value||0)"></td>
              <td style="padding:4px 8px"><input type="number" value="${asg.days || ''}" min="0" style="${numStyle}" onchange="updatePortfolioAssignment('${init.id}',${idx},'days',+this.value||0)"></td>
              <td style="padding:4px 8px;font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right;color:var(--text-muted)">${asg.days && asg.dayRate ? fmtCurrency(asg.days * asg.dayRate) : '—'}</td>
              <td style="padding:4px 8px;font-size:12px;color:var(--text-muted)">${asg.squad ? (squads.find(s => s.id === asg.squad)?.name || asg.squad) : '—'}</td>
              <td style="padding:4px 8px"><select style="${inputStyle}" onchange="linkAssignmentToEstimate('${init.id}',${idx},this.value)">
                <option value="">— No linked estimate —</option>
                ${estimateOpts}
              </select></td>
              <td style="padding:4px 4px;text-align:center"><input type="checkbox" ${asg.inBudget !== false ? 'checked' : ''} title="In budget" onchange="updatePortfolioAssignment('${init.id}',${idx},'inBudget',this.checked)" style="cursor:pointer"></td>
              <td style="padding:4px 4px;text-align:center"><button style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:16px;padding:2px 4px" title="Remove" onclick="removePortfolioAssignment('${init.id}',${idx})">&#x2715;</button></td>
            </tr>`;
          }).join('')}
        </tbody>
        ${assignments.length > 0 ? (() => {
          const totalAlloc = assignments.reduce((a, asg) => a + (asg.allocation != null ? asg.allocation : 100), 0);
          const totalDays = assignments.reduce((a, asg) => a + (asg.days || 0), 0);
          const totalCost = assignments.reduce((a, asg) => a + (asg.days && asg.dayRate ? asg.days * asg.dayRate : 0), 0);
          return `<tfoot>
          <tr style="border-top:2px solid var(--border);font-weight:600;font-size:12px">
            <td style="padding:6px 8px">Total</td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${totalAlloc}%</td>
            <td style="padding:6px 8px"></td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${totalDays || ''}</td>
            <td style="padding:6px 8px;font-family:'JetBrains Mono',monospace;text-align:right">${totalCost > 0 ? fmtCurrency(totalCost) : '—'}</td>
            <td colspan="4" style="padding:6px 8px;font-size:11px;color:var(--text-muted)">${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} · ${totalAssignedHC.toFixed(1)} HC equiv</td>
          </tr>
        </tfoot>`;
        })() : ''}
      </table>
    </div>
    <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addPortfolioAssignment('${init.id}')">+ Add Assignment</button>
  </div>`;
}

// ── Estimate CRUD ────────────────────────────────────────────────

function addPortfolioEstimate(initId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  if (!init.estimates) init.estimates = [];
  init.estimates.push({
    id: 'est-' + Date.now(),
    role: '',
    type: 'contractor',
    days: 0,
    dayRate: 0,
    budget: 0,
    squad: '',
  });
  _portfolioExpanded[initId] = true;
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function updatePortfolioEstimate(initId, idx, field, value) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.estimates || !init.estimates[idx]) return;
  init.estimates[idx][field] = value;
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function removePortfolioEstimate(initId, idx) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.estimates) return;
  const removedId = init.estimates[idx].id;
  init.estimates.splice(idx, 1);
  // Unlink any assignments that referenced this estimate
  (init.assignments || []).forEach(a => {
    if (a.estimateId === removedId) a.estimateId = null;
  });
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function unlockPortfolioEstimates(initId) {
  _portfolioEstimatesUnlocked[initId] = !_portfolioEstimatesUnlocked[initId];
  _portfolioFilterActive = true;
  renderContent();
}

// ── Assignment CRUD ──────────────────────────────────────────────

function addPortfolioAssignment(initId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  if (!init.assignments) init.assignments = [];
  init.assignments.push({
    id: 'asg-' + Date.now(),
    estimateId: null,
    personId: null,
    role: '',
    type: 'contractor',
    allocation: 100,
    dayRate: 0,
    squad: '',
    homeSquad: null,
    inBudget: false,
  });
  _portfolioExpanded[initId] = true;
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function updatePortfolioAssignment(initId, idx, field, value) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.assignments || !init.assignments[idx]) return;
  init.assignments[idx][field] = value;
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function assignPortfolioAssignmentPerson(initId, idx, personId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.assignments || !init.assignments[idx]) return;
  const asg = init.assignments[idx];
  asg.personId = personId || null;
  if (personId) {
    const person = people.find(p => p.id === personId);
    if (person) {
      asg.role = person.role || '';
      asg.type = (person.type === 'msp' ? 'contractor' : person.type) || 'contractor';
      asg.dayRate = person.dayRate || (person.type === 'perm' ? 750 : asg.dayRate);
      asg.squad = person.squad || '';
      asg.homeSquad = person.squad || null;
    }
  } else {
    asg.squad = '';
    asg.homeSquad = null;
  }
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function linkAssignmentToEstimate(initId, idx, estimateId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.assignments || !init.assignments[idx]) return;
  const asg = init.assignments[idx];
  asg.estimateId = estimateId || null;
  if (estimateId) {
    const est = (init.estimates || []).find(e => e.id === estimateId);
    if (est) {
      if (!asg.squad) asg.squad = est.squad || '';
      asg.inBudget = true;
    }
  }
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

function removePortfolioAssignment(initId, idx) {
  const init = initiatives.find(i => i.id === initId);
  if (!init || !init.assignments) return;
  init.assignments.splice(idx, 1);
  scheduleSave();
  _portfolioFilterActive = true;
  renderContent();
}

// ── Pipeline status transitions ──────────────────────────────────

function advancePortfolioStatus(initId, newStatus) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;

  // Soft prompt when moving to in_delivery with unfilled estimates
  if (newStatus === 'in_delivery') {
    const estimates = init.estimates || [];
    const assignments = init.assignments || [];
    if (estimates.length > 0) {
      const linkedIds = new Set(assignments.filter(a => a.estimateId).map(a => a.estimateId));
      const unfilled = estimates.filter(e => !linkedIds.has(e.id)).length;
      if (unfilled > 0) {
        openModal(`
          <div class="modal-header">
            <div class="modal-title">Unfilled Estimates</div>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin:0 0 12px">${unfilled} of ${estimates.length} estimated role${estimates.length !== 1 ? 's' : ''} are not yet assigned to a person. Move <strong>${init.name}</strong> to In Delivery anyway?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="closeModal();_doAdvanceStatus('${initId}','${newStatus}')">Continue</button>
          </div>`);
        return;
      }
    }
  }

  _doAdvanceStatus(initId, newStatus);
}

function _doAdvanceStatus(initId, newStatus) {
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
          <div class="form-label">Due Date</div>
          <input class="form-input" id="pf-due" type="date" value="${init?.dueDate || ''}">
        </div>
        <div class="form-group">
          <div class="form-label">Duration (weeks)</div>
          <input class="form-input" id="pf-duration" type="number" value="${init?.expectedDuration || ''}" placeholder="e.g. 12">
        </div>
        <div class="form-group">
          <div class="form-label">Est. Headcount</div>
          <input class="form-input" id="pf-hc" type="number" value="${init?.estimatedHeadcount || ''}" placeholder="e.g. 5">
        </div>
        ${(() => {
          if (!init) return '';
          const initEstimates = init.estimates || [];
          const initAssignments = init.assignments || [];
          const initPs = init.pipelineStatus || 'in_delivery';
          const useAsg = (initPs === 'in_delivery' || initPs === 'approved') && initAssignments.length > 0;
          let splitPills = [];
          if (useAsg) {
            const sqAlloc = {};
            initAssignments.forEach(asg => {
              const person = asg.personId ? people.find(p => p.id === asg.personId) : null;
              const sqId = person ? person.squad : asg.squad;
              if (!sqId) return;
              sqAlloc[sqId] = (sqAlloc[sqId] || 0) + (asg.allocation != null ? asg.allocation : 100);
            });
            const tot = Object.values(sqAlloc).reduce((a, v) => a + v, 0);
            if (tot > 0) splitPills = Object.entries(sqAlloc).map(([sqId, val]) => ({ sqId, pct: Math.round(val / tot * 100) })).sort((a, b) => b.pct - a.pct);
          } else {
            const sqDays = {};
            initEstimates.forEach(e => { if (!e.squad || !e.days) return; sqDays[e.squad] = (sqDays[e.squad] || 0) + e.days; });
            const tot = Object.values(sqDays).reduce((a, v) => a + v, 0);
            if (tot > 0) splitPills = Object.entries(sqDays).map(([sqId, val]) => ({ sqId, pct: Math.round(val / tot * 100) })).sort((a, b) => b.pct - a.pct);
          }
          return `<div class="form-group" style="grid-column:1/-1">
            <div class="form-label" style="margin-bottom:8px">Squad Split${splitPills.length > 0 ? ' (' + (useAsg ? 'from assignments' : 'from estimates') + ')' : ''}</div>
            ${splitPills.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px">
              ${splitPills.map(({ sqId, pct }) => { const sq = squads.find(s => s.id === sqId); return sq ? '<span class="tag">' + sq.name + ' ' + pct + '%</span>' : ''; }).join('')}
            </div>` : '<div style="font-size:12px;color:var(--text-dim)">No squad allocation data</div>'}
          </div>`;
        })()}
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
  const dueDate = document.getElementById('pf-due').value || null;
  const expectedDuration = parseInt(document.getElementById('pf-duration').value) || null;
  const estimatedHeadcount = parseInt(document.getElementById('pf-hc').value) || null;

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
      init.dueDate = dueDate;
      init.expectedDuration = expectedDuration;
      init.estimatedHeadcount = estimatedHeadcount;
    }
  } else {
    const newInit = {
      id: 'init_' + Date.now(),
      name,
      tier,
      status,
      owner,
      allocations: {},
      budget,
      estimatedHeadcount,
      expectedStart,
      dueDate,
      expectedDuration,
      sponsor,
      pipelineStatus,
      estimates: [],
      assignments: [],
    };
    initiatives.push(newInit);
  }

  closeModal();
  _portfolioFilterActive = true;
  scheduleSave();
  renderContent();
  renderSidebar();
}
