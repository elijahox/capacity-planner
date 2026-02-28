// ================================================================
// ORG CHART VIEW
// ================================================================

// ── Drag state ────────────────────────────────────────────────
let _orgDragPersonId = null;
let _orgDragSourceSlot = null; // { tribeId, slotIdx } when dragging from a leadership slot
let _orgDropTargetId = null;   // personId of card currently hovered during drag
let _orgDropPosition = null;   // 'before' | 'after' relative to target card

// ── Split-squad drag context ─────────────────────────────────
let _orgDragContext = 'primary'; // 'primary' | 'secondary'

// ── Drag-to-scroll state ──────────────────────────────────────
let _orgScrollRAF = null;
let _orgMouseX = 0;
let _orgMouseY = 0;

// ── Cleanup — called before navigating away from org chart ───
// Removes document-level listeners and cancels any in-flight RAF
// to prevent leaked handlers when the view DOM is destroyed.
function cleanupOrgChart() {
  document.removeEventListener('dragover', _orgTrackMouse);
  if (_orgScrollRAF !== null) { cancelAnimationFrame(_orgScrollRAF); _orgScrollRAF = null; }
  _orgDragPersonId = null;
  _orgDragSourceSlot = null;
  _orgDragContext = 'primary';
  _orgDropTargetId = null;
  _orgDropPosition = null;
}

// ── Scroll-preserving re-render ──────────────────────────────
// renderContent() destroys the DOM, resetting scroll position.
// This wrapper captures scroll offsets, re-renders, then uses
// requestAnimationFrame to restore them after the browser has
// laid out the new DOM.
function orgChartRerender() {
  const container = document.getElementById('orgchart-scroll');
  const scrollLeft = container ? container.scrollLeft : 0;
  const scrollTop = window.scrollY;
  renderContent();
  requestAnimationFrame(() => {
    const newContainer = document.getElementById('orgchart-scroll');
    if (newContainer) newContainer.scrollLeft = scrollLeft;
    window.scrollTo(0, scrollTop);
  });
}

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
  const tribeDisc = tribeSquads.reduce((acc, s) => {
    const d = getSquadDisciplineCounts(s.id);
    acc.engineering += d.engineering; acc.qe += d.qe;
    return acc;
  }, { engineering: 0, qe: 0 });
  const c = tribe.color;
  const SQ_W = 192;
  const GAP = 12;

  return `
    <div style="display:flex;flex-direction:column">

      <!-- Tribe header node -->
      <div style="background:${c};color:#fff;
                  border-radius:8px 8px 0 0;padding:10px 16px;
                  display:flex;align-items:center;justify-content:space-between;gap:12px">
        <span style="font-family:'Inter',sans-serif;font-weight:700;font-size:14px;letter-spacing:-0.3px">${tribe.name}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;opacity:0.75">${tribeSquads.length} squads · ${tribeHC}p · ⚙ ${tribeDisc.engineering.toFixed(1)}p  🧪 <span${tribeDisc.qe === 0 ? ' style="color:#fca5a5"' : ''}>${tribeDisc.qe.toFixed(1)}p</span></span>
          <span id="new-squad-${tribe.id}">
            <button onclick="orgChartNewSquad('${tribe.id}')"
                    style="background:none;border:1px solid rgba(255,255,255,0.4);color:#fff;
                           font-size:11px;padding:3px 10px;border-radius:12px;cursor:pointer;
                           font-family:'Inter',sans-serif;transition:background 0.15s"
                    onmouseenter="this.style.background='rgba(255,255,255,0.15)'"
                    onmouseleave="this.style.background='none'">＋ New Squad</button>
          </span>
        </div>
      </div>

      <!-- Leadership row -->
      ${renderOrgLeadershipRow(tribe, GAP)}

      <!-- Connector row: single horizontal line + vertical drops -->
      <div style="display:flex;gap:${GAP}px;margin-bottom:0">
        ${tribeSquads.map(() => `
          <div style="flex:1;min-width:${SQ_W}px;height:16px;
                      border-top:2px solid ${c};
                      display:flex;justify-content:center;align-items:flex-start">
            <div style="width:2px;height:14px;background:${c}"></div>
          </div>
        `).join('')}
      </div>

      <!-- Squad columns row -->
      <div style="display:flex;gap:${GAP}px;align-items:flex-start">
        ${tribeSquads.map(sq => renderOrgSquadCol(sq, tribe, SQ_W)).join('')}
      </div>

    </div>`;
}

