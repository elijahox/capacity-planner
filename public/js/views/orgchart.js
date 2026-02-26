// ================================================================
// ORG CHART VIEW
// ================================================================

// ── Drag state ────────────────────────────────────────────────
let _orgDragPersonId = null;
let _orgDragSourceSlot = null; // { tribeId, slotIdx } when dragging from a leadership slot
let _orgDropTargetId = null;   // personId of card currently hovered during drag
let _orgDropPosition = null;   // 'before' | 'after' relative to target card

// ── Drag-to-scroll state ──────────────────────────────────────
let _orgScrollRAF = null;
let _orgMouseX = 0;
let _orgMouseY = 0;

function _orgTrackMouse(e) {
  _orgMouseX = e.clientX;
  _orgMouseY = e.clientY;
}

function _orgScrollLoop() {
  const EDGE = 120;
  const FAST = 10;
  const SLOW = 4;

  // Horizontal: scroll the org chart overflow container
  const hEl = document.getElementById('orgchart-scroll');
  if (hEl) {
    const r = hEl.getBoundingClientRect();
    if (_orgMouseY >= r.top && _orgMouseY <= r.bottom) {
      const dLeft  = _orgMouseX - r.left;
      const dRight = r.right - _orgMouseX;
      if (dLeft  >= 0 && dLeft  < EDGE) hEl.scrollLeft -= dLeft  < EDGE / 2 ? FAST : SLOW;
      else if (dRight >= 0 && dRight < EDGE) hEl.scrollLeft += dRight < EDGE / 2 ? FAST : SLOW;
    }
  }

  // Vertical: scroll the main content pane
  const vEl = document.getElementById('content');
  if (vEl) {
    const r = vEl.getBoundingClientRect();
    if (_orgMouseX >= r.left && _orgMouseX <= r.right) {
      const dTop    = _orgMouseY - r.top;
      const dBottom = r.bottom - _orgMouseY;
      if (dTop    >= 0 && dTop    < EDGE) vEl.scrollTop -= dTop    < EDGE / 2 ? FAST : SLOW;
      else if (dBottom >= 0 && dBottom < EDGE) vEl.scrollTop += dBottom < EDGE / 2 ? FAST : SLOW;
    }
  }

  _orgScrollRAF = requestAnimationFrame(_orgScrollLoop);
}

// ── Top-level render ──────────────────────────────────────────
function renderOrgChart() {
  const activeCount = people.filter(p => p.status === 'active').length;
  return `
    <div class="section-header">
      <div>
        <div class="section-title">Org Chart</div>
        <div class="section-sub">${squads.length} squads · ${activeCount} active people</div>
      </div>
    </div>
    <div id="orgchart-scroll" style="overflow-x:auto;padding-bottom:24px">
      <div style="display:inline-flex;gap:24px;align-items:flex-start;min-width:max-content;padding:4px 2px">
        ${TRIBES.map(tribe => renderOrgTribeGroup(tribe)).join('')}
      </div>
    </div>`;
}

