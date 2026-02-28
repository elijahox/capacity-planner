// ================================================================
// SQUADS VIEW
// ================================================================

let _squadsTab = 'overview';

function setSquadsTab(tab) {
  _squadsTab = tab;
  renderContent();
}

function renderSquads() {
  const tabBar = `
    <div style="display:flex;gap:4px;margin-bottom:20px">
      <button class="btn btn-sm ${_squadsTab==='overview'?'btn-primary':'btn-secondary'}" style="border-radius:999px" onclick="setSquadsTab('overview')">Capacity Overview</button>
      <button class="btn btn-sm ${_squadsTab==='heatmap' ?'btn-primary':'btn-secondary'}" style="border-radius:999px" onclick="setSquadsTab('heatmap')">Commitment Heat Map</button>
    </div>`;

  if (_squadsTab === 'heatmap') return tabBar + renderHeatMap();

  // ── Capacity Overview ─────────────────────────────────────────
  if (!selectedSquad) selectedSquad = squads[0].id;
  const sq = squads.find(s => s.id === selectedSquad);
  if (!sq) return tabBar;
  const tribe = TRIBES.find(t => t.id === sq.tribe);
  const { total, breakdown } = getSquadAllocation(sq.id);
  const sqPeople = people.filter(p => (p.squad === sq.id || p.secondarySquad === sq.id) && p.status === 'active');
  const hc = getEffectiveSquadSize(sq.id);
  const committed = getCommittedHeadcount(sq.id);
  const rag = getSquadRAG(sq.id);

  // Build allocation bar
  let barSegs = '', legend = '';
  breakdown.forEach((item, i) => {
    const col = SEG_COLORS[i % SEG_COLORS.length];
    const w = Math.min(item.pct, 100);
    const lbl = item.pct >= 10 ? `${item.pct}%` : '';
    barSegs += `<div class="alloc-segment" style="width:${w}%;background:${col};flex-shrink:0" data-tip="${item.initiative.name}: ${item.pct}%">${lbl}</div>`;
    legend += `<div class="legend-item"><div class="legend-swatch" style="background:${col}"></div>${item.initiative.name}</div>`;
  });
  const rem = Math.max(0, 100 - total);
  if (rem > 0) barSegs += `<div class="alloc-segment" style="flex:1;background:var(--bg2);color:var(--text-dim)">${rem >= 8 ? rem+'%' : ''}</div>`;

  let html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="font-family:'Inter',sans-serif;font-size:22px;font-weight:700;display:flex;align-items:center;gap:10px">
          <div style="width:12px;height:12px;border-radius:50%;background:${tribe.color}"></div>${sq.name}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:4px">${tribe.name} Tribe · ${hc}p actual · ${committed.toFixed(1)}p committed ${ragPill(rag, total)} · ${sqPeople.filter(p=>p.type!=='perm').length} contractors</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddPersonModal('${sq.id}')">+ Add Person</button>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title">Capacity Allocation</div>
        <span class="badge ${utilClass(total)}">${utilLabel(total)} — ${Math.round(total)}%</span>
      </div>
      <div style="padding:16px 18px">
        <div class="alloc-bar-wrap">${barSegs}</div>
        <div class="alloc-legend">${legend}</div>
        <div style="display:flex;gap:20px;margin-top:14px;font-size:12px;color:var(--text-muted)">
          <span>Allocated: <strong style="color:${utilColor(total)}">${Math.round(total)}%</strong></span>
          <span>Free: <strong>${rem}%</strong></span>
          <span>Actual: <strong>${hc}</strong></span>
          <span>Committed: <strong>${committed.toFixed(1)}</strong></span>
          <span>~People on active work: <strong>${(total/100*hc).toFixed(1)}</strong></span>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="section">
        <div class="section-header">
          <div class="section-title" style="font-size:16px">Initiative Allocations</div>
          <button class="btn btn-secondary btn-sm" onclick="openAddAllocationModal('${sq.id}')">+ Add</button>
        </div>
        <div class="card">
          <table class="data-table">
            <thead><tr><th>Initiative</th><th>Tier</th><th>%</th><th>~Ppl</th><th></th></tr></thead>
            <tbody>
              ${breakdown.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No allocations</td></tr>' : ''}
              ${breakdown.map((item, i) => `<tr>
                <td><strong>${item.initiative.name}</strong></td>
                <td><span class="badge ${getTierClass(item.initiative.tier)}">${getTierLabel(item.initiative.tier)}</span></td>
                <td><input class="inline-edit" type="number" value="${item.pct}" min="0" max="100" onchange="updateAlloc('${item.initiative.id}','${sq.id}',this.value)" /></td>
                <td style="font-family:'JetBrains Mono',monospace;color:var(--text-muted)">${(item.pct/100*hc).toFixed(1)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeAlloc('${item.initiative.id}','${sq.id}')">✕</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${total > 100 ? `<div class="alert alert-red" style="margin-top:12px"><div class="alert-icon">⚠️</div><div><strong>Over-allocated by ${Math.round(total-100)}%</strong> — review and rebalance initiatives.</div></div>` : ''}
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title" style="font-size:16px">People in Squad</div>
        </div>
        <div class="card">
          <table class="data-table compact">
            <thead><tr><th>Name</th><th>Role</th><th>Type</th><th>End Date</th></tr></thead>
            <tbody>
              ${sqPeople.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No people linked yet</td></tr>' : ''}
              ${sqPeople.map(p => `<tr onclick="openPersonModal('${p.id}')">
                <td><strong>${p.name}</strong></td>
                <td style="color:var(--text-muted)">${p.role}</td>
                <td><span class="badge ${getTypeClass(p.type)}">${getTypeLabel(p.type)}</span></td>
                <td class="${p.endDate ? getExpiryClass(p.endDate) : ''}">${p.endDate ? getExpiryLabel(p.endDate) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  return tabBar + html;
}

// ── Add allocation modal ──────────────────────────────────────────

function openAddAllocationModal(squadId) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Add Initiative Allocation</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px">
        <div class="form-label">Initiative</div>
        <select class="form-select" id="aa-init">
          ${initiatives.map(i=>`<option value="${i.id}">${i.name} (${getTierLabel(i.tier)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">% of squad capacity</div>
        <input class="form-input" id="aa-pct" type="number" min="0" max="100" placeholder="e.g. 25" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addAllocation('${squadId}')">Add Allocation</button>
    </div>`);
}

function addAllocation(squadId) {
  const initId = document.getElementById('aa-init').value;
  const pct = parseInt(document.getElementById('aa-pct').value);
  if (!initId || isNaN(pct)) { alert('Please select an initiative and enter a %'); return; }
  const init = initiatives.find(i=>i.id===initId);
  if (!init.allocations) init.allocations = {};
  init.allocations[squadId] = pct;
  closeModal();
  renderContent();
  renderSidebar();
}

function updateAlloc(initId, squadId, val) {
  const init = initiatives.find(i=>i.id===initId);
  if (init) { init.allocations[squadId] = parseInt(val)||0; renderContent(); renderSidebar(); }
}

function removeAlloc(initId, squadId) {
  const init = initiatives.find(i=>i.id===initId);
  if (init&&init.allocations) { delete init.allocations[squadId]; renderContent(); renderSidebar(); }
}

// ── Commitment Heat Map ───────────────────────────────────────────

let _hmTips = {};

function showHeatTip(event, tipId) {
  const data = _hmTips[tipId];
  const tip = document.getElementById('hm-tip');
  if (!data || !tip) return;
  let html = `<div style="font-weight:600;margin-bottom:6px">${data.squadName} · ${data.monthLabel}</div>`;
  if (data.committed.length) {
    html += `<div style="color:#94a3b8;font-size:11px;margin-bottom:3px">Committed</div>`;
    html += data.committed.map(x => `<div>${x.name}: ${x.pct}%</div>`).join('');
  } else {
    html += `<div style="color:#94a3b8">No committed work</div>`;
  }
  if (data.pending.length) {
    html += `<div style="color:#f59e0b;font-size:11px;margin-top:8px;margin-bottom:3px">⚠ Pending (at risk)</div>`;
    html += data.pending.map(x => `<div>${x.name}: ${x.pct}%</div>`).join('');
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  tip.style.left = (event.clientX + 14) + 'px';
  tip.style.top  = Math.max(0, event.clientY - 10) + 'px';
}

function hideHeatTip() {
  const tip = document.getElementById('hm-tip');
  if (tip) tip.style.display = 'none';
}

function renderHeatMap() {
  // Build next 12 months starting from current
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    });
  }

  // Reset tip lookup
  _hmTips = {};

  function getInitDateRange(init) {
    const dates = initiativeDates[init.id];
    if (dates?.start && dates?.end) {
      return { start: new Date(dates.start), end: new Date(dates.end) };
    }
    if (init.expectedStart && init.expectedDuration) {
      const s = new Date(init.expectedStart);
      const e = new Date(s.getTime() + init.expectedDuration * 7 * 86400000);
      return { start: s, end: e };
    }
    return null;
  }

  function cellStyle(committed, hasPending) {
    let bg, color, border = '';
    if (committed >= 120) { bg = 'var(--red)'; color = '#fff'; }
    else if (committed >= 100) { bg = 'var(--red-light)'; color = 'var(--red)'; }
    else if (committed >= 85)  { bg = 'var(--green-light)'; color = 'var(--green)'; }
    else if (committed >= 50)  { bg = 'var(--amber-light)'; color = 'var(--amber)'; }
    else                       { bg = 'var(--bg2)'; color = 'var(--text-muted)'; }
    if (hasPending) border = 'border:1.5px dashed var(--amber);';
    return `background:${bg};color:${color};${border}`;
  }

  const rows = TRIBES.map(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);
    const tribeRow = `<tr style="background:var(--bg2)">
      <td colspan="${months.length + 1}" style="padding:5px 10px;font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:0.06em">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${tribe.color};margin-right:5px"></span>${tribe.name.toUpperCase()}
      </td>
    </tr>`;

    const squadRows = tribeSquads.map(sq => {
      const cells = months.map(m => {
        let committed = 0, pending = 0;
        const committedBreakdown = [], pendingBreakdown = [];

        initiatives.forEach(init => {
          const ps = init.pipelineStatus || 'in_delivery';
          const range = getInitDateRange(init);
          if (!range) return;
          if (range.start > m.end || range.end < m.start) return;

          if (ps === 'approved' || ps === 'in_delivery') {
            const pct = (init.allocations || {})[sq.id] || 0;
            if (pct > 0) { committed += pct; committedBreakdown.push({ name: init.name, pct }); }
          } else if (ps === 'submitted') {
            const pct = (init.estimatedCapacity || {})[sq.id] || 0;
            if (pct > 0) { pending += pct; pendingBreakdown.push({ name: init.name, pct }); }
          }
        });

        const tipId = `${sq.id}_${m.year}_${m.month}`;
        _hmTips[tipId] = { squadName: sq.name, monthLabel: m.label, committed: committedBreakdown, pending: pendingBreakdown };
        const hasPending = pending > 0;
        const displayVal = committed > 0 ? `${Math.round(committed)}%` : (hasPending ? '—' : '');
        const pendingIndicator = hasPending ? `<div style="font-size:10px;margin-top:1px">⚠ +${Math.round(pending)}%</div>` : '';

        return `<td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:default;${cellStyle(committed, hasPending)}"
          onmouseenter="showHeatTip(event,'${tipId}')" onmouseleave="hideHeatTip()">
          ${displayVal}${pendingIndicator}
        </td>`;
      }).join('');

      return `<tr>
        <td style="padding:6px 10px;font-size:13px;white-space:nowrap;min-width:130px">${sq.name}</td>
        ${cells}
      </tr>`;
    }).join('');

    return tribeRow + squadRows;
  }).join('');

  return `
    <div id="hm-tip" style="display:none;position:fixed;z-index:1000;background:#1e293b;color:#f8fafc;padding:10px 14px;border-radius:8px;font-size:12px;max-width:280px;pointer-events:none;line-height:1.6;box-shadow:0 4px 20px rgba(0,0,0,0.3)"></div>

    <div style="overflow-x:auto">
      <table class="data-table" style="white-space:nowrap;min-width:900px">
        <thead>
          <tr>
            <th style="min-width:130px">Squad</th>
            ${months.map(m => `<th style="min-width:68px;text-align:center">${m.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="display:flex;gap:10px;margin-top:16px;font-size:12px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text-muted);font-weight:600">Legend:</span>
      <span style="background:var(--bg2);color:var(--text-muted);padding:3px 10px;border-radius:4px">0–49% Under</span>
      <span style="background:var(--amber-light);color:var(--amber);padding:3px 10px;border-radius:4px">50–84% Partial</span>
      <span style="background:var(--green-light);color:var(--green);padding:3px 10px;border-radius:4px">85–99% Healthy</span>
      <span style="background:var(--red-light);color:var(--red);padding:3px 10px;border-radius:4px">100–119% Over</span>
      <span style="background:var(--red);color:#fff;padding:3px 10px;border-radius:4px">120%+ Critical</span>
      <span style="border:1.5px dashed var(--amber);padding:3px 10px;border-radius:4px;color:var(--text-muted)">⚠ Pending risk</span>
    </div>`;
}