// ── Leadership row ────────────────────────────────────────────
function renderOrgLeadershipRow(tribe, GAP) {
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
                  border-radius:7px;padding:6px 10px;min-height:40px;
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
                padding:8px 12px">
      <!-- Label -->
      <div style="flex-shrink:0;writing-mode:initial;padding-right:4px">
        <span style="font-size:10px;font-family:'JetBrains Mono',monospace;
                     color:var(--text-dim);text-transform:uppercase;letter-spacing:2px">Leadership</span>
      </div>
      <!-- 4 slots -->
      <div style="display:flex;gap:8px;flex:1">
        ${slotsHtml}
      </div>
    </div>`;
}

function renderOrgLeaderCard(p, tribeId, slotIdx) {
  const shortType = { perm: 'Perm', contractor: 'Ctr', msp: 'MSP' }[p.type] || p.type;
  let expiryHtml = '';
  if (p.type !== 'perm' && p.endDate) {
    const cls = getExpiryClass(p.endDate);
    const lbl = getExpiryLabel(p.endDate);
    expiryHtml = `<span class="${cls}" style="font-size:10px;font-family:'JetBrains Mono',monospace">${lbl}</span>`;
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
                border-radius:7px;padding:6px 10px;user-select:none;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
        <div style="min-width:0;flex:1">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          <div style="color:var(--text-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.role}</div>
        </div>
        <button onclick="orgChartClearLeaderSlot(event,'${tribeId}',${slotIdx})"
                style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                       font-size:12px;padding:0 2px;line-height:1;flex-shrink:0"
                title="Remove from leadership">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:3px">
        <span class="badge ${getTypeClass(p.type)}" style="font-size:10px;padding:2px 6px">${shortType}</span>
        ${expiryHtml}
      </div>
    </div>`;
}

function orgChartClearLeaderSlot(event, tribeId, slotIdx) {
  event.stopPropagation();
  if (!tribeLeadership[tribeId]) tribeLeadership[tribeId] = [null, null, null, null];
  tribeLeadership[tribeId][slotIdx] = null;
  scheduleSave();
  orgChartRerender();
}