// ── Tribe group ───────────────────────────────────────────────
function renderOrgTribeGroup(tribe) {
  const tribeSquads = squads.filter(s => s.tribe === tribe.id);
  const tribeHC = tribeSquads.reduce((a, s) => a + getEffectiveSquadSize(s.id), 0);
  const c = tribe.color;
  const SQ_W = 192;
  const GAP = 12;
  const NEW_W = 144;

  return `
    <div style="display:flex;flex-direction:column">

      <!-- Tribe header node -->
      <div style="display:flex;gap:${GAP}px;margin-bottom:0">
        <div style="flex:1;background:${c};color:#fff;
                    border-radius:8px 8px 0 0;padding:10px 16px;
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:'Inter',sans-serif;font-weight:700;font-size:14px;letter-spacing:-0.3px">${tribe.name}</span>
          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;opacity:0.75">${tribeSquads.length} squads · ${tribeHC}p</span>
        </div>
        <div style="width:${NEW_W}px;flex-shrink:0"></div>
      </div>

      <!-- Leadership row -->
      ${renderOrgLeadershipRow(tribe, GAP, NEW_W)}

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

// ── Leadership row ────────────────────────────────────────────
function renderOrgLeadershipRow(tribe, GAP, NEW_W) {
  const slots = tribeLeadership[tribe.id] || [null, null, null, null];
  const SLOT_COUNT = 4;

  const slotsHtml = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const personId = slots[i] || null;
    const p = personId ? people.find(x => x.id === personId && x.status === 'active') : null;
    if (p) {
      return renderOrgLeaderCard(p, tribe.id, i);
    }
    return `
      <div style="flex:1;min-width:130px;border:1.5px dashed var(--border-strong);
                  border-radius:7px;padding:10px;min-height:54px;
                  display:flex;align-items:center;justify-content:center;
                  color:var(--text-dim);font-size:11px;font-family:'JetBrains Mono',monospace;
                  transition:background 0.15s,border-color 0.15s;cursor:default"
           data-lead-slot="${tribe.id}_${i}"
           ondragover="orgChartLeaderDragOver(event,'${tribe.id}',${i})"
           ondragleave="orgChartLeaderDragLeave(event)"
           ondrop="orgChartLeaderDrop(event,'${tribe.id}',${i})">
        ＋ Drop leader here
      </div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:${GAP}px;
                background:var(--bg2);
                border-left:1px solid var(--border);
                border-right:1px solid var(--border);
                border-bottom:1px solid var(--border);
                padding:10px 12px">
      <!-- Label -->
      <div style="flex-shrink:0;writing-mode:initial;padding-right:4px">
        <span style="font-size:10px;font-family:'JetBrains Mono',monospace;
                     color:var(--text-dim);text-transform:uppercase;letter-spacing:2px">Leadership</span>
      </div>
      <!-- 4 slots -->
      <div style="display:flex;gap:8px;flex:1">
        ${slotsHtml}
      </div>
      <!-- Spacer to match new-squad col -->
      <div style="width:${NEW_W}px;flex-shrink:0"></div>
    </div>`;
}

function renderOrgLeaderCard(p, tribeId, slotIdx) {
  const shortType = { perm: 'Perm', contractor: 'Contractor', msp: 'MSP' }[p.type] || p.type;
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
         data-lead-slot="${tribeId}_${slotIdx}"
         ondragstart="orgChartDragStart(event,'${p.id}','${tribeId}',${slotIdx})"
         ondragend="orgChartDragEnd(event)"
         ondragover="orgChartLeaderDragOver(event,'${tribeId}',${slotIdx})"
         ondragleave="orgChartLeaderDragLeave(event)"
         ondrop="orgChartLeaderDrop(event,'${tribeId}',${slotIdx})"
         onclick="openPersonModal('${p.id}')"
         style="flex:1;min-width:130px;background:var(--bg);border:1px solid var(--border);
                border-radius:7px;padding:9px 11px;user-select:none;position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-bottom:1px">
        <div>
          <div style="font-weight:700;font-size:13px">${p.name}</div>
          <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">${p.role}</div>
        </div>
        <button onclick="orgChartClearLeaderSlot(event,'${tribeId}',${slotIdx})"
                style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                       font-size:13px;padding:0 2px;line-height:1;flex-shrink:0"
                title="Remove from leadership">✕</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <span class="badge ${getTypeClass(p.type)}">${shortType}</span>
        ${expiryHtml}
      </div>
    </div>`;
}

function orgChartClearLeaderSlot(event, tribeId, slotIdx) {
  event.stopPropagation();
  if (!tribeLeadership[tribeId]) tribeLeadership[tribeId] = [null, null, null, null];
  tribeLeadership[tribeId][slotIdx] = null;
  scheduleSave();
  renderContent();
}

