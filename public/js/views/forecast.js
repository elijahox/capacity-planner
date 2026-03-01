// ================================================================
// CAPACITY FORECAST VIEW — quarterly Dev+QE capacity per squad
// ================================================================

let _forecastTips = {};

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

// ── Initiative date range (local copy — avoids modifying squads.js) ─

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

// ── Demand per initiative/squad/quarter ──────────────────────────

function _fcDemand(init, squadId, quarter, qWorkingDays, initWDCache) {
  const assignments = init.assignments || [];
  const estimates = init.estimates || [];
  const ps = init.pipelineStatus || 'in_delivery';

  // ── Assignment-based path: actual people assigned to this squad ──
  const squadAssignments = assignments.filter(a => a.squad === squadId);

  // ── Unlinked estimates: estimates for this squad with no linked assignment ──
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

  // ── No estimates/assignments: legacy fallback ──
  {
    // ── Legacy fallback: allocations / estimatedCapacity ──
    const range = _fcInitDateRange(init);
    if (range) {
      if (range.start > quarter.end || range.end < quarter.start) return 0;
    }

    let pct = 0;
    if (ps === 'approved' || ps === 'in_delivery') {
      pct = (init.allocations || {})[squadId] || 0;
    } else if (ps === 'submitted') {
      pct = (init.estimatedCapacity || {})[squadId] || 0;
    }
    if (pct === 0) return 0;

    const dhc = _fcDeliveryHC(squadId, quarter);
    return (pct / 100) * dhc;
  }
}

// ── RAG colouring ───────────────────────────────────────────────

function _fcRAG(committedPct, pipelinePct) {
  if (committedPct + pipelinePct > 100) return 'red';
  if (committedPct > 90) return 'red';
  if (committedPct > 70) return 'amber';
  return 'green';
}

function _fcRAGBg(rag) {
  if (rag === 'red') return 'rgba(239,68,68,0.08)';
  if (rag === 'amber') return 'rgba(245,158,11,0.08)';
  return 'rgba(16,185,129,0.06)';
}

// ── Cell renderer ───────────────────────────────────────────────

function _fcCell(tipId, deliveryHC, committed, pipeline, tribeColor, clickable) {
  const committedPct = deliveryHC > 0 ? (committed / deliveryHC) * 100 : 0;
  const pipelinePct = deliveryHC > 0 ? (pipeline / deliveryHC) * 100 : 0;
  const rag = _fcRAG(committedPct, pipelinePct);

  const cBarW = Math.min(committedPct, 100);
  const pBarW = Math.min(pipelinePct, 100 - cBarW);

  const total = committed + pipeline;
  const label = `${total.toFixed(1)} / ${deliveryHC.toFixed(1)}`;

  const clickAttr = clickable && tipId
    ? `onclick="openForecastDrilldown('${tipId}')" style="cursor:pointer;background:${_fcRAGBg(rag)}"`
    : `style="background:${_fcRAGBg(rag)}"`;

  // Stripe pattern for pipeline segment
  const stripe = `repeating-linear-gradient(45deg,${tribeColor}66,${tribeColor}66 2px,transparent 2px,transparent 4px)`;

  return `<td ${clickAttr} >
    <div style="position:relative;height:16px;background:var(--bg2);border-radius:999px;overflow:hidden;border:1px solid var(--border);margin:0 auto 4px;max-width:140px">
      ${cBarW > 0 ? `<div style="position:absolute;left:0;top:0;height:100%;width:${cBarW}%;background:${tribeColor};border-radius:999px 0 0 999px"></div>` : ''}
      ${pBarW > 0 ? `<div style="position:absolute;left:${cBarW}%;top:0;height:100%;width:${pBarW}%;background:${stripe}"></div>` : ''}
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap">
      ${ragDot(rag)} ${label}
    </div>
  </td>`;
}

// ── Main render ─────────────────────────────────────────────────

