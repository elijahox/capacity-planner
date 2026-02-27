// ================================================================
// DEMAND CHART VIEW
// ================================================================

// Palette shared for initiatives on demand chart
const DEMAND_PALETTE = [
  '#1a5276','#1e8449','#c0392b','#c17f24','#6c3483',
  '#148f77','#d35400','#2980b9','#7d6608','#117a65',
  '#6e2f0e','#1a5276','#512e5f','#0e6655','#7b241c',
  '#1f618d','#1e8449','#9a7d0a','#6e2f0e','#154360'
];

// Which initiatives are currently checked on
const demandVisible = {};

// Module-level refs for profile editor scroll (avoids window pollution)
let _profileScrollFn = null;
let _profileScrollToFn = null;

function initDemandVisible() {
  // Default: first 5 initiatives with dates checked on
  let count = 0;
  initiatives.forEach(init => {
    if (initiativeDates[init.id]?.start && count < 5) {
      demandVisible[init.id] = true;
      count++;
    }
  });
}
initDemandVisible();

function getWeeksForInit(initId) {
  const d = initiativeDates[initId];
  if (!d?.start || !d?.end) return 0;
  return Math.max(1, Math.ceil(
    (new Date(d.end).getTime() - new Date(d.start).getTime()) / (7 * 86400000)
  ));
}

function getOrCreateProfile(initId) {
  if (workProfiles[initId]) return workProfiles[initId];
  const weeks = getWeeksForInit(initId);
  if (!weeks) return [];
  // Default: bell curve — ramps up, peaks, tapers
  const profile = [];
  for (let w = 0; w < weeks; w++) {
    const t = weeks > 1 ? w / (weeks - 1) : 0.5;
    let pct;
    if (t < 0.2)       pct = Math.round(t / 0.2 * 30);
    else if (t < 0.55) pct = Math.round(30 + (t - 0.2) / 0.35 * 60);
    else               pct = Math.round(90 - (t - 0.55) / 0.45 * 90);
    profile.push(Math.max(5, Math.min(100, pct)));
  }
  workProfiles[initId] = profile;
  return profile;
}

// Get % for a specific calendar date (by week index offset from init start)
function getProfilePctForDate(initId, dateMs) {
  const d = initiativeDates[initId];
  if (!d?.start || !d?.end) return 0;
  const startMs = new Date(d.start).getTime();
  const endMs   = new Date(d.end).getTime();
  if (dateMs < startMs || dateMs > endMs) return 0;
  const weekIdx = Math.floor((dateMs - startMs) / (7 * 86400000));
  const profile = getOrCreateProfile(initId);
  return profile[Math.min(weekIdx, profile.length - 1)] || 0;
}

