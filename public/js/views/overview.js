// ================================================================
// OVERVIEW VIEW
// ================================================================

function renderOverview() {
  const totalHC = squads.reduce((a, s) => a + getEffectiveSquadSize(s.id), 0);
  const totalContractors = people.filter(p => p.type !== 'perm' && p.status === 'active').length;
  const overAlloc = squads.filter(s => getSquadAllocation(s.id).total > 100).length;
  const expiring30 = getContractorsExpiringSoon(30).length;
  const avgUtil = squads.reduce((a, s) => a + getSquadAllocation(s.id).total, 0) / squads.length;
  const dailySpend = getTotalDailySpend();

  let html = `
    <div class="summary-row">
      <div class="summary-card green">
        <div class="summary-label">Total Headcount</div>
        <div class="summary-value">${totalHC}</div>
        <div class="summary-sub">${squads.length} squads · ${TRIBES.length} tribes</div>
      </div>
      <div class="summary-card blue">
        <div class="summary-label">Avg Utilisation</div>
        <div class="summary-value" style="color:${utilColor(avgUtil)}">${Math.round(avgUtil)}%</div>
        <div class="summary-sub">across all squads</div>
      </div>
      <div class="summary-card ${overAlloc > 0 ? 'red' : 'green'}">
        <div class="summary-label">Over-allocated</div>
        <div class="summary-value" style="color:${overAlloc > 0 ? 'var(--red)' : 'var(--green)'}">${overAlloc}</div>
        <div class="summary-sub">${overAlloc > 0 ? 'squads need attention' : 'All within capacity'}</div>
      </div>
      <div class="summary-card ${expiring30 > 0 ? 'amber' : 'green'}">
        <div class="summary-label">Contracts Expiring</div>
        <div class="summary-value" style="color:${expiring30 > 0 ? 'var(--amber)' : 'var(--green)'}">${expiring30}</div>
        <div class="summary-sub">within next 30 days</div>
      </div>
      <div class="summary-card purple">
        <div class="summary-label">Daily Contractor Spend</div>
        <div class="summary-value" style="font-size:20px">${fmtCurrency(dailySpend)}</div>
        <div class="summary-sub">${totalContractors} active contractors/MSPs</div>
      </div>
    </div>`;

  // Alerts
  const expired = people.filter(p => p.type !== 'perm' && p.status === 'active' && daysUntil(p.endDate) < 0);
  const urgent14 = getContractorsExpiringSoon(14);
  if (expired.length) html += `<div class="alert alert-red"><div class="alert-icon">🚨</div><div><strong>${expired.length} contractor(s) have expired contracts</strong> — ${expired.map(p=>p.name).join(', ')}. Action required immediately.</div></div>`;
  if (urgent14.length) html += `<div class="alert alert-amber"><div class="alert-icon">⚠️</div><div><strong>${urgent14.length} contractor(s) expire within 14 days</strong> — ${urgent14.map(p=>p.name).join(', ')}. Review and decide on extension or roll-off.</div></div>`;
  if (overAlloc > 0) html += `<div class="alert alert-amber"><div class="alert-icon">📊</div><div><strong>${overAlloc} squad(s) are over-allocated.</strong> Go to Squads view to review and rebalance initiative assignments.</div></div>`;

  // Tribe grids
  TRIBES.forEach(tribe => {
    const tribeSquads = squads.filter(s => s.tribe === tribe.id);
    html += `<div class="section">
      <div class="section-header">
        <div>
          <div class="section-title" style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${tribe.color}"></div>${tribe.name} Tribe
          </div>
          <div class="section-sub">${tribeSquads.reduce((a,s)=>a+getEffectiveSquadSize(s.id),0)} people · ${tribeSquads.length} squads</div>
        </div>
      </div>
      <div class="overview-grid">`;
    tribeSquads.forEach(sq => {
      const { total, breakdown } = getSquadAllocation(sq.id);
      const hc = getEffectiveSquadSize(sq.id);
      const sqPeople = people.filter(p => p.squad === sq.id && p.status === 'active');
      const contractors = sqPeople.filter(p => p.type !== 'perm').length;
      html += `<div class="overview-card" onclick="goToSquad('${sq.id}')">
        <div class="tribe-stripe" style="background:${tribe.color}"></div>
        <div class="overview-card-top">
          <div>
            <div class="overview-card-name">${sq.name}</div>
            <div class="overview-card-tribe">${tribe.name}</div>
          </div>
          <div style="text-align:right">
            <div class="overview-card-hc">${hc}</div>
            <div class="overview-card-hc-label">people</div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${utilClass(total)}">${Math.round(total)}% utilised</span>
          <span style="font-size:11px;color:var(--text-muted)">${contractors} contractor${contractors !== 1 ? 's' : ''}</span>
        </div>
        <div class="util-bar-mini"><div class="util-bar-fill" style="width:${Math.min(total,110)}%;background:${utilColor(total)}"></div></div>
      </div>`;
    });
    html += '</div></div>';
  });
  return html;
}