// ── Squad column ──────────────────────────────────────────────
function renderOrgSquadCol(sq, tribe, minW) {
  const hc = getEffectiveSquadSize(sq.id);
  const { total: util } = getSquadAllocation(sq.id);
  const c = tribe.color;

  // Sort active members by squadOrder; unlisted members go to end
  let activePeople = people.filter(p => p.squad === sq.id && p.status === 'active');
  const order = squadOrder[sq.id] || [];
  activePeople = activePeople.slice().sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });

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
          <div style="flex:1;display:flex;align-items:center;gap:4px;min-width:0">
            <div class="orgchart-squad-name"
                 id="squad-name-${sq.id}"
                 ondblclick="orgChartRenameSquad('${sq.id}',this)"
                 title="Double-click to rename"
                 style="font-family:'Inter',sans-serif;font-weight:700;font-size:13px;
                        cursor:default;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sq.name}</div>
            <button class="squad-edit-pencil"
                    onclick="orgChartRenameSquadBtn('${sq.id}')"
                    style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                           font-size:12px;padding:0 2px;line-height:1;flex-shrink:0;opacity:0;
                           transition:opacity 0.1s"
                    title="Rename squad">✏</button>
          </div>
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

// ── Person card ───────────────────────────────────────────────
function renderOrgPersonCard(p) {
  const shortType = { perm: 'Perm', contractor: 'Contractor', msp: 'MSP' }[p.type] || p.type;
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
         ondragstart="orgChartDragStart(event,'${p.id}',null,null)"
         ondragend="orgChartDragEnd(event)"
         ondragover="orgChartCardDragOver(event,'${p.id}','${p.squad}')"
         ondragleave="orgChartCardDragLeave(event)"
         ondrop="orgChartCardDrop(event,'${p.id}','${p.squad}')"
         onclick="openPersonModal('${p.id}')"
         style="background:var(--bg);border:1px solid var(--border);
                border-radius:7px;padding:9px 11px;user-select:none;position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-bottom:1px">
        <div id="person-name-display-${p.id}"
             style="font-weight:700;font-size:13px;flex:1">${p.name}</div>
        <button class="person-edit-pencil"
                onclick="orgChartEditPersonName('${p.id}',event)"
                style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                       font-size:12px;padding:0 2px;line-height:1;flex-shrink:0;opacity:0;
                       transition:opacity 0.1s"
                title="Edit name">✏</button>
      </div>
      <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">${p.role}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <span class="badge ${getTypeClass(p.type)}">${shortType}</span>
        ${expiryHtml}
      </div>
    </div>`;
}

// ── Inline person name edit ───────────────────────────────────
function orgChartEditPersonName(personId, event) {
  event.stopPropagation();
  const p = people.find(x => x.id === personId);
  if (!p) return;
  const orig = p.name;
  const nameEl = document.getElementById('person-name-display-' + personId);
  if (!nameEl) return;

  const input = document.createElement('input');
  input.value = orig;
  input.style.cssText = 'font-size:13px;font-family:"Inter",sans-serif;font-weight:700;' +
    'padding:1px 4px;width:100%;border:1px solid var(--accent);border-radius:4px;' +
    'outline:none;background:var(--surface);box-sizing:border-box';
  input.onclick = e => e.stopPropagation();
  input.onblur = () => {
    const newName = input.value.trim();
    if (newName && newName !== orig) {
      p.name = newName;
      scheduleSave();
    }
    nameEl.textContent = p.name;
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = orig; input.blur(); }
    e.stopPropagation();
  };
  nameEl.textContent = '';
  nameEl.appendChild(input);
  input.focus();
  input.select();
}

// ── Squad rename ───────────────────────────────────────────────
function orgChartRenameSquad(squadId, el) {
  _orgChartRenameSquadInner(squadId, el);
}

function orgChartRenameSquadBtn(squadId) {
  const el = document.getElementById('squad-name-' + squadId);
  if (el) _orgChartRenameSquadInner(squadId, el);
}

function _orgChartRenameSquadInner(squadId, el) {
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

// ── Drag and Drop (squad columns) ─────────────────────────────
function orgChartDragStart(event, personId, fromTribeId, fromSlotIdx) {
  _orgDragPersonId = personId;
  _orgDragSourceSlot = (fromTribeId !== null && fromTribeId !== 'null' && fromSlotIdx !== null)
    ? { tribeId: fromTribeId, slotIdx: Number(fromSlotIdx) }
    : null;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', personId);
  setTimeout(() => {
    document.querySelectorAll(`.orgchart-person-card[data-person-id="${personId}"]`)
      .forEach(el => { el.style.opacity = '0.5'; el.style.transform = 'scale(0.95)'; });
  }, 0);

  // Start drag-to-scroll
  document.addEventListener('dragover', _orgTrackMouse);
  _orgScrollRAF = requestAnimationFrame(_orgScrollLoop);
}

function orgChartDragEnd(event) {
  document.querySelectorAll('.orgchart-person-card').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
  });
  _orgDragPersonId = null;
  _orgDragSourceSlot = null;
  _orgDropTargetId = null;
  _orgDropPosition = null;
  _orgClearDropIndicators();
  document.querySelectorAll('.orgchart-squad-col').forEach(el => {
    el.style.outline = '';
    el.style.background = '';
  });
  document.querySelectorAll('[data-lead-slot]').forEach(el => {
    el.style.background = '';
    el.style.borderColor = '';
    el.style.outline = '';
  });

  // Stop drag-to-scroll
  document.removeEventListener('dragover', _orgTrackMouse);
  if (_orgScrollRAF !== null) { cancelAnimationFrame(_orgScrollRAF); _orgScrollRAF = null; }
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
  _orgClearDropIndicators();

  const personId = event.dataTransfer.getData('text/plain') || _orgDragPersonId;
  if (!personId) return;

  const p = people.find(x => x.id === personId);
  if (!p) return;

  // If dragged from a leadership slot, clear that slot (moving to squad removes from leadership)
  if (_orgDragSourceSlot) {
    const { tribeId, slotIdx } = _orgDragSourceSlot;
    if (tribeLeadership[tribeId]) tribeLeadership[tribeId][slotIdx] = null;
  }

  const sourceSquadId = p.squad;
  if (sourceSquadId !== squadId) {
    _orgRemoveFromOrder(sourceSquadId, personId);
    _orgGetOrInitOrder(squadId);
    if (!squadOrder[squadId].includes(personId)) {
      squadOrder[squadId].push(personId); // append to end
    }
    p.squad = squadId;
  }

  scheduleSave();
  renderContent();
  renderSidebar();
}

// ── Card-level drag handlers (reordering) ─────────────────────
function orgChartCardDragOver(event, targetPersonId, squadId) {
  event.preventDefault();
  event.stopPropagation(); // prevent squad column highlight from firing
  event.dataTransfer.dropEffect = 'move';

  if (_orgDragPersonId === targetPersonId) return; // hovering self

  const rect = event.currentTarget.getBoundingClientRect();
  const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

  if (_orgDropTargetId !== targetPersonId || _orgDropPosition !== position) {
    _orgClearDropIndicators();
    _orgDropTargetId = targetPersonId;
    _orgDropPosition = position;
    event.currentTarget.classList.add(position === 'before' ? 'org-drop-before' : 'org-drop-after');
  }
}

function orgChartCardDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('org-drop-before', 'org-drop-after');
    _orgDropTargetId = null;
    _orgDropPosition = null;
  }
}

function orgChartCardDrop(event, targetPersonId, targetSquadId) {
  event.preventDefault();
  event.stopPropagation(); // prevent squad column drop from also firing
  _orgClearDropIndicators();

  const draggedId = event.dataTransfer.getData('text/plain') || _orgDragPersonId;
  if (!draggedId || draggedId === targetPersonId) return;

  const p = people.find(x => x.id === draggedId);
  if (!p) return;

  // If dragged from a leadership slot, clear that slot
  if (_orgDragSourceSlot) {
    const { tribeId, slotIdx } = _orgDragSourceSlot;
    if (tribeLeadership[tribeId]) tribeLeadership[tribeId][slotIdx] = null;
  }

  const sourceSquadId = p.squad;
  const pos = _orgDropPosition || 'after';

  _orgRemoveFromOrder(sourceSquadId, draggedId);
  _orgInsertIntoOrder(targetSquadId, draggedId, targetPersonId, pos);
  p.squad = targetSquadId;

  scheduleSave();
  renderContent();
  renderSidebar();
}

// ── Squad order helpers ────────────────────────────────────────
function _orgGetOrInitOrder(squadId) {
  if (!squadOrder[squadId]) {
    squadOrder[squadId] = people
      .filter(p => p.squad === squadId && p.status === 'active')
      .map(p => p.id);
  }
  return squadOrder[squadId];
}

function _orgRemoveFromOrder(squadId, personId) {
  if (!squadId || !squadOrder[squadId]) return;
  squadOrder[squadId] = squadOrder[squadId].filter(id => id !== personId);
}

function _orgInsertIntoOrder(squadId, personId, targetId, position) {
  _orgGetOrInitOrder(squadId);
  // Ensure person not already in list
  squadOrder[squadId] = squadOrder[squadId].filter(id => id !== personId);
  const targetIdx = squadOrder[squadId].indexOf(targetId);
  if (targetIdx === -1) {
    squadOrder[squadId].push(personId); // fallback: append
  } else if (position === 'before') {
    squadOrder[squadId].splice(targetIdx, 0, personId);
  } else {
    squadOrder[squadId].splice(targetIdx + 1, 0, personId);
  }
}

function _orgClearDropIndicators() {
  document.querySelectorAll('.org-drop-before, .org-drop-after').forEach(el => {
    el.classList.remove('org-drop-before', 'org-drop-after');
  });
}

// ── Drag and Drop (leadership slots) ─────────────────────────
function orgChartLeaderDragOver(event, tribeId, slotIdx) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'move';
  const el = event.currentTarget;
  el.style.background = 'var(--accent-light)';
  el.style.borderColor = 'var(--accent)';
  el.style.outline = '2px dashed var(--accent)';
}

function orgChartLeaderDragLeave(event) {
  const el = event.currentTarget;
  if (!el.contains(event.relatedTarget)) {
    el.style.background = '';
    el.style.borderColor = '';
    el.style.outline = '';
  }
}

function orgChartLeaderDrop(event, tribeId, slotIdx) {
  event.preventDefault();
  event.stopPropagation();
  const el = event.currentTarget;
  el.style.background = '';
  el.style.borderColor = '';
  el.style.outline = '';

  const personId = event.dataTransfer.getData('text/plain') || _orgDragPersonId;
  if (!personId) return;

  // No-op if dropping on same slot
  if (_orgDragSourceSlot && _orgDragSourceSlot.tribeId === tribeId && _orgDragSourceSlot.slotIdx === slotIdx) return;

  if (!tribeLeadership[tribeId]) tribeLeadership[tribeId] = [null, null, null, null];

  // Clear old slot if dragging from another leadership slot
  if (_orgDragSourceSlot) {
    const { tribeId: oldTribe, slotIdx: oldSlot } = _orgDragSourceSlot;
    if (tribeLeadership[oldTribe]) tribeLeadership[oldTribe][oldSlot] = null;
  }

  // Also clear if this person is already in another slot for this tribe (avoid duplicates)
  tribeLeadership[tribeId] = tribeLeadership[tribeId].map((id, i) =>
    (i !== slotIdx && id === personId) ? null : id
  );

  tribeLeadership[tribeId][slotIdx] = personId;

  // Remove person from their squad column — leadership is the exclusive view
  const p = people.find(x => x.id === personId);
  if (p) {
    _orgRemoveFromOrder(p.squad, personId);
    p.squad = null;
  }

  scheduleSave();
  renderContent();
  renderSidebar();
}

// ── Helpers ───────────────────────────────────────────────────
function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
