// ================================================================
// UTILS — helper functions (dates, formatting, computed values)
// ================================================================

function today() { return new Date(); }

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr) - today()) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {day:'numeric',month:'short',year:'2-digit'});
}

function fmtCurrency(n) {
  if (!n) return '—';
  return '$' + n.toLocaleString();
}

// Headcount for a squad from the people register
function getSquadHeadcount(squadId) {
  return people.filter(p => p.squad === squadId && p.status === 'active').length;
}

// Squad size = people register count (live) + any manual buffer
function getEffectiveSquadSize(squadId) {
  const fromPeople = getSquadHeadcount(squadId);
  const sq = squads.find(s => s.id === squadId);
  const peopleCount = fromPeople > 0 ? fromPeople : (sq ? sq.size : 0);
  return peopleCount;
}

function getSquadAllocation(squadId) {
  let total = 0;
  let breakdown = [];
  initiatives.forEach(init => {
    const pct = (init.allocations || {})[squadId];
    if (pct > 0) {
      total += pct;
      breakdown.push({ initiative: init, pct });
    }
  });
  scenarios.forEach(s => {
    if (s.squadId === squadId) {
      total += s.delta;
      breakdown.push({ initiative: { id: 'sc_' + s.id, name: '⚡ ' + s.label, tier: 3, status: 'Delivery' }, pct: s.delta });
    }
  });
  return { total, breakdown };
}

function utilColor(pct) {
  if (pct > 100) return '#c0392b';
  if (pct >= 85)  return '#1e8449';
  if (pct >= 50)  return '#d68910';
  return '#b0ada5';
}

function utilClass(pct) {
  if (pct > 100) return 'badge-red';
  if (pct >= 85)  return 'badge-green';
  if (pct >= 50)  return 'badge-amber';
  return 'badge-grey';
}

function utilLabel(pct) {
  if (pct > 100) return 'Over-allocated';
  if (pct >= 85)  return 'Healthy';
  if (pct >= 50)  return 'Partial';
  return 'Under-utilised';
}

function getTierClass(t) { return ['','badge-tier1','badge-tier2','badge-tier3'][t]||'badge-tier3'; }
function getTierLabel(t) { return ['','T1 Program','T2 Project','T3 Product'][t]||'T3'; }

function getStatusClass(s) {
  return {Delivery:'badge-green','Business Case':'badge-amber',Assess:'badge-purple','High Level Design':'badge-grey'}[s]||'badge-grey';
}

function getExpiryClass(d) {
  const days = daysUntil(d);
  if (days < 0) return 'expiry-urgent';
  if (days <= 14) return 'expiry-urgent';
  if (days <= 45) return 'expiry-soon';
  return 'expiry-ok';
}

function getExpiryLabel(d) {
  const days = daysUntil(d);
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  if (days <= 14) return `${days}d left ⚠️`;
  if (days <= 45) return `${days}d left`;
  return fmtDate(d);
}

function getTypeClass(t) {
  return { perm: 'badge-perm', contractor: 'badge-contractor', msp: 'badge-msp' }[t] || 'badge-grey';
}
function getTypeLabel(t) {
  return { perm: 'Permanent', contractor: 'Contractor', msp: 'Consultant (MSP)' }[t] || t;
}

function getActionClass(a) {
  return { Extend: 'badge-green', 'Roll Off': 'badge-red', Convert: 'badge-amber', 'New Hire': 'badge-blue' }[a] || 'badge-grey';
}

const SEG_COLORS = ['#1a5276','#1e8449','#6c3483','#c17f24','#c0392b','#148f77','#7d3c98','#d35400','#1a5276','#7f8c8d','#2980b9','#27ae60'];

function getContractorsExpiringSoon(days = 30) {
  return people.filter(p => p.type !== 'perm' && p.status === 'active' && daysUntil(p.endDate) <= days && daysUntil(p.endDate) >= 0);
}

function getTotalDailySpend() {
  return people.filter(p => p.type !== 'perm' && p.status === 'active' && p.dayRate)
    .reduce((a, p) => a + p.dayRate, 0);
}
