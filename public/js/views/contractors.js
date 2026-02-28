// ================================================================
// CONTRACTOR WATCH VIEW
// ================================================================

function renderContractorWatch() {
  const active = people.filter(p => p.type !== 'perm' && p.status === 'active' && !p.isVacant);
  const expired = active.filter(p => daysUntil(p.endDate) < 0);
  const within14 = active.filter(p => daysUntil(p.endDate) >= 0 && daysUntil(p.endDate) <= 14);
  const within30 = active.filter(p => daysUntil(p.endDate) > 14 && daysUntil(p.endDate) <= 30);
  const within90 = active.filter(p => daysUntil(p.endDate) > 30 && daysUntil(p.endDate) <= 90);
  const healthy  = active.filter(p => daysUntil(p.endDate) > 90);

  const byAgency = {};
  active.forEach(p => {
    if (!p.agency) return;
    if (!byAgency[p.agency]) byAgency[p.agency] = { count: 0, spend: 0 };
    byAgency[p.agency].count++;
    byAgency[p.agency].spend += (p.dayRate || 0);
  });

  function contractorTable(list, emptyMsg) {
    if (!list.length) return `<div class="empty" style="padding:20px"><div class="empty-icon">✓</div><div>${emptyMsg}</div></div>`;
    return `<table class="data-table compact">
      <thead><tr><th>Name</th><th>Role</th><th>Squad</th><th>Type</th><th>Day Rate</th><th>Agency</th><th>End Date</th><th>Next Action</th><th>Action Status</th><th>Comments</th></tr></thead>
      <tbody>
        ${list.map(p => {
          const sq = squads.find(s => s.id === p.squad);
          return `<tr onclick="openPersonModal('${p.id}')">
            <td><strong>${p.name}</strong></td>
            <td style="color:var(--text-muted)">${p.role}</td>
            <td>${sq ? sq.name : '—'}</td>
            <td><span class="badge ${getTypeClass(p.type)}">${getTypeLabel(p.type)}</span></td>
            <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(p.dayRate)}</td>
            <td>${p.agency || '—'}</td>
            <td class="${getExpiryClass(p.endDate)}">${getExpiryLabel(p.endDate)}</td>
            <td>${p.nextAction ? `<span class="badge ${getActionClass(p.nextAction)}">${p.nextAction}</span>` : '—'}</td>
            <td>${p.actionStatus ? `<span class="badge badge-grey">${p.actionStatus}</span>` : '—'}</td>
            <td style="max-width:200px;font-size:11px;color:var(--text-muted)">${p.comments || ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Contractor Watch</div>
        <div class="section-sub">${active.length} active contractors & consultants — click any row to edit</div>
      </div>
    </div>

    ${expired.length ? `<div class="alert alert-red"><div class="alert-icon">🚨</div><div><strong>${expired.length} expired contract(s)</strong> — immediate action required.</div></div>` : ''}
    ${within14.length ? `<div class="alert alert-amber"><div class="alert-icon">⚠️</div><div><strong>${within14.length} contract(s) expire within 14 days</strong> — review now.</div></div>` : ''}

    <div class="tabs">
      <button class="tab active" onclick="switchCWTab(event,'cw-expired')">Expired (${expired.length})</button>
      <button class="tab" onclick="switchCWTab(event,'cw-14')">Next 14 days (${within14.length})</button>
      <button class="tab" onclick="switchCWTab(event,'cw-30')">15–30 days (${within30.length})</button>
      <button class="tab" onclick="switchCWTab(event,'cw-90')">31–90 days (${within90.length})</button>
      <button class="tab" onclick="switchCWTab(event,'cw-ok')">90+ days (${healthy.length})</button>
    </div>

    <div id="cw-expired" class="cw-panel card" style="margin-bottom:20px">${contractorTable(expired, 'No expired contracts')}</div>
    <div id="cw-14" class="cw-panel card" style="margin-bottom:20px;display:none">${contractorTable(within14, 'No contracts expiring in the next 14 days')}</div>
    <div id="cw-30" class="cw-panel card" style="margin-bottom:20px;display:none">${contractorTable(within30, 'No contracts expiring in 15–30 days')}</div>
    <div id="cw-90" class="cw-panel card" style="margin-bottom:20px;display:none">${contractorTable(within90, 'No contracts in 31–90 day window')}</div>
    <div id="cw-ok" class="cw-panel card" style="margin-bottom:20px;display:none">${contractorTable(healthy, 'No contracts in 90+ day window')}</div>

    <div class="section-header" style="margin-top:8px"><div class="section-title" style="font-size:16px">By Agency</div></div>
    <div class="card">
      <table class="data-table compact">
        <thead><tr><th>Agency</th><th>Contractors</th><th>Daily Spend</th><th>Est. Monthly</th></tr></thead>
        <tbody>
          ${Object.entries(byAgency).sort((a,b)=>b[1].spend-a[1].spend).map(([agency,data]) => `<tr>
            <td><strong>${agency}</strong></td>
            <td style="font-family:'JetBrains Mono',monospace">${data.count}</td>
            <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(data.spend)}</td>
            <td style="font-family:'JetBrains Mono',monospace;color:var(--text-muted)">${fmtCurrency(data.spend * 21)}</td>
          </tr>`).join('')}
          <tr style="border-top:2px solid var(--border)">
            <td><strong>Total</strong></td>
            <td style="font-family:'JetBrains Mono',monospace"><strong>${active.length}</strong></td>
            <td style="font-family:'JetBrains Mono',monospace"><strong>${fmtCurrency(getTotalDailySpend())}</strong></td>
            <td style="font-family:'JetBrains Mono',monospace"><strong>${fmtCurrency(getTotalDailySpend()*21)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function switchCWTab(event, panelId) {
  document.querySelectorAll('.cw-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(panelId).style.display = 'block';
  event.target.classList.add('active');
}