function renderDemand() {
  // Build list of initiatives that have dates
  const datable = initiatives.filter(i => initiativeDates[i.id]?.start);

  const initListHTML = datable.map((init, i) => {
    const col = DEMAND_PALETTE[i % DEMAND_PALETTE.length];
    const checked = !!demandVisible[init.id];
    const dates = initiativeDates[init.id];
    const weeks = getWeeksForInit(init.id);
    return `<label style="display:flex;align-items:center;gap:9px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s"
        onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
        id="dinit-row-${init.id}">
      <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleDemandInit('${init.id}')"
        style="width:14px;height:14px;accent-color:${col};cursor:pointer;flex-shrink:0">
      <div style="width:10px;height:10px;border-radius:2px;background:${col};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${init.name}">${init.name}</div>
        <div style="font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${weeks}w</div>
      </div>
      <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px;flex-shrink:0"
        onclick="event.preventDefault();event.stopPropagation();openProfileEditor('${init.id}')">✏ Profile</button>
    </label>`;
  }).join('');

  setTimeout(drawDemandChart, 0);

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Capacity Demand Chart</div>
        <div class="section-sub">Weekly work profiles per initiative — tick to overlay, click ✏ Profile to edit the shape</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start">

      <div>
        <div class="card" style="overflow:hidden">
          <div class="card-header" style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
            <div class="card-title" style="font-size:12px">Initiatives</div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="setAllDemandInits(true)">All</button>
              <button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="setAllDemandInits(false)">None</button>
            </div>
          </div>
          <div style="max-height:500px;overflow-y:auto">
            ${initListHTML || '<div style="padding:16px;color:var(--text-muted);font-size:12px">No initiatives with dates set. Add dates in the Roadmap view.</div>'}
          </div>
        </div>
      </div>

      <div>
        <div class="demand-chart-wrap card" style="padding:16px;margin-bottom:20px">
          <canvas id="demandCanvas"></canvas>
          <div id="demandLegend" class="demand-legend" style="margin-top:12px"></div>
        </div>
        <div style="font-family:'Inter',sans-serif;font-weight:700;font-size:15px;margin-bottom:12px">Peak Collision Analysis</div>
        <div class="card" id="collision-table"></div>
      </div>

    </div>`;
}

function toggleDemandInit(initId) {
  demandVisible[initId] = !demandVisible[initId];
  drawDemandChart();
}

function setAllDemandInits(val) {
  initiatives.filter(i => initiativeDates[i.id]?.start).forEach(i => {
    demandVisible[i.id] = val;
    const cb = document.querySelector(`#dinit-row-${i.id} input`);
    if (cb) cb.checked = val;
  });
  drawDemandChart();
}