// ── Squad column ──────────────────────────────────────────────
function renderOrgSquadCol(sq, tribe, minW) {
  const hc = getEffectiveSquadSize(sq.id);
  const { total: util } = getSquadAllocation(sq.id);
  const committed = getCommittedHeadcount(sq.id);
  const rag = getSquadRAG(sq.id);
  const disc = getSquadDisciplineCounts(sq.id);
  const c = tribe.color;

  // Build exclusion set: anyone in a leadership slot should NOT appear in squad columns
  const leadershipIds = new Set(
    Object.values(tribeLeadership).flat().filter(Boolean)
  );

  // Gather primary + secondary members, tag each with context
  const primaryPeople = people.filter(p => p.squad === sq.id && p.status === 'active' && !leadershipIds.has(p.id));
  const secondaryPeople = people.filter(p => p.secondarySquad === sq.id && p.squad !== sq.id && p.status === 'active' && !leadershipIds.has(p.id));
  let allSquadPeople = [
    ...primaryPeople.map(p => ({ person: p, context: 'primary' })),
    ...secondaryPeople.map(p => ({ person: p, context: 'secondary' })),
  ];
  const order = squadOrder[sq.id] || [];
  allSquadPeople.sort((a, b) => {
    const ai = order.indexOf(a.person.id);
    const bi = order.indexOf(b.person.id);
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
      <div style="padding:8px 12px;border-bottom:1px solid var(--border);background:var(--surface2)">
        <div style="display:flex;align-items:center;gap:4px">
          <div style="flex:1;min-width:0">
            <div class="orgchart-squad-name"
                 id="squad-name-${sq.id}"
                 ondblclick="orgChartRenameSquad('${sq.id}',this)"
                 title="Double-click to rename"
                 style="font-family:'Inter',sans-serif;font-weight:700;font-size:13px;
                        cursor:default;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sq.name}</div>
          </div>
          <button class="squad-edit-pencil"
                  onclick="orgChartRenameSquadBtn('${sq.id}')"
                  style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                         font-size:12px;padding:0 2px;line-height:1;flex-shrink:0;opacity:0;
                         transition:opacity 0.1s"
                  title="Rename squad">✏</button>
          <button class="squad-delete-btn"
                  onclick="orgChartDeleteSquad('${sq.id}',event)"
                  style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                         font-size:11px;padding:0 2px;line-height:1;flex-shrink:0;opacity:0;
                         transition:opacity 0.1s,color 0.15s"
                  onmouseenter="this.style.color='var(--red)'"
                  onmouseleave="this.style.color='var(--text-dim)'"
                  title="Delete squad">🗑</button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.3;margin-top:2px">
          <div style="display:flex;justify-content:space-between;align-items:center">${hc.toFixed(1)}p actual ${ragPill(rag, util)}</div>
          <div>${committed.toFixed(1)}p committed</div>
          <div style="font-size:11px;margin-top:1px">⚙ <span${disc.engineering === 0 ? ' style="color:var(--red)"' : ''}>${disc.engineering.toFixed(1)}p</span> eng  🧪 <span${disc.qe === 0 ? ' style="color:var(--red)"' : ''}>${disc.qe.toFixed(1)}p</span> QE</div>
        </div>
      </div>

      <!-- Person cards (drop zone) -->
      <div style="padding:8px;min-height:64px;display:flex;flex-direction:column;gap:6px">
        ${allSquadPeople.length === 0
          ? `<div style="text-align:center;padding:14px 0;color:var(--text-dim);font-size:12px">No members</div>`
          : allSquadPeople.map(({ person, context }) => renderOrgPersonCard(person, context)).join('')}
        ${allSquadPeople.length > 0 ? `<button onclick="openAddPersonModal('${sq.id}')"
                style="width:100%;padding:7px 0;border:1.5px dashed var(--border-strong);
                       border-radius:6px;background:none;cursor:pointer;
                       color:var(--text-dim);font-size:12px;font-family:'Inter',sans-serif;
                       transition:background 0.15s,color 0.15s"
                onmouseenter="this.style.background='var(--bg2)';this.style.color='var(--text-muted)'"
                onmouseleave="this.style.background='none';this.style.color='var(--text-dim)'">+ Add Person</button>` : ''}
      </div>
    </div>`;
}

// ── Person card ───────────────────────────────────────────────
function renderOrgPersonCard(p, context) {
  context = context || 'primary';
  const isSecondary = context === 'secondary';
  const isShared = !!(p.secondarySquad);
  const shortType = { perm: 'Perm', contractor: 'Contractor', msp: 'MSP' }[p.type] || p.type;

  // Determine card background and shared badges
  let cardBg = 'var(--bg)';
  let sharedBadges = '';
  let tooltipAttr = '';
  if (isShared) {
    const primarySq = squads.find(s => s.id === p.squad);
    const secondarySq = squads.find(s => s.id === p.secondarySquad);
    const t1 = primarySq ? TRIBES.find(t => t.id === primarySq.tribe) : null;
    const t2 = secondarySq ? TRIBES.find(t => t.id === secondarySq.tribe) : null;
    const c1 = t1 ? t1.color : '#94a3b8';
    const c2 = t2 ? t2.color : '#94a3b8';
    cardBg = `linear-gradient(135deg, ${_hexToRgba(c1, 0.08)} 50%, ${_hexToRgba(c2, 0.08)} 50%)`;
    sharedBadges = `<span class="badge" style="background:#6c3483;color:#fff;font-size:10px;padding:1px 6px">Shared</span>
                    <span class="badge badge-grey" style="font-size:10px;padding:1px 6px">50%</span>`;
    const pName = primarySq ? primarySq.name : 'Unassigned';
    const sName = secondarySq ? secondarySq.name : 'Unknown';
    tooltipAttr = ` title="Shared — 50% ${pName} · 50% ${sName}"`;
  }

  // Determine which squad this card instance belongs to for drag-drop
  const cardSquadId = isSecondary ? p.secondarySquad : p.squad;

  let expiryHtml = '';
  if (p.type !== 'perm' && p.endDate) {
    const cls = getExpiryClass(p.endDate);
    const lbl = getExpiryLabel(p.endDate);
    expiryHtml = `<div class="${cls}" style="font-size:11px;margin-top:4px;font-family:'JetBrains Mono',monospace">${lbl}</div>`;
  }

  // Use unique DOM ID per context so secondary card doesn't collide with primary
  const nameElId = isSecondary ? `person-name-display-${p.id}-sec` : `person-name-display-${p.id}`;

  return `
    <div class="orgchart-person-card"
         draggable="true"
         data-person-id="${p.id}"
         ondragstart="orgChartDragStart(event,'${p.id}',null,null,'${context}')"
         ondragend="orgChartDragEnd(event)"
         ondragover="orgChartCardDragOver(event,'${p.id}','${cardSquadId}')"
         ondragleave="orgChartCardDragLeave(event)"
         ondrop="orgChartCardDrop(event,'${p.id}','${cardSquadId}')"
         onclick="openPersonModal('${p.id}')"${tooltipAttr}
         style="background:${cardBg};border:1px solid var(--border);
                border-radius:7px;padding:9px 11px;user-select:none;position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-bottom:1px">
        <div id="${nameElId}"
             style="font-weight:700;font-size:13px;flex:1">${p.name}</div>
        <button class="person-edit-pencil"
                onclick="orgChartEditPersonName('${p.id}',event)"
                style="background:none;border:none;cursor:pointer;color:var(--text-dim);
                       font-size:12px;padding:0 2px;line-height:1;flex-shrink:0;opacity:0;
                       transition:opacity 0.1s"
                title="Edit name">✏</button>
      </div>
      <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px">${p.role}</div>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
        <span class="badge ${getTypeClass(p.type)}">${shortType}</span>
        ${sharedBadges}
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
    <span style="display:inline-flex;align-items:center;gap:4px">
      <input id="new-sq-inp-${tribeId}"
             placeholder="Squad name"
             style="font-size:11px;padding:3px 8px;border:1px solid rgba(255,255,255,0.5);
                    border-radius:4px;background:rgba(255,255,255,0.15);color:#fff;
                    outline:none;width:110px;font-family:'Inter',sans-serif"
             onkeydown="if(event.key==='Enter')orgChartConfirmNewSquad('${tribeId}');
                        if(event.key==='Escape')orgChartRerender();" />
      <button onclick="orgChartConfirmNewSquad('${tribeId}')"
              style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
                     color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;cursor:pointer;
                     font-family:'Inter',sans-serif">Add</button>
      <button onclick="orgChartRerender()"
              style="background:none;border:none;color:rgba(255,255,255,0.7);
                     font-size:13px;cursor:pointer;padding:0 2px;line-height:1">✕</button>
    </span>`;
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
  orgChartRerender();
  renderSidebar();
}

// ── Delete squad ────────────────────────────────────────────────
function orgChartDeleteSquad(squadId, event) {
  event.stopPropagation();
  const sq = squads.find(s => s.id === squadId);
  if (!sq) return;

  // Check if squad has people (primary or secondary)
  const hasPeople = people.some(p =>
    (p.squad === squadId || p.secondarySquad === squadId) && p.status === 'active'
  );
  if (hasPeople) {
    // Show inline error on squad header — block deletion
    const headerEl = document.getElementById('squad-name-' + squadId);
    if (headerEl) {
      const parent = headerEl.closest('.orgchart-squad-col');
      let errEl = parent ? parent.querySelector('.squad-delete-error') : null;
      if (!errEl && parent) {
        errEl = document.createElement('div');
        errEl.className = 'squad-delete-error';
        errEl.style.cssText = 'color:var(--red);font-size:11px;padding:4px 12px 0;font-family:"Inter",sans-serif';
        errEl.textContent = 'Move all people out of this squad before deleting';
        const headerDiv = parent.querySelector('div[style*="border-bottom"]');
        if (headerDiv) headerDiv.appendChild(errEl);
      }
      // Auto-dismiss after 4 seconds
      setTimeout(() => { if (errEl) errEl.remove(); }, 4000);
    }
    return;
  }

  // Check if squad has initiative allocations
  const hasAllocations = initiatives.some(init =>
    (init.allocations && init.allocations[squadId]) ||
    (init.estimatedCapacity && init.estimatedCapacity[squadId])
  );

  let modalBody;
  if (hasAllocations) {
    modalBody = `
      <h3 style="margin:0 0 12px">Delete ${sq.name}?</h3>
      <p style="color:var(--text-muted);margin:0 0 16px;font-size:13px">
        <strong style="color:var(--amber)">Warning:</strong> This squad has active initiative allocations
        that will be removed. This cannot be undone.
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="orgChartConfirmDeleteSquad('${squadId}')"
                style="background:var(--red);color:#fff;border-color:var(--red)">Delete Squad</button>
      </div>`;
  } else {
    modalBody = `
      <h3 style="margin:0 0 12px">Delete ${sq.name}?</h3>
      <p style="color:var(--text-muted);margin:0 0 16px;font-size:13px">
        This cannot be undone.
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="orgChartConfirmDeleteSquad('${squadId}')"
                style="background:var(--red);color:#fff;border-color:var(--red)">Delete Squad</button>
      </div>`;
  }
  openModal(modalBody);
}

function orgChartConfirmDeleteSquad(squadId) {
  closeModal();

  // Remove squad from squads array
  const idx = squads.findIndex(s => s.id === squadId);
  if (idx !== -1) squads.splice(idx, 1);

  // Remove squad from all initiative allocations and estimatedCapacity
  for (const init of initiatives) {
    if (init.allocations) delete init.allocations[squadId];
    if (init.estimatedCapacity) delete init.estimatedCapacity[squadId];
  }

  // Remove from squadOrder
  delete squadOrder[squadId];

  // Remove from tribeLeadership if any slot references a person in this squad
  // (leadership slots hold personIds, not squadIds — no action needed here)

  scheduleSave();
  orgChartRerender();
  renderSidebar();
}

// ── Drag and Drop (squad columns) ─────────────────────────────
function orgChartDragStart(event, personId, fromTribeId, fromSlotIdx, squadContext) {
  _orgDragPersonId = personId;
  _orgDragContext = squadContext || 'primary';
  _orgDragSourceSlot = (fromTribeId !== null && fromTribeId !== 'null' && fromSlotIdx !== null)
    ? { tribeId: fromTribeId, slotIdx: Number(fromSlotIdx) }
    : null;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', personId);
  setTimeout(() => {
    document.querySelectorAll(`.orgchart-person-card[data-person-id="${personId}"]`)
      .forEach(el => { el.style.opacity = '0.5'; el.style.transform = 'scale(0.95)'; });
  }, 0);

  // Start drag-to-scroll (defensive: remove first in case dragend didn't fire)
  document.removeEventListener('dragover', _orgTrackMouse);
  if (_orgScrollRAF !== null) { cancelAnimationFrame(_orgScrollRAF); _orgScrollRAF = null; }
  document.addEventListener('dragover', _orgTrackMouse);
  _orgScrollRAF = requestAnimationFrame(_orgScrollLoop);
}

function orgChartDragEnd(event) {
  document.querySelectorAll('.orgchart-person-card').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
  });
  _orgDragPersonId = null;
  _orgDragContext = 'primary';
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

  if (_orgDragContext === 'secondary') {
    // Dragged from secondary position → update secondarySquad
    const sourceSecondary = p.secondarySquad;
    if (sourceSecondary !== squadId) {
      _orgRemoveFromOrder(sourceSecondary, personId);
      _orgGetOrInitOrder(squadId);
      if (!squadOrder[squadId].includes(personId)) squadOrder[squadId].push(personId);
      // Dropping onto primary squad → consolidate (clear secondary)
      p.secondarySquad = (squadId === p.squad) ? null : squadId;
    }
  } else {
    // Dragged from primary position → update squad (original behavior)
    const sourceSquadId = p.squad;
    if (sourceSquadId !== squadId) {
      _orgRemoveFromOrder(sourceSquadId, personId);
      _orgGetOrInitOrder(squadId);
      if (!squadOrder[squadId].includes(personId)) squadOrder[squadId].push(personId);
      // Dropping onto secondary squad → consolidate (clear secondary)
      if (squadId === p.secondarySquad) p.secondarySquad = null;
      p.squad = squadId;
    }
  }

  scheduleSave();
  orgChartRerender();
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

  const pos = _orgDropPosition || 'after';

  if (_orgDragContext === 'secondary') {
    const sourceSecondary = p.secondarySquad;
    _orgRemoveFromOrder(sourceSecondary, draggedId);
    _orgInsertIntoOrder(targetSquadId, draggedId, targetPersonId, pos);
    p.secondarySquad = (targetSquadId === p.squad) ? null : targetSquadId;
  } else {
    const sourceSquadId = p.squad;
    _orgRemoveFromOrder(sourceSquadId, draggedId);
    _orgInsertIntoOrder(targetSquadId, draggedId, targetPersonId, pos);
    if (targetSquadId === p.secondarySquad) p.secondarySquad = null;
    p.squad = targetSquadId;
  }

  scheduleSave();
  orgChartRerender();
  renderSidebar();
}

// ── Squad order helpers ────────────────────────────────────────
function _orgGetOrInitOrder(squadId) {
  if (!squadOrder[squadId]) {
    squadOrder[squadId] = people
      .filter(p => (p.squad === squadId || p.secondarySquad === squadId) && p.status === 'active')
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
    if (p.secondarySquad) _orgRemoveFromOrder(p.secondarySquad, personId);
    p.squad = null;
    p.secondarySquad = null;
  }

  scheduleSave();
  orgChartRerender();
  renderSidebar();
}

// ── Helpers ───────────────────────────────────────────────────
function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