function renderForecast() {
  const quarters = getForecastQuarters();
  const qWD = quarters.map(q => _fcWorkingDays(q.start, q.end));
  const initWDCache = new Map();

  // Only consider non-complete initiatives
  const activeInits = initiatives.filter(i => {
    const ps = i.pipelineStatus || 'in_delivery';
    return ps !== 'complete';
  });

  _forecastTips = {};

  const rows = TRIBES.map(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);

    // ── Tribe summary row ──
    const tribeCells = quarters.map((q, qi) => {
      let tDHC = 0, tCommitted = 0, tPipeline = 0;
      tribeSquads.forEach(sq => {
        tDHC += _fcDeliveryHC(sq.id, q);
        activeInits.forEach(init => {
          const ps = init.pipelineStatus || 'in_delivery';
          const d = _fcDemand(init, sq.id, q, qWD[qi], initWDCache);
          if (d <= 0) return;
          if (ps === 'approved' || ps === 'in_delivery') tCommitted += d;
          else if (ps === 'submitted') tPipeline += d;
        });
      });
      return _fcCell(null, tDHC, tCommitted, tPipeline, tribe.color, false);
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
        let committed = 0, pipeline = 0;
        const committedInits = [], pipelineInits = [];

        activeInits.forEach(init => {
          const ps = init.pipelineStatus || 'in_delivery';
          const d = _fcDemand(init, sq.id, q, qWD[qi], initWDCache);
          if (d <= 0) return;
          if (ps === 'approved' || ps === 'in_delivery') {
            committed += d;
            committedInits.push({ init, hc: d });
          } else if (ps === 'submitted') {
            pipeline += d;
            pipelineInits.push({ init, hc: d });
          }
        });

        const tipId = `${sq.id}_${qi}`;
        _forecastTips[tipId] = {
          squadName: sq.name,
          quarter: q,
          deliveryHC: dhc,
          committed,
          pipeline,
          committedInits,
          pipelineInits,
        };

        return _fcCell(tipId, dhc, committed, pipeline, tribe.color, true);
      }).join('');

      return `<tr>
        <td style="padding:6px 12px 6px 28px;font-size:13px;white-space:nowrap">${sq.name}</td>
        ${cells}
      </tr>`;
    }).join('');

    return tribeRow + squadRows;
  }).join('');

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Capacity Forecast</div>
        <div class="section-sub">Quarterly engineering delivery capacity (Dev + QE) \u2014 click any cell for detail</div>
      </div>
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
        <span style="width:16px;height:10px;border-radius:2px;background:#1a5276"></span> Committed
      </span>
      <span style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:10px;border-radius:2px;background:repeating-linear-gradient(45deg,#1a527666,#1a527666 2px,transparent 2px,transparent 4px)"></span> Pipeline
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

  const { squadName, quarter, deliveryHC, committed, pipeline, committedInits, pipelineInits } = data;
  const available = Math.max(0, deliveryHC - committed - pipeline);
  const committedPct = deliveryHC > 0 ? (committed / deliveryHC) * 100 : 0;
  const pipelinePct = deliveryHC > 0 ? (pipeline / deliveryHC) * 100 : 0;
  const totalPct = committedPct + pipelinePct;
  const rag = _fcRAG(committedPct, pipelinePct);

  const initRow = (item, type) => {
    const ps = item.init.pipelineStatus || 'in_delivery';
    const badgeClass = type === 'committed' ? 'badge-green' : 'badge-blue';
    const badgeLabel = type === 'committed' ? 'Committed' : 'Pipeline';

    // Break down by roles assigned to this squad (from both assignments and unlinked estimates)
    const sqId = tipId.split('_')[0];
    const asgRoles = (item.init.assignments || []).filter(r => r.squad === sqId);
    const linkedIds = new Set(asgRoles.filter(a => a.estimateId).map(a => a.estimateId));
    const estRoles = (item.init.estimates || []).filter(e => e.squad === sqId && e.days > 0 && !linkedIds.has(e.id));
    const allRoles = [...asgRoles, ...estRoles];
    const roleDetail = allRoles.length > 0
      ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${allRoles.map(r => r.role || 'Unnamed role').join(', ')}</div>`
      : '';

    return `<tr>
      <td><strong>${item.init.name}</strong>${roleDetail}</td>
      <td style="font-family:'JetBrains Mono',monospace;text-align:right">${item.hc.toFixed(2)}</td>
      <td><span class="badge ${badgeClass}" style="font-size:11px">${badgeLabel}</span></td>
    </tr>`;
  };

  const committedRows = committedInits.length > 0
    ? committedInits.map(i => initRow(i, 'committed')).join('')
    : `<tr><td colspan="3" style="color:var(--text-dim);text-align:center;padding:12px">No committed demand</td></tr>`;

  const pipelineRows = pipelineInits.length > 0
    ? pipelineInits.map(i => initRow(i, 'pipeline')).join('')
    : '';

  openModal(`
    <div class="modal-header">
      <div class="modal-title">${squadName} \u2014 ${quarter.label} (${quarter.monthRange})</div>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Delivery HC</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace">${deliveryHC.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">Dev + QE</div>
        </div>
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Committed</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace">${committed.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">Approved + In Delivery</div>
        </div>
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Pipeline</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace">${pipeline.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">Submitted</div>
        </div>
        <div style="flex:1;min-width:110px;padding:12px 14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Available</div>
          <div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${available > 0 ? 'var(--green)' : 'var(--red)'}">${available.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${ragDot(rag)} ${Math.round(totalPct)}% utilised</div>
        </div>
      </div>

      <div class="card" style="margin-top:8px">
        <table class="data-table compact">
          <thead><tr><th>Initiative</th><th style="text-align:right">HC Equiv</th><th>Status</th></tr></thead>
          <tbody>
            ${committedRows}
            ${pipelineRows}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid var(--border);font-weight:600;font-size:12px">
              <td>Total</td>
              <td style="font-family:'JetBrains Mono',monospace;text-align:right">${(committed + pipeline).toFixed(2)}</td>
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
