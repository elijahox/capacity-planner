// ================================================================
// SQUADS VIEW
// ================================================================

function renderSquads() {
  if (!selectedSquad) selectedSquad = squads[0].id;
  const sq = squads.find(s => s.id === selectedSquad);
  if (!sq) return '';
  const tribe = TRIBES.find(t => t.id === sq.tribe);
  const { total, breakdown } = getSquadAllocation(sq.id);
  const sqPeople = people.filter(p => p.squad === sq.id && p.status === 'active');
  const hc = sqPeople.length > 0 ? sqPeople.length : sq.size;

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
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;display:flex;align-items:center;gap:10px">
          <div style="width:12px;height:12px;border-radius:50%;background:${tribe.color}"></div>${sq.name}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${tribe.name} Tribe · ${hc} people · ${sqPeople.filter(p=>p.type!=='perm').length} contractors</div>
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
          <span>Headcount: <strong>${hc}</strong></span>
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
  return html;
}

// --- Add allocation modal ---
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
