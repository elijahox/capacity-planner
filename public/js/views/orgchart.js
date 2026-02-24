// ================================================================
// ORG CHART VIEW — Step 1: Layout + tribe/squad structure
// ================================================================

function renderOrgChart() {
  const activeCount = people.filter(p => p.status === 'active').length;
  return `
    <div class="section-header">
      <div>
        <div class="section-title">Org Chart</div>
        <div class="section-sub">${squads.length} squads · ${activeCount} active people</div>
      </div>
    </div>
    <div style="overflow-x:auto;padding-bottom:24px">
      <div style="display:inline-flex;gap:24px;align-items:flex-start;min-width:max-content;padding:4px 2px">
        ${TRIBES.map(tribe => renderOrgTribeGroup(tribe)).join('')}
      </div>
    </div>`;
}

function renderOrgTribeGroup(tribe) {
  const tribeSquads = squads.filter(s => s.tribe === tribe.id);
  const tribeHC = tribeSquads.reduce((a, s) => a + getEffectiveSquadSize(s.id), 0);
  const c = tribe.color;
  const SQ_W = 192;  // min-width for squad columns
  const GAP = 12;
  const NEW_W = 144; // width for the "+ New Squad" column

  return `
    <div style="display:flex;flex-direction:column">

      <!-- Tribe header node (spans squad area) -->
      <div style="display:flex;gap:${GAP}px;margin-bottom:0">
        <div style="flex:1;background:${c};color:#fff;
                    border-radius:8px 8px 0 0;padding:10px 16px;
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:'Inter',sans-serif;font-weight:700;font-size:14px;letter-spacing:-0.3px">${tribe.name}</span>
          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;opacity:0.75">${tribeSquads.length} squads · ${tribeHC}p</span>
        </div>
        <div style="width:${NEW_W}px;flex-shrink:0"></div>
      </div>

      <!-- Connector row: horizontal bar + vertical drops to each squad -->
      <div style="display:flex;gap:${GAP}px;margin-bottom:0">
        ${tribeSquads.map(() => `
          <div style="flex:1;min-width:${SQ_W}px;height:20px;
                      border-top:2px solid ${c};
                      display:flex;justify-content:center;align-items:flex-start">
            <div style="width:2px;height:18px;background:${c}"></div>
          </div>
        `).join('')}
        <div style="width:${NEW_W}px;flex-shrink:0;height:20px"></div>
      </div>

      <!-- Squad columns row -->
      <div style="display:flex;gap:${GAP}px;align-items:flex-start">
        ${tribeSquads.map(sq => renderOrgSquadCol(sq, tribe, SQ_W)).join('')}

        <!-- New Squad button/form -->
        <div id="new-squad-${tribe.id}"
             style="width:${NEW_W}px;flex-shrink:0;padding-top:10px;
                    display:flex;justify-content:center">
          <button class="btn btn-secondary btn-sm"
                  onclick="orgChartNewSquad('${tribe.id}')">＋ New Squad</button>
        </div>
      </div>

    </div>`;
}

function renderOrgSquadCol(sq, tribe, minW) {
  const hc = getEffectiveSquadSize(sq.id);
  const { total: util } = getSquadAllocation(sq.id);
  const activePeople = people.filter(p => p.squad === sq.id && p.status === 'active');
  const c = tribe.color;

  return `
    <div class="orgchart-squad-col"
         style="flex:1;min-width:${minW}px;
                background:var(--surface);
                border:1px solid var(--border);
                border-top:3px solid ${c};
                border-radius:0 0 8px 8px;"
         data-squad-id="${sq.id}"
         ondragover="orgChartDragOver(event,'${sq.id}','${c}')"
         ondragleave="orgChartDragLeave(event)"
         ondrop="orgChartDrop(event,'${sq.id}')">

      <!-- Squad header -->
      <div style="padding:10px 12px;border-bottom:1px solid var(--border);background:var(--surface2)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div class="orgchart-squad-name"
               data-squad-id="${sq.id}"
               ondblclick="orgChartRenameSquad('${sq.id}',this)"
               title="Double-click to rename"
               style="font-family:'Inter',sans-serif;font-weight:700;font-size:13px;
                      flex:1;cursor:default">${sq.name}</div>
          <span class="badge badge-grey">${hc}p</span>
          <span class="badge ${utilClass(util)}">${util}%</span>
        </div>
        <button class="btn btn-secondary btn-sm" style="width:100%"
                onclick="openAddPersonModal('${sq.id}')">+ Add Person</button>
      </div>

      <!-- Person cards (drop zone) -->
      <div style="padding:8px;min-height:64px;display:flex;flex-direction:column;gap:6px">
        ${activePeople.length === 0
          ? `<div style="text-align:center;padding:14px 0;color:var(--text-dim);font-size:12px">No members</div>`
          : activePeople.map(p => renderOrgPersonCard(p)).join('')}
      </div>
    </div>`;
}