function drawDemandChart() {
  const canvas = document.getElementById('demandCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  // Canvas sizing
  const W = Math.max(400, wrap.clientWidth - 32);
  const H = 360;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.display = 'block';
  canvas.style.width  = '100%';

  const PAD = { top: 32, right: 20, bottom: 48, left: 58 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Time window: Jan 2025 – Dec 2026 at weekly resolution
  const WIN_START = new Date('2025-01-01').getTime();
  const WIN_END   = new Date('2027-01-01').getTime();
  const WIN_SPAN  = WIN_END - WIN_START;
  const WEEK_MS   = 7 * 86400000;

  // Build weekly ticks
  const weeks = [];
  for (let t = WIN_START; t < WIN_END; t += WEEK_MS) weeks.push(t);
  const N = weeks.length;

  function xOf(ms) { return PAD.left + ((ms - WIN_START) / WIN_SPAN) * chartW; }

  // ---- Background + grid ----
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(PAD.left, PAD.top, chartW, chartH);

  // Horizontal gridlines
  const yTicks = [0, 25, 50, 75, 100];
  ctx.textAlign = 'right';
  ctx.font = '10px JetBrains Mono, monospace';
  yTicks.forEach(v => {
    const y = PAD.top + chartH - (v / 100) * chartH;
    ctx.strokeStyle = v === 100 ? '#ef444455' : '#e2e8f0';
    ctx.lineWidth   = v === 100 ? 1.5 : 1;
    ctx.setLineDash(v === 100 ? [5, 4] : []);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = v === 100 ? '#ef4444' : '#64748b';
    ctx.fillText(v + '%', PAD.left - 7, y + 3.5);
  });

  // Y axis label
  ctx.save();
  ctx.translate(PAD.left - 42, PAD.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('% Squad Capacity', 0, 0);
  ctx.restore();

  // Vertical quarter lines + labels
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date('2025-01-01');
    d.setMonth(i);
    months.push(d);
  }
  ctx.textAlign = 'center';
  months.forEach(m => {
    if (m.getMonth() % 3 !== 0) return;
    const x = xOf(m.getTime());
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + chartH); ctx.stroke();
    const lbl = m.toLocaleDateString('en-AU', { month: 'short' }) + (m.getMonth() === 0 ? ' ' + m.getFullYear() : '');
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(lbl, x, PAD.top + chartH + 14);
  });

  // Today line
  const todayX = xOf(Date.now());
  if (todayX > PAD.left && todayX < PAD.left + chartW) {
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(todayX, PAD.top - 4); ctx.lineTo(todayX, PAD.top + chartH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left'; ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('Today', todayX + 3, PAD.top + 11);
  }

  // ---- Draw initiative lines ----
  const visInits = initiatives.filter(i => demandVisible[i.id] && initiativeDates[i.id]?.start);
  const legendItems = [];

  visInits.forEach((init, idx) => {
    const col = DEMAND_PALETTE[initiatives.indexOf(init) % DEMAND_PALETTE.length];

    // Build weekly % series
    const vals = weeks.map(wMs => getProfilePctForDate(init.id, wMs));

    // Area fill
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = col;
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = xOf(weeks[i]);
      const y = PAD.top + chartH - (v / 100) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(xOf(weeks[N - 1]), PAD.top + chartH);
    ctx.lineTo(xOf(weeks[0]), PAD.top + chartH);
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Line
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    vals.forEach((v, i) => {
      if (v === 0 && !started) return;
      const x = xOf(weeks[i]);
      const y = PAD.top + chartH - (v / 100) * chartH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    legendItems.push({ name: init.name, col, initId: init.id });
  });

  // ---- Legend below canvas ----
  const legendEl = document.getElementById('demandLegend');
  if (legendEl) {
    legendEl.innerHTML = legendItems.length
      ? legendItems.map(l => `
          <div class="demand-legend-item" onclick="openProfileEditor('${l.initId}')" style="cursor:pointer" title="Click to edit profile">
            <div class="demand-legend-swatch" style="background:${l.col}"></div>
            <span>${l.name}</span>
          </div>`).join('')
      : '<div style="color:var(--text-muted);font-size:12px">Select initiatives on the left to overlay them</div>';
  }

  // ---- Collision analysis ----
  updateCollisionTable(weeks, visInits);
}

function updateCollisionTable(weeks, visInits) {
  const el = document.getElementById('collision-table');
  if (!el) return;
  if (!visInits || !visInits.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><div class="empty-icon" style="font-size:20px;margin-bottom:4px">📊</div><div>Select initiatives to see collision analysis.</div></div>';
    return;
  }

  // Aggregate by month: find weeks in each month, sum peak demand
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date('2025-01-01'); d.setMonth(i);
    months.push(d);
  }

  const WEEK_MS = 7 * 86400000;
  const collisions = [];
  months.forEach(m => {
    const mEnd = new Date(m); mEnd.setMonth(m.getMonth() + 1);
    // Get all weeks that fall in this month
    const mWeeks = weeks.filter(wMs => wMs >= m.getTime() && wMs < mEnd.getTime());
    if (!mWeeks.length) return;

    // For each initiative, find its peak % in this month
    const initPeaks = visInits.map(init => {
      const peak = Math.max(0, ...mWeeks.map(wMs => getProfilePctForDate(init.id, wMs)));
      return { init, peak };
    }).filter(x => x.peak > 0);

    // Total demand = sum of peaks (rough: all drawing simultaneously at peak)
    const totalDemand = initPeaks.reduce((a, x) => a + x.peak, 0);
    const over85 = initPeaks.filter(x => x.peak > 50); // initiatives contributing meaningfully

    if (totalDemand > 100 || over85.length >= 2) {
      collisions.push({ month: m, totalDemand, contributors: initPeaks.filter(x => x.peak > 20) });
    }
  });

  if (!collisions.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><div style="font-size:20px;margin-bottom:6px">✓</div><div style="color:var(--text-muted)">No months where combined demand exceeds 100% — looking clear.</div></div>';
    return;
  }

  el.innerHTML = `<table class="data-table compact">
    <thead><tr><th>Month</th><th>Contributing Initiatives</th><th>Peak Combined Demand</th><th>Risk</th></tr></thead>
    <tbody>${collisions.map(c => {
      const cls = c.totalDemand > 150 ? 'badge-red' : c.totalDemand > 120 ? 'badge-amber' : 'badge-blue';
      const lbl = c.totalDemand > 150 ? 'Critical' : c.totalDemand > 120 ? 'High' : 'Medium';
      return `<tr>
        <td><strong>${c.month.toLocaleDateString('en-AU',{month:'short',year:'numeric'})}</strong></td>
        <td>${c.contributors.map(x=>`<span class="tag">${x.init.name} <strong>${Math.round(x.peak)}%</strong></span>`).join(' ')}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:${c.totalDemand > 100 ? 'var(--red)' : 'inherit'}">${Math.round(c.totalDemand)}%</td>
        <td><span class="badge ${cls}">${lbl}</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ================================================================
// PROFILE EDITOR MODAL — horizontal canvas bar editor with month slider
// ================================================================

const PRESETS = [
  { name: 'Bell curve', fn: (w, n) => { const t = n>1?w/(n-1):0.5; if(t<0.2) return Math.round(t/0.2*30); if(t<0.55) return Math.round(30+(t-0.2)/0.35*60); return Math.round(90-(t-0.55)/0.45*90); } },
  { name: 'Ramp up',    fn: (w, n) => Math.round((w/(n-1||1))*100) },
  { name: 'Ramp down',  fn: (w, n) => Math.round((1-w/(n-1||1))*100) },
  { name: 'Flat 50%',   fn: () => 50 },
  { name: 'Flat 100%',  fn: () => 100 },
  { name: 'Front-heavy',fn: (w, n) => Math.round(Math.max(5, 100-Math.pow(w/(n-1||1),1.5)*95)) },
];

function openProfileEditor(initId) {
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  const dates = initiativeDates[initId];
  const totalWeeks = getWeeksForInit(initId);
  const col = DEMAND_PALETTE[initiatives.indexOf(init) % DEMAND_PALETTE.length];

  if (!totalWeeks) {
    openModal(`<div class="modal-header"><div class="modal-title">No dates set</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body"><p style="padding:8px 0">Set start and end dates for <strong>${init.name}</strong> in the Roadmap view first.</p></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>`);
    return;
  }

  const profile = getOrCreateProfile(initId);

  // How many weeks fit comfortably in the viewport at once
  const VISIBLE_WEEKS = 13; // ~1 quarter
  let scrollOffset = 0; // first visible week index

  openModal(`
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:12px;height:12px;border-radius:3px;background:${col};flex-shrink:0"></div>
        <div class="modal-title">${init.name} — Work Profile</div>
      </div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="padding:16px 20px">

      <!-- Meta + presets -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0">
          ${totalWeeks} weeks &nbsp;·&nbsp; ${new Date(dates.start).toLocaleDateString('en-AU',{month:'short',year:'numeric'})} → ${new Date(dates.end).toLocaleDateString('en-AU',{month:'short',year:'numeric'})}
        </span>
        <div style="flex:1"></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${PRESETS.map((p,pi) => `<button class="btn btn-secondary btn-sm" style="font-size:10px" onclick="applyProfilePreset_v2('${initId}',${pi})">${p.name}</button>`).join('')}
        </div>
      </div>

      <!-- Canvas editor -->
      <div style="position:relative;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <canvas id="profileCanvas" style="display:block;width:100%;cursor:crosshair"></canvas>
      </div>

      <!-- Month slider — only shown if weeks > VISIBLE_WEEKS -->
      <div id="profile-slider-wrap" style="margin-top:10px;display:${totalWeeks > VISIBLE_WEEKS ? 'flex' : 'none'};align-items:center;gap:10px">
        <button class="btn btn-secondary btn-sm" onclick="profileScroll(-${VISIBLE_WEEKS})">◀</button>
        <input type="range" id="profile-slider" min="0" max="${Math.max(0, totalWeeks - VISIBLE_WEEKS)}"
          value="0" style="flex:1;accent-color:${col}" oninput="profileScrollTo(parseInt(this.value))">
        <button class="btn btn-secondary btn-sm" onclick="profileScroll(${VISIBLE_WEEKS})">▶</button>
        <span id="profile-slider-label" style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-muted);white-space:nowrap;min-width:80px;text-align:right"></span>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
        Click or drag on bars to set weekly % — drag across multiple weeks to draw a shape
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProfileAndClose('${initId}')">Save & Update Chart</button>
    </div>`);

  // ---- Set up canvas after DOM ready ----
  setTimeout(() => {
    const canvas = document.getElementById('profileCanvas');
    if (!canvas) return;

    const W_PADDED = canvas.parentElement.clientWidth;
    const BAR_H = 160;
    const PAD = { top: 28, right: 12, bottom: 36, left: 42 };
    canvas.width  = W_PADDED;
    canvas.height = BAR_H + PAD.top + PAD.bottom;
    const ctx = canvas.getContext('2d');

    const chartW = canvas.width - PAD.left - PAD.right;
    const chartH = BAR_H;

    function weekX(localIdx) {
      // localIdx = 0..VISIBLE_WEEKS-1
      const visCount = Math.min(VISIBLE_WEEKS, totalWeeks - scrollOffset);
      return PAD.left + (localIdx / visCount) * chartW;
    }
    function barWidth() {
      const visCount = Math.min(VISIBLE_WEEKS, totalWeeks - scrollOffset);
      return Math.max(4, chartW / visCount - 3);
    }
    function weekLabel(weekIdx) {
      return 'W' + (weekIdx + 1);
    }
    function monthBoundaryLabel(weekIdx) {
      const d = new Date(new Date(dates.start).getTime() + weekIdx * 7 * 86400000);
      const prev = weekIdx > 0 ? new Date(new Date(dates.start).getTime() + (weekIdx-1) * 7 * 86400000) : null;
      if (!prev || d.getMonth() !== prev.getMonth()) {
        return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
      }
      return null;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Y axis gridlines + labels
      const yTicks = [0, 25, 50, 75, 100];
      ctx.font = '10px JetBrains Mono, monospace';
      yTicks.forEach(v => {
        const y = PAD.top + chartH - (v / 100) * chartH;
        ctx.strokeStyle = v === 100 ? '#ef444444' : '#e2e8f0';
        ctx.lineWidth = v === 100 ? 1.5 : 1;
        ctx.setLineDash(v === 100 ? [4, 3] : []);
        ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = v === 100 ? '#ef4444' : '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText(v + '%', PAD.left - 5, y + 3.5);
      });

      // Bars
      const visCount = Math.min(VISIBLE_WEEKS, totalWeeks - scrollOffset);
      const bw = barWidth();

      for (let li = 0; li < visCount; li++) {
        const wi = scrollOffset + li;
        const pct = profile[wi] || 0;
        const x = weekX(li);
        const barActualH = (pct / 100) * chartH;
        const y = PAD.top + chartH - barActualH;

        // Bar background (empty track)
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        roundRectPath(ctx, x, PAD.top, bw, chartH, 4);
        ctx.fill();

        // Filled bar
        const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : col;
        ctx.fillStyle = barColor + 'dd';
        if (barActualH > 0) {
          ctx.beginPath();
          roundRectPath(ctx, x, y, bw, barActualH, 4);
          ctx.fill();
        }

        // % label above bar
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(pct + '%', x + bw / 2, Math.min(y - 3, PAD.top + chartH - 4));

        // Week label below
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(weekLabel(wi), x + bw / 2, PAD.top + chartH + 12);

        // Month boundary marker
        const mbl = monthBoundaryLabel(wi);
        if (mbl) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(x - 1, PAD.top);
          ctx.lineTo(x - 1, PAD.top + chartH + 15);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(mbl, x, PAD.top + chartH + 26);
        }
      }

      // Slider label
      const labelEl = document.getElementById('profile-slider-label');
      if (labelEl && totalWeeks > VISIBLE_WEEKS) {
        const startD = new Date(new Date(dates.start).getTime() + scrollOffset * 7 * 86400000);
        const endIdx = Math.min(scrollOffset + VISIBLE_WEEKS - 1, totalWeeks - 1);
        const endD = new Date(new Date(dates.start).getTime() + endIdx * 7 * 86400000);
        labelEl.textContent = startD.toLocaleDateString('en-AU',{month:'short'}) + ' – ' + endD.toLocaleDateString('en-AU',{month:'short',year:'2-digit'});
      }
    }

    function roundRectPath(ctx, x, y, w, h, r) {
      const R = Math.min(r, w/2, h/2);
      ctx.moveTo(x + R, y);
      ctx.lineTo(x + w - R, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + R);
      ctx.lineTo(x + w, y + h - R);
      ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
      ctx.lineTo(x + R, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - R);
      ctx.lineTo(x, y + R);
      ctx.quadraticCurveTo(x, y, x + R, y);
      ctx.closePath();
    }

    // ---- Hit test: which week index at canvas x? ----
    function weekAtX(canvasX) {
      const visCount = Math.min(VISIBLE_WEEKS, totalWeeks - scrollOffset);
      const bw = barWidth();
      for (let li = 0; li < visCount; li++) {
        const x = weekX(li);
        if (canvasX >= x && canvasX <= x + bw) return scrollOffset + li;
      }
      // Nearest bar
      let best = -1, bestDist = Infinity;
      for (let li = 0; li < visCount; li++) {
        const cx = weekX(li) + bw / 2;
        const d = Math.abs(canvasX - cx);
        if (d < bestDist) { bestDist = d; best = scrollOffset + li; }
      }
      return best;
    }

    function pctAtY(canvasY) {
      const raw = 1 - (canvasY - PAD.top) / chartH;
      return Math.max(0, Math.min(100, Math.round(raw * 100)));
    }

    function canvasPoint(e) {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left) * scaleX, y: (cy - r.top) * scaleY };
    }

    let painting = false;

    function applyPaint(e) {
      const { x, y } = canvasPoint(e);
      if (y < PAD.top || y > PAD.top + chartH) return;
      const wi = weekAtX(x);
      if (wi < 0 || wi >= totalWeeks) return;
      profile[wi] = pctAtY(y);
      draw();
    }

    const onMouseDown  = e => { painting = true; applyPaint(e); };
    const onMouseMove  = e => { if (painting) applyPaint(e); };
    const onMouseUp    = () => { painting = false; };
    const onMouseLeave = () => { painting = false; };
    const onTouchStart = e => { e.preventDefault(); painting = true; applyPaint(e); };
    const onTouchMove  = e => { e.preventDefault(); if (painting) applyPaint(e); };
    const onTouchEnd   = () => { painting = false; };

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    // Expose scroll control via module-level refs (avoid window pollution)
    _profileScrollFn = (delta) => {
      scrollOffset = Math.max(0, Math.min(totalWeeks - VISIBLE_WEEKS, scrollOffset + delta));
      const slider = document.getElementById('profile-slider');
      if (slider) slider.value = scrollOffset;
      draw();
    };
    _profileScrollToFn = (val) => {
      scrollOffset = Math.max(0, Math.min(totalWeeks - VISIBLE_WEEKS, val));
      draw();
    };

    // Register cleanup so listeners are removed when modal closes
    _modalCleanup = () => {
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      _profileScrollFn = null;
      _profileScrollToFn = null;
    };

    draw();

  }, 40);
}

function profileScroll(delta)    { if (_profileScrollFn)   _profileScrollFn(delta); }
function profileScrollTo(val)    { if (_profileScrollToFn) _profileScrollToFn(val); }

function applyProfilePreset_v2(initId, presetIdx) {
  const preset = PRESETS[presetIdx];
  const n = getWeeksForInit(initId);
  workProfiles[initId] = Array.from({ length: n }, (_, w) =>
    Math.max(0, Math.min(100, preset.fn(w, n)))
  );
  // Redraw canvas if open
  const canvas = document.getElementById('profileCanvas');
  if (canvas) {
    const initRef = initiatives.find(i => i.id === initId);
    if (initRef) {
      closeModal();
      setTimeout(() => openProfileEditor(initId), 50);
    }
  }
}

function saveProfileAndClose(initId) {
  closeModal();
  drawDemandChart();
}
