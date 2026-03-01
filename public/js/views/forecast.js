// ================================================================
// CAPACITY FORECAST VIEW — quarterly Dev+QE capacity per squad
// Two modes: Delivery (actual assignments) and Pending (estimated demand)
// Bar segments colour-coded by initiative tier (T1/T2/T3)
// ================================================================

let _forecastTips = {};

// ── Mode toggle (sentinel pattern) ──────────────────────────────
let _forecastMode = 'delivery';
let _forecastModeActive = false;

function setForecastMode(mode) {
  _forecastMode = mode;
  _forecastModeActive = true;
  renderContent();
}

// ── Tier colours ────────────────────────────────────────────────
const FC_TIER_COLORS = {
  1: '#1a5276', // T1 — dark/strong
  2: '#2e86c1', // T2 — medium
  3: '#85c1e9', // T3 — light
};

// ── Australian FY quarters ──────────────────────────────────────

function getForecastQuarters() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed

  // AU FY: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  const Q_START_MONTHS = [6, 9, 0, 3]; // calendar month each quarter starts
  const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Which quarter are we in?
  let currentQIdx;
  if (month >= 6 && month <= 8) currentQIdx = 0;
  else if (month >= 9 && month <= 11) currentQIdx = 1;
  else if (month >= 0 && month <= 2) currentQIdx = 2;
  else currentQIdx = 3;

  // FY start year = calendar year of July
  const fyStartYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  const quarters = [];
  for (let i = 0; i < 4; i++) {
    const qIdx = (currentQIdx + i) % 4;
    const startMonth = Q_START_MONTHS[qIdx];
    const yearOffset = Math.floor((currentQIdx + i) / 4);
    const calYear = startMonth >= 6
      ? fyStartYear + yearOffset
      : fyStartYear + 1 + yearOffset;

    const start = new Date(calYear, startMonth, 1);
    const end = new Date(calYear, startMonth + 3, 0); // last day of 3rd month
    const fy = startMonth >= 6 ? calYear + 1 : calYear;

    const m1 = MONTH_NAMES[startMonth];
    const m3 = MONTH_NAMES[(startMonth + 2) % 12];

    quarters.push({
      label: `${Q_LABELS[qIdx]} FY${String(fy).slice(2)}`,
      monthRange: `${m1}\u2013${m3}`,
      start,
      end,
    });
  }
  return quarters;
}

// ── Working-day helpers ─────────────────────────────────────────

function _fcWorkingDays(start, end) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ── Delivery headcount (Dev + QE) per squad per quarter ─────────

function _fcDeliveryHC(squadId, quarter) {
  let hc = 0;
  people.forEach(p => {
    if (p.status !== 'active' || p.isVacant) return;
    const disc = getDiscipline(p.role);
    if (disc !== 'engineering' && disc !== 'qe') return;

    let weight = 0;
    if (p.squad === squadId) weight = p.secondarySquad ? 0.5 : 1;
    else if (p.secondarySquad === squadId) weight = 0.5;
    if (weight === 0) return;

    // Contractor/MSP whose contract ends before this quarter starts → zero
    if (p.endDate) {
      const ed = new Date(p.endDate);
      if (ed < quarter.start) return;
    }

    hc += weight;
  });
  return hc;
}

// ── Initiative date range ───────────────────────────────────────