// ── Person cards ──────────────────────────────────────────────
function renderOrgPersonCard(p) {
  const shortType = { perm: 'Perm', contractor: 'Contractor', msp: 'MSP' }[p.type] || p.type;

  // Contract expiry — only for non-perm with an end date
  let expiryHtml = '';
  if (p.type !== 'perm' && p.endDate) {
    const cls = getExpiryClass(p.endDate);
    const lbl = getExpiryLabel(p.endDate);
    expiryHtml = `<div class="${cls}" style="font-size:11px;margin-top:4px;font-family:'JetBrains Mono',monospace">${lbl}</div>`;
  }

  return `
    <div class="orgchart-person-card"
         draggable="true"
         data-person-id="${p.id}"
         ondragstart="orgChartDragStart(event,'${p.id}')"
         ondragend="orgChartDragEnd(event)"
         onclick="openPersonModal('${p.id}')"
         style="background:var(--bg);border:1px solid var(--border);
                border-radius:7px;padding:9px 11px;user-select:none">
      <div style="font-weight:700;font-size:13px;margin-bottom:1px">${p.name}</div>
      <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">${p.role}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <span class="badge ${getTypeClass(p.type)}">${shortType}</span>
        ${expiryHtml}
      </div>
    </div>`;
}

// ── Squad rename ───────────────────────────────────────────────
function orgChartRenameSquad(squadId, el) {
  const sq = squads.find(s => s.id === squadId);
  if (!sq) return;
  const orig = sq.name;

  const input = document.createElement('input');
  input.className = 'form-input';
  input.value = orig;
  input.style.cssText = 'font-size:13px;font-family:"Inter",sans-serif;font-weight:700;padding:3px 6px;width:100%';
  input.onclick = e => e.stopPropagation();
  input.onblur = () => {
    const newName = input.value.trim();
    if (newName && newName !== orig) {
      sq.name = newName;
      scheduleSave();
      renderSidebar();
    }
    el.textContent = sq.name;
    el.ondblclick = () => orgChartRenameSquad(squadId, el);
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = orig; input.blur(); }
    e.stopPropagation();
  };
  el.textContent = '';
  el.appendChild(input);
  input.focus();
  input.select();
}

// ── New squad ──────────────────────────────────────────────────
function orgChartNewSquad(tribeId) {
  const wrap = document.getElementById('new-squad-' + tribeId);
  if (!wrap) return;
  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;width:100%">
      <input class="form-input" id="new-sq-inp-${tribeId}"
             placeholder="Squad name"
             onkeydown="if(event.key==='Enter')orgChartConfirmNewSquad('${tribeId}');
                        if(event.key==='Escape')renderContent();" />
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" style="flex:1"
                onclick="orgChartConfirmNewSquad('${tribeId}')">Add</button>
        <button class="btn btn-secondary btn-sm"
                onclick="renderContent()">✕</button>
      </div>
    </div>`;
  const inp = document.getElementById('new-sq-inp-' + tribeId);
  if (inp) { inp.focus(); }
}

function orgChartConfirmNewSquad(tribeId) {
  const input = document.getElementById('new-sq-inp-' + tribeId);
  if (!input) return;
  const name = input.value.trim();
  if (!name) { alert('Squad name is required'); return; }
  squads.push({ id: 'sq_' + Date.now(), tribe: tribeId, name, size: 0 });
  scheduleSave();
  renderContent();
  renderSidebar();
}

// ── Drag and Drop ──────────────────────────────────────────────
let _orgDragPersonId = null;

function orgChartDragStart(event, personId) {
  _orgDragPersonId = personId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', personId);
  // Defer opacity change so the drag ghost renders at full opacity first
  setTimeout(() => {
    const el = document.querySelector(`.orgchart-person-card[data-person-id="${personId}"]`);
    if (el) el.style.opacity = '0.45';
  }, 0);
}

function orgChartDragEnd(event) {
  // Restore opacity on the dragged card (it may have moved squads, so search broadly)
  document.querySelectorAll('.orgchart-person-card').forEach(el => {
    el.style.opacity = '';
  });
  _orgDragPersonId = null;
  // Clear any lingering drop highlights
  document.querySelectorAll('.orgchart-squad-col').forEach(el => {
    el.style.outline = '';
    el.style.background = '';
  });
}

function orgChartDragOver(event, squadId, color) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const col = event.currentTarget;
  col.style.outline = `2px dashed ${color}`;
  col.style.background = _hexToRgba(color, 0.06);
}

function orgChartDragLeave(event) {
  const col = event.currentTarget;
  // Only clear when the pointer truly leaves the column (not just moves to a child)
  if (!col.contains(event.relatedTarget)) {
    col.style.outline = '';
    col.style.background = '';
  }
}

function orgChartDrop(event, squadId) {
  event.preventDefault();
  const col = event.currentTarget;
  col.style.outline = '';
  col.style.background = '';

  const personId = event.dataTransfer.getData('text/plain') || _orgDragPersonId;
  if (!personId) return;

  const p = people.find(x => x.id === personId);
  if (!p || p.squad === squadId) return;

  p.squad = squadId;
  scheduleSave();
  renderContent();
  renderSidebar();
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
