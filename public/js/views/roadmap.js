// ================================================================
// ROADMAP VIEW
// ================================================================

function renderRoadmap() {
  // Build 18-month window starting Jan 2025
  const months = [];
  const start = new Date('2025-01-01');
  for (let i = 0; i < 18; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    months.push(d);
  }

  const totalMonths = months.length;
  const windowStart = months[0];
  const windowEnd = new Date(months[totalMonths - 1]);
  windowEnd.setMonth(windowEnd.getMonth() + 1);

  function monthIndex(dateStr) {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    return (d.getFullYear() - windowStart.getFullYear()) * 12 + (d.getMonth() - windowStart.getMonth());
  }

  function pct(idx) { return (idx / totalMonths) * 100; }

  const todayIdx = monthIndex(new Date().toISOString().slice(0,10));
  const todayFrac = todayIdx + (new Date().getDate() / 30);
  const todayPct = Math.max(0, Math.min(100, (todayFrac / totalMonths) * 100));

  const TIER_BAR_COLORS = {
    1: { bg:'#ef4444', text:'#fff' },
    2: { bg:'#f59e0b', text:'#fff' },
    3: { bg:'#3b82f6', text:'#fff' },
  };

  // Month header
  let monthHeaders = months.map((m, i) => {
    const isQStart = m.getMonth() % 3 === 0;
    const label = m.toLocaleDateString('en-AU', { month: 'short' });
    const yearLabel = m.getMonth() === 0 ? ` '${String(m.getFullYear()).slice(2)}` : '';
    return `<div class="roadmap-month ${isQStart ? 'quarter-start' : ''}">${label}${yearLabel}</div>`;
  }).join('');

  // Build rows grouped by tribe
  let rows = '';
  TRIBES.forEach(tribe => {
    const tribeInits = initiatives.filter(init => {
      // Belongs to tribe if any allocated squad is in tribe
      return Object.keys(init.allocations||{}).some(sqId => {
        const sq = squads.find(s=>s.id===sqId);
        return sq && sq.tribe === tribe.id;
      }) || tribe.id === 'web' && ['crt','incident','apigee'].includes(init.id);
    });
    if (!tribeInits.length) return;

    // Tribe header row
    rows += `<div class="roadmap-tribe-header">
      <div class="roadmap-tribe-label">
        <div style="width:10px;height:10px;border-radius:50%;background:${tribe.color}"></div>${tribe.name}
      </div>
      <div class="roadmap-tribe-bg"></div>
    </div>`;

    tribeInits.forEach(init => {
      const dates = initiativeDates[init.id];
      const tierColors = TIER_BAR_COLORS[init.tier] || TIER_BAR_COLORS[3];

      let bar = '';
      if (dates) {
        const startIdx = Math.max(0, monthIndex(dates.start));
        const endIdx = Math.min(totalMonths, monthIndex(dates.end) + 1);
        if (endIdx > startIdx) {
          const leftPct = pct(startIdx);
          const widthPct = pct(endIdx - startIdx);
          bar = `<div class="roadmap-bar"
            style="left:${leftPct}%;width:calc(${widthPct}% - 4px);background:${tierColors.bg};color:${tierColors.text};opacity:${init.status==='Delivery'?1:0.6}"
            data-tip="${init.name} · ${init.status}"
            onclick="openInitDateModal('${init.id}')">
            ${init.name}
          </div>`;
        }
      }

      // Cell backgrounds
      const cells = months.map((m, i) => {
        const isQStart = m.getMonth() % 3 === 0;
        return `<div class="roadmap-cell ${isQStart?'quarter-start':''}"></div>`;
      }).join('');

      rows += `<div class="roadmap-row">
        <div class="roadmap-row-label">
          <span class="badge ${getTierClass(init.tier)}" style="flex-shrink:0">${init.tier}</span>
          <span title="${init.name}">${init.name}</span>
        </div>
        <div class="roadmap-cells">
          ${cells}
          ${bar}
          <div class="today-line" style="left:${todayPct}%"></div>
        </div>
      </div>`;
    });
  });

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Initiative Roadmap</div>
        <div class="section-sub">All in-flight and planned initiatives across tribes — click any bar to edit dates</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="badge badge-tier1">T1 Program</span>
        <span class="badge badge-tier2">T2 Project</span>
        <span class="badge badge-tier3">T3 Product</span>
      </div>
    </div>
    <div class="card roadmap-wrap">
      <div class="roadmap-grid">
        <div class="roadmap-header-row" style="position:relative">
          <div class="roadmap-label-col">Initiative</div>
          <div class="roadmap-timeline">${monthHeaders}</div>
        </div>
        ${rows}
      </div>
    </div>`;
}

// Edit initiative dates modal
function openInitDateModal(id) {
  const init = initiatives.find(i=>i.id===id);
  if (!init) return;
  const dates = initiativeDates[id] || { start:'', end:'' };
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Edit Dates — ${init.name}</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:14px">
        <span class="badge ${getTierClass(init.tier)}">${getTierLabel(init.tier)}</span>
        <span class="badge ${getStatusClass(init.status)}" style="margin-left:6px">${init.status}</span>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <div class="form-label">Start Date</div>
          <input class="form-input" id="id-start" type="month" value="${(dates.start||'').slice(0,7)}" />
        </div>
        <div class="form-group">
          <div class="form-label">End Date</div>
          <input class="form-input" id="id-end" type="month" value="${(dates.end||'').slice(0,7)}" />
        </div>
      </div>
      <div class="form-group">
        <div class="form-label">Status</div>
        <select class="form-select" id="id-status">
          <option ${init.status==='Delivery'?'selected':''}>Delivery</option>
          <option ${init.status==='Business Case'?'selected':''}>Business Case</option>
          <option ${init.status==='Assess'?'selected':''}>Assess</option>
          <option ${init.status==='High Level Design'?'selected':''}>High Level Design</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveInitDates('${id}')">Save</button>
    </div>`);
}

function saveInitDates(id) {
  const startVal = document.getElementById('id-start').value;
  const endVal = document.getElementById('id-end').value;
  initiativeDates[id] = {
    start: startVal ? startVal + '-01' : '',
    end:   endVal   ? endVal   + '-28' : '',
  };
  const init = initiatives.find(i=>i.id===id);
  if (init) init.status = document.getElementById('id-status').value;
  closeModal();
  renderContent();
}