function _fcInitDateRange(init) {
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

// ── Delivery mode demand — reads assignments on approved/in_delivery ──

function _fcDeliveryDemand(init, squadId, quarter, qWorkingDays, initWDCache) {
  const assignments = init.assignments || [];
  const estimates = init.estimates || [];
  const ps = init.pipelineStatus || 'in_delivery';

  // Only show approved/in_delivery in delivery mode
  if (ps !== 'approved' && ps !== 'in_delivery') return 0;

  // ── Assignment-based: actual people assigned to this squad ──
  const squadAssignments = assignments.filter(a => a.squad === squadId);

  // ── Unlinked estimates for this squad (gap between plan and reality) ──
  const linkedEstimateIds = new Set(assignments.filter(a => a.estimateId).map(a => a.estimateId));
  const unlinkedEstimates = estimates.filter(e => e.squad === squadId && e.days > 0 && !linkedEstimateIds.has(e.id));

  let assignedHC = 0;
  if (squadAssignments.length > 0) {
    const range = _fcInitDateRange(init);
    let inRange = true;
    if (range) {
      if (range.start > quarter.end || range.end < quarter.start) inRange = false;
    }
    if (inRange) {
      squadAssignments.forEach(a => {
        const alloc = a.allocation != null ? a.allocation : 100;
        assignedHC += alloc / 100;
      });
    }
  }

  // ── Days-based path for unlinked estimates ──
  let unassignedHC = 0;
  if (unlinkedEstimates.length > 0) {
    const range = _fcInitDateRange(init);
    if (!range) {
      const totalDays = unlinkedEstimates.reduce((a, e) => a + (e.days || 0), 0);
      unassignedHC = qWorkingDays > 0 ? (totalDays / 4) / qWorkingDays : 0;
    } else {
      const oStart = new Date(Math.max(range.start.getTime(), quarter.start.getTime()));
      const oEnd = new Date(Math.min(range.end.getTime(), quarter.end.getTime()));
      if (oStart <= oEnd) {
        let initWD = initWDCache.get(init.id);
        if (initWD === undefined) {
          initWD = _fcWorkingDays(range.start, range.end);
          initWDCache.set(init.id, initWD);
        }
        if (initWD > 0) {
          const overlapWD = _fcWorkingDays(oStart, oEnd);
          const proportion = overlapWD / initWD;
          const totalDays = unlinkedEstimates.reduce((a, e) => a + (e.days || 0), 0);
          unassignedHC = qWorkingDays > 0 ? (proportion * totalDays) / qWorkingDays : 0;
        }
      }
    }
  }

  if (squadAssignments.length > 0 || unlinkedEstimates.length > 0) {
    return assignedHC + unassignedHC;
  }

  // ── Legacy fallback: allocations ──
  {
    const range = _fcInitDateRange(init);
    if (range) {
      if (range.start > quarter.end || range.end < quarter.start) return 0;
    }

    let pct = (init.allocations || {})[squadId] || 0;
    if (pct === 0) return 0;

    const dhc = _fcDeliveryHC(squadId, quarter);
    return (pct / 100) * dhc;
  }
}

// ── Pending mode demand — reads estimates on submitted/approved ──

function _fcPendingDemand(init, squadId, quarter, qWorkingDays, initWDCache) {
  const estimates = init.estimates || [];
  const ps = init.pipelineStatus || 'in_delivery';

  // Pending mode shows submitted and approved
  if (ps !== 'submitted' && ps !== 'approved') return 0;

  const squadEstimates = estimates.filter(e => e.squad === squadId && e.days > 0);

  if (squadEstimates.length > 0) {
    const totalDays = squadEstimates.reduce((a, e) => a + (e.days || 0), 0);
    const range = _fcInitDateRange(init);

    if (!range) {
      // No dates — spread evenly across all 4 quarters
      return qWorkingDays > 0 ? (totalDays / 4) / qWorkingDays : 0;
    }

    // Calculate overlap with this quarter
    const oStart = new Date(Math.max(range.start.getTime(), quarter.start.getTime()));
    const oEnd = new Date(Math.min(range.end.getTime(), quarter.end.getTime()));
    if (oStart > oEnd) return 0;

    let initWD = initWDCache.get(init.id + '_pending');
    if (initWD === undefined) {
      initWD = _fcWorkingDays(range.start, range.end);
      initWDCache.set(init.id + '_pending', initWD);
    }
    if (initWD <= 0) return 0;

    const overlapWD = _fcWorkingDays(oStart, oEnd);
    const proportion = overlapWD / initWD;
    return qWorkingDays > 0 ? (proportion * totalDays) / qWorkingDays : 0;
  }

  // ── Legacy fallback: estimatedCapacity / allocations ──
  {
    const range = _fcInitDateRange(init);
    if (range) {
      if (range.start > quarter.end || range.end < quarter.start) return 0;
    }

    let pct = 0;
    if (ps === 'approved') {
      pct = (init.allocations || {})[squadId] || (init.estimatedCapacity || {})[squadId] || 0;
    } else if (ps === 'submitted') {
      pct = (init.estimatedCapacity || {})[squadId] || 0;
    }
    if (pct === 0) return 0;

    const dhc = _fcDeliveryHC(squadId, quarter);
    return (pct / 100) * dhc;
  }
}

// ── RAG colouring ───────────────────────────────────────────────

function _fcRAG(usedPct) {
  if (usedPct > 100) return 'red';
  if (usedPct > 90) return 'red';
  if (usedPct > 70) return 'amber';
  return 'green';
}

function _fcRAGBg(rag) {
  if (rag === 'red') return 'rgba(239,68,68,0.08)';
  if (rag === 'amber') return 'rgba(245,158,11,0.08)';
  return 'rgba(16,185,129,0.06)';
}

// ── Tiered cell renderer ────────────────────────────────────────
// items: [{ init, hc, tier }] — individual initiative contributions
// deliveryHC: total Dev+QE capacity for the squad/quarter

function _fcTieredCell(tipId, deliveryHC, items, clickable) {
  const totalHC = items.reduce((a, i) => a + i.hc, 0);
  const usedPct = deliveryHC > 0 ? (totalHC / deliveryHC) * 100 : 0;
  const rag = _fcRAG(usedPct);

  // Sort items: T1 first, then T2, then T3
  const sorted = [...items].sort((a, b) => (a.tier || 3) - (b.tier || 3));

  // Build bar segments — each segment is a % of the bar
  let barHTML = '';
  let leftPct = 0;
  sorted.forEach((item, idx) => {
    const segPct = deliveryHC > 0 ? Math.min((item.hc / deliveryHC) * 100, 100 - leftPct) : 0;
    if (segPct <= 0) return;
    const color = FC_TIER_COLORS[item.tier] || FC_TIER_COLORS[3];
    // 1px white gap between segments (via left offset)
    const gap = idx > 0 && leftPct > 0 ? 1 : 0;
    barHTML += `<div style="position:absolute;left:calc(${leftPct}% + ${gap}px);top:0;height:100%;width:calc(${segPct}% - ${gap}px);background:${color}"></div>`;
    leftPct += segPct;
  });

  const label = `${totalHC.toFixed(1)} / ${deliveryHC.toFixed(1)}`;

  const clickAttr = clickable && tipId
    ? `onclick="openForecastDrilldown('${tipId}')" style="cursor:pointer;background:${_fcRAGBg(rag)}"`
    : `style="background:${_fcRAGBg(rag)}"`;

  return `<td ${clickAttr}>
    <div style="position:relative;height:16px;background:var(--bg2);border-radius:999px;overflow:hidden;border:1px solid var(--border);margin:0 auto 4px;max-width:140px">
      ${barHTML}
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap">
      ${ragDot(rag)} ${label}
    </div>
  </td>`;
}

// ── Main render ─────────────────────────────────────────────────

function renderForecast() {
  // Sentinel pattern: reset to default if not actively set
  if (!_forecastModeActive) _forecastMode = 'delivery';
  _forecastModeActive = false;
  const mode = _forecastMode;

  const quarters = getForecastQuarters();
  const qWD = quarters.map(q => _fcWorkingDays(q.start, q.end));
  const initWDCache = new Map();

  // Filter initiatives based on mode
  const activeInits = initiatives.filter(i => {
    const ps = i.pipelineStatus || 'in_delivery';
    if (ps === 'complete') return false;
    if (mode === 'delivery') return ps === 'approved' || ps === 'in_delivery';
    if (mode === 'pending') return ps === 'submitted' || ps === 'approved';
    return true;
  });

  const demandFn = mode === 'delivery' ? _fcDeliveryDemand : _fcPendingDemand;

  _forecastTips = {};

  const rows = TRIBES.map(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);

    // ── Tribe summary row ──
    const tribeCells = quarters.map((q, qi) => {
      let tDHC = 0;
      const tribeItems = [];
      tribeSquads.forEach(sq => {
        tDHC += _fcDeliveryHC(sq.id, q);
        activeInits.forEach(init => {
          const d = demandFn(init, sq.id, q, qWD[qi], initWDCache);
          if (d <= 0) return;
          // Aggregate by initiative to avoid duplicate entries across squads
          const existing = tribeItems.find(ti => ti.init.id === init.id);
          if (existing) {
            existing.hc += d;
          } else {
            tribeItems.push({ init, hc: d, tier: init.tier || 3 });
          }
        });
      });
      return _fcTieredCell(null, tDHC, tribeItems, false);
    }).join('');

    const tribeRow = `<tr style="background:var(--bg2);font-weight:600">
      <td style="padding:8px 12px;font-size:12px;white-space:nowrap">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${tribe.color}"></span>
          ${tribe.name}
        </span>
      </td>
      ${tribeCells}
    </tr>`;

    // ── Squad rows ──
    const squadRows = tribeSquads.map(sq => {
      const cells = quarters.map((q, qi) => {
        const dhc = _fcDeliveryHC(sq.id, q);
        const items = [];

        activeInits.forEach(init => {
          const d = demandFn(init, sq.id, q, qWD[qi], initWDCache);
          if (d <= 0) return;
          items.push({ init, hc: d, tier: init.tier || 3 });
        });

        const totalHC = items.reduce((a, i) => a + i.hc, 0);

        const tipId = `${sq.id}_${qi}`;
        _forecastTips[tipId] = {
          squadName: sq.name,
          quarter: q,
          deliveryHC: dhc,
          totalHC,
          items,
          mode,
        };

        return _fcTieredCell(tipId, dhc, items, true);
      }).join('');

      return `<tr>
        <td style="padding:6px 12px 6px 28px;font-size:13px;white-space:nowrap">${sq.name}</td>
        ${cells}
      </tr>`;
    }).join('');

    return tribeRow + squadRows;
  }).join('');

  const modeDesc = mode === 'delivery'
    ? 'Showing actual assignments on approved & in-delivery initiatives'
    : 'Showing estimated demand from submitted & approved business cases';

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Capacity Forecast</div>
        <div class="section-sub">Quarterly engineering delivery capacity (Dev + QE) \u2014 click any cell for detail</div>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <div style="display:flex;gap:4px">
        <button class="btn btn-sm ${mode === 'delivery' ? 'btn-primary' : 'btn-secondary'}" style="border-radius:999px" onclick="setForecastMode('delivery')">Delivery</button>
        <button class="btn btn-sm ${mode === 'pending' ? 'btn-primary' : 'btn-secondary'}" style="border-radius:999px" onclick="setForecastMode('pending')">Pending</button>
      </div>
      <span style="font-size:12px;color:var(--text-dim);font-style:italic">${modeDesc}</span>
    </div>

    <div class="card" style="overflow-x:auto">
      <table class="data-table" style="min-width:700px;text-align:center">
        <thead>
          <tr>
            <th style="min-width:160px;text-align:left">Squad</th>
            ${quarters.map(q => `<th style="min-width:140px;text-align:center">
              <div>${q.label}</div>
              <div style="font-weight:400;font-size:11px;color:var(--text-dim)">${q.monthRange}</div>
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="display:flex;gap:14px;margin-top:14px;font-size:12px;flex-wrap:wrap;align-items:center">
      <span style="color:var(--text-muted);font-weight:600">Legend:</span>
      <span style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:10px;border-radius:2px;background:${FC_TIER_COLORS[1]}"></span> T1 Program
      </span>
      <span style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:10px;border-radius:2px;background:${FC_TIER_COLORS[2]}"></span> T2 Project
      </span>
      <span style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:10px;border-radius:2px;background:${FC_TIER_COLORS[3]}"></span> T3 Product
      </span>
      <span style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:10px;border-radius:2px;background:var(--bg2);border:1px solid var(--border)"></span> Available
      </span>
      <span style="display:flex;align-items:center;gap:6px;margin-left:8px">
        ${ragDot('green')} <span style="color:var(--text-muted)">\u226470%</span>
        ${ragDot('amber')} <span style="color:var(--text-muted)">71\u201390%</span>
        ${ragDot('red')} <span style="color:var(--text-muted)">&gt;90%</span>
      </span>
    </div>`;
}

// ── Drill-down modal ────────────────────────────────────────────

function openForecastDrilldown(tipId) {
  const data = _forecastTips[tipId];
  if (!data) return;

  const { squadName, quarter, deliveryHC, totalHC, items, mode } = data;
  const available = Math.max(0, deliveryHC - totalHC);
  const usedPct = deliveryHC > 0 ? (totalHC / deliveryHC) * 100 : 0;
  const rag = _fcRAG(usedPct);

  const modeLabel = mode === 'delivery' ? 'Delivery' : 'Pending';
  const modeSubtitle = mode === 'delivery'
    ? 'Actual assignments'
    : 'Estimated demand';

  // Group items by tier
  const tierGroups = {};
  items.forEach(item => {
    const t = item.tier || 3;
    if (!tierGroups[t]) tierGroups[t] = [];
    tierGroups[t].push(item);
  });

  const tierLabels = { 1: 'Tier 1 Programs', 2: 'Tier 2 Projects', 3: 'Tier 3 Product' };

  const initRow = (item) => {
    const ps = item.init.pipelineStatus || 'in_delivery';
    const statusClass = { submitted: 'badge-blue', approved: 'badge-amber', in_delivery: 'badge-green', complete: 'badge-grey' }[ps] || 'badge-grey';
    const statusLabel = { submitted: 'Submitted', approved: 'Approved', in_delivery: 'In Delivery', complete: 'Complete' }[ps] || ps;
    const tierColor = FC_TIER_COLORS[item.tier] || FC_TIER_COLORS[3];

    // Role detail from assignments or estimates depending on mode
    const sqId = tipId.split('_')[0];
    let roleDetail = '';
    if (mode === 'delivery') {
      const asgRoles = (item.init.assignments || []).filter(r => r.squad === sqId);
      const linkedIds = new Set(asgRoles.filter(a => a.estimateId).map(a => a.estimateId));
      const estRoles = (item.init.estimates || []).filter(e => e.squad === sqId && e.days > 0 && !linkedIds.has(e.id));
      const allRoles = [...asgRoles, ...estRoles];
      if (allRoles.length > 0) {
        roleDetail = `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${allRoles.map(r => r.role || 'Unnamed role').join(', ')}</div>`;
      }
    } else {
      const estRoles = (item.init.estimates || []).filter(e => e.squad === sqId && e.days > 0);
      if (estRoles.length > 0) {
        roleDetail = `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${estRoles.map(r => r.role || 'Unnamed role').join(', ')}</div>`;
      }
    }

    return `<tr>
      <td style="padding:6px 8px">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${tierColor};flex-shrink:0"></span>
          <span><strong>${item.init.name}</strong>${roleDetail}</span>
        </span>
      </td>
      <td style="font-family:'JetBrains Mono',monospace;text-align:right;padding:6px 8px">${item.hc.toFixed(2)}</td>
      <td style="padding:6px 8px"><span class="badge ${statusClass}" style="font-size:11px">${statusLabel}</span></td>
    </tr>`;
  };

  let tableBody = '';
  [1, 2, 3].forEach(tier => {
    const group = tierGroups[tier];
    if (!group || group.length === 0) return;
    const tierColor = FC_TIER_COLORS[tier];
    tableBody += `<tr>
      <td colspan="3" style="padding:8px 8px 4px;font-weight:600;font-size:12px;color:var(--text-muted);border-bottom:none">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${tierColor}"></span>
          ${tierLabels[tier]}
        </span>
      </td>
    </tr>`;
    tableBody += group.map(item => initRow(item)).join('');
  });

  if (items.length === 0) {
    tableBody = `<tr><td colspan="3" style="color:var(--text-dim);text-align:center;padding:12px">No demand in this quarter</td></tr>`;
  }

  openModal(`
    <div class="modal-header">
      <div class="modal-title">${squadName} \u2014 ${quarter.label} (${quarter.monthRange})</div>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:12px">
        <span class="badge ${mode === 'delivery' ? 'badge-green' : 'badge-blue'}" style="font-size:11px">${modeLabel}</span>
        <span style="font-size:12px;color:var(--text-dim);margin-left:6px">${modeSubtitle}</span>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Delivery HC</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace">${deliveryHC.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">Dev + QE</div>
        </div>
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Consumed</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace">${totalHC.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${mode === 'delivery' ? 'Approved + In Delivery' : 'Submitted + Approved'}</div>
        </div>
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Available</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${available > 0 ? 'var(--green)' : 'var(--red)'}">${available.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${ragDot(rag)} ${Math.round(usedPct)}% utilised</div>
        </div>
      </div>

      <div class="card" style="margin-top:8px">
        <table class="data-table compact">
          <thead><tr><th>Initiative</th><th style="text-align:right">HC Equiv</th><th>Status</th></tr></thead>
          <tbody>
            ${tableBody}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid var(--border);font-weight:600;font-size:12px">
              <td>Total</td>
              <td style="font-family:'JetBrains Mono',monospace;text-align:right">${totalHC.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>`);
}
