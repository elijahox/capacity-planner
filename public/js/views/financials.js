// ================================================================
// FINANCIALS VIEW
// ================================================================

function renderFinancials() {
  const active = people.filter(p=>p.type!=='perm'&&p.status==='active'&&!p.isVacant&&p.dayRate);
  const daily = active.reduce((a,p)=>a+p.dayRate,0);
  const monthly = daily * 21;
  const annual = daily * 252;

  const byRole = {};
  active.forEach(p => {
    if (!byRole[p.role]) byRole[p.role] = { count:0, total:0 };
    byRole[p.role].count++;
    byRole[p.role].total += p.dayRate;
  });

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Financial Overview</div>
        <div class="section-sub">Contractor & consultant cost exposure — permanent salaries not included</div>
      </div>
    </div>

    <div class="financial-grid">
      <div class="fin-card">
        <div class="fin-card-label">Daily Spend</div>
        <div class="fin-card-value">${fmtCurrency(daily)}</div>
        <div class="fin-card-sub">${active.length} active contractors/MSPs</div>
      </div>
      <div class="fin-card">
        <div class="fin-card-label">Est. Monthly (21 days)</div>
        <div class="fin-card-value">${fmtCurrency(monthly)}</div>
        <div class="fin-card-sub">Based on active headcount</div>
      </div>
      <div class="fin-card">
        <div class="fin-card-label">Est. Annual (252 days)</div>
        <div class="fin-card-value" style="font-size:20px">${fmtCurrency(annual)}</div>
        <div class="fin-card-sub">If all contracts fully extended</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="section-title" style="font-family:'Inter',sans-serif;font-weight:700;margin-bottom:12px;font-size:16px">Spend by Tribe</div>
        <div class="card">
          <table class="data-table compact">
            <thead><tr><th>Tribe</th><th>Contractors</th><th>Daily</th><th>Monthly Est.</th></tr></thead>
            <tbody>
              ${TRIBES.map(tribe => {
                const tribeSquadIds = squads.filter(s=>s.tribe===tribe.id).map(s=>s.id);
                const tribePeople = active.filter(p=>tribeSquadIds.includes(p.squad));
                const triDaily = tribePeople.reduce((a,p)=>a+p.dayRate,0);
                return `<tr>
                  <td><span style="display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:${tribe.color}"></div><strong>${tribe.name}</strong></span></td>
                  <td style="font-family:'JetBrains Mono',monospace">${tribePeople.length}</td>
                  <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(triDaily)}</td>
                  <td style="font-family:'JetBrains Mono',monospace;color:var(--text-muted)">${fmtCurrency(triDaily*21)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="section-title" style="font-family:'Inter',sans-serif;font-weight:700;margin-bottom:12px;font-size:16px">Spend by Role</div>
        <div class="card">
          <table class="data-table compact">
            <thead><tr><th>Role</th><th>Count</th><th>Avg Rate</th><th>Daily Total</th></tr></thead>
            <tbody>
              ${Object.entries(byRole).sort((a,b)=>b[1].total-a[1].total).map(([role,data])=>`<tr>
                <td>${role}</td>
                <td style="font-family:'JetBrains Mono',monospace">${data.count}</td>
                <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(Math.round(data.total/data.count))}</td>
                <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(data.total)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
