// ================================================================
// UTILS — helper functions (dates, formatting, computed values)
// ================================================================

// Discipline mapping — maps roles to capacity disciplines
// Order matters: delivery before engineering so "Engineering Manager" matches
// delivery (not the generic "Engineer" in engineering).
const DISCIPLINE_MAP = {
  delivery: [
    'Delivery Lead',
    'Delivery Manager',
    'Senior Manager Delivery',
    'Engineering Manager',
    'Head of Customer Platforms',
  ],
  qe: [
    'Quality Engineer',
    'Snr QE/Automation',
  ],
  product: [
    'Product Manager',
    'Senior Product Manager',
    'Senior Manager Product',
    'Product Designer',
    'Senior Product Designer',
    'Principal Product Designer',
    'Product Design Lead',
    'Business Analyst',
    'Senior Business Analyst',
    'Lead Business Analyst',
    'Associate BA',
    'Design Researcher',
    'Lead Design Researcher',
  ],
  engineering: [
    'Engineer',
    'Senior Engineer',
    'Lead Engineer',
    'Principal Engineer',
    'Senior Engineer (BE)',
    'Engineer (BE)',
    'Senior Engineer (.NET)',
    'Engineer (SF)',
    'Tech Lead',
    'Acting Tech Lead',
    'Platform Engineer',
    'Senior Platform Engineer',
  ],
};

function getDiscipline(role) {
  for (const [discipline, roles] of Object.entries(DISCIPLINE_MAP)) {
    if (roles.some(r => role?.toLowerCase().includes(r.toLowerCase()))) return discipline;
  }
  return 'other';
}

function getSquadDisciplineCounts(squadId) {
  const counts = { engineering: 0, qe: 0, product: 0, delivery: 0, other: 0 };
  people.forEach(p => {
    if (p.status !== 'active' || p.isVacant) return;
    let weight = 0;
    if (p.squad === squadId) weight = p.secondarySquad ? 0.5 : 1;
    else if (p.secondarySquad === squadId) weight = 0.5;
    if (weight === 0) return;
    const discipline = getDiscipline(p.role);
    counts[discipline] += weight;
  });
  return counts;
}

function getSquadVacancies(squadId) {
  let total = 0, approved = 0, pending = 0;
  people.forEach(p => {
    if (p.status !== 'active' || !p.isVacant) return;
    if (p.squad !== squadId && p.secondarySquad !== squadId) return;
    total++;
    if (p.vacancyStatus === 'approved') approved++;
    else pending++;
  });
  return { total, approved, pending };
}

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
// Split-squad members count 0.5 in each squad
function getSquadHeadcount(squadId) {
  let count = 0;
  people.forEach(p => {
    if (p.status !== 'active' || p.isVacant) return;
    if (p.squad === squadId) count += (p.secondarySquad ? 0.5 : 1);
    else if (p.secondarySquad === squadId) count += 0.5;
  });
  return count;
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
  return { total, breakdown };
}

// Committed headcount = (total allocation % / 100) * squad.size baseline
function getCommittedHeadcount(squadId) {
  const sq = squads.find(s => s.id === squadId);
  const baseline = sq ? sq.size : 0;
  const { total } = getSquadAllocation(squadId);
  return (total / 100) * baseline;
}

// RAG status: green = fully staffed, amber = 1-2 below, red = 3+ below or >100% alloc
function getSquadRAG(squadId) {
  const actual = getEffectiveSquadSize(squadId);
  const committed = getCommittedHeadcount(squadId);
  const { total } = getSquadAllocation(squadId);
  if (total > 100) return 'red';
  const gap = committed - actual;
  if (gap <= 0) return 'green';
  if (gap <= 2) return 'amber';
  return 'red';
}

// Returns a coloured RAG pill with dot + percentage as inline HTML
function ragPill(rag, pct) {
  const colors = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' };
  const col = colors[rag] || colors.green;
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:700;
    padding:2px 8px;border-radius:10px;background:color-mix(in srgb, ${col} 15%, transparent);color:${col};
    white-space:nowrap;line-height:1.2" title="${rag.toUpperCase()}"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${col}"></span>${Math.round(pct)}%</span>`;
}

// Simple RAG dot (no percentage) for compact use
function ragDot(rag) {
  const colors = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' };
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[rag] || colors.green}" title="${rag.toUpperCase()}"></span>`;
}

function utilColor(pct) {
  if (pct > 100) return '#ef4444'; // --red
  if (pct >= 85)  return '#10b981'; // --green
  if (pct >= 50)  return '#f59e0b'; // --amber
  return '#94a3b8';                 // --text-dim
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
  return people.filter(p => p.type !== 'perm' && p.status === 'active' && !p.isVacant && daysUntil(p.endDate) <= days && daysUntil(p.endDate) >= 0);
}

function getTotalDailySpend() {
  return people.filter(p => p.type !== 'perm' && p.status === 'active' && !p.isVacant && p.dayRate)
    .reduce((a, p) => a + p.dayRate, 0);
}

// ================================================================
// CSV IMPORT HELPERS
// ================================================================

// Parse a CSV string into an array of objects keyed by header row.
// Handles quoted fields that may contain commas or newlines.
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let cur = '';
  let inQuotes = false;
  const rawRows = [];
  let rowStart = 0;

  // Split into raw rows respecting quoted fields
  for (let i = 0; i < lines.length; i++) {
    const ch = lines[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      rawRows.push(lines.slice(rowStart, i));
      rowStart = i + 1;
    }
  }
  rawRows.push(lines.slice(rowStart)); // last row

  // Parse each raw row into fields
  function splitRow(row) {
    const fields = [];
    let field = '';
    let q = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (q && row[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else q = !q;
      } else if (ch === ',' && !q) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const nonEmpty = rawRows.filter(r => r.trim());
  if (nonEmpty.length < 2) return [];

  const headers = splitRow(nonEmpty[0]).map(h => h.trim());
  for (let i = 1; i < nonEmpty.length; i++) {
    const fields = splitRow(nonEmpty[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (fields[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

// Parse various date formats to YYYY-MM-DD, or null.
function parseCsvDate(str) {
  if (!str || !str.trim()) return null;
  str = str.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or D/M/YY
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${year}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }

  // DD-MMM-YY or DD-MMM-YYYY (e.g. 12-Mar-26, 12-Mar-2026)
  const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                   jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  m = str.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) {
      const year = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${year}-${mon}-${m[1].padStart(2,'0')}`;
    }
  }

  // Month D, YYYY (e.g. March 12, 2026)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

// Strip $, commas, spaces and parse as a float. Returns null if empty/NaN.
function parseCsvDayRate(str) {
  if (!str || !str.trim()) return null;
  const n = parseFloat(str.replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

// Map a CSV Type string to our internal type value.
function parseCsvType(str) {
  if (!str) return 'contractor';
  const s = str.trim().toLowerCase();
  if (s === 'permanent' || s === 'perm') return 'perm';
  if (s === 'consultant (msp)' || s === 'msp' || s === 'consultant') return 'msp';
  return 'contractor';
}

// ================================================================
// ASSIGNMENT-BASED CAPACITY
// ================================================================

// Returns all initiative assignments for a given person.
// Only counts approved/in_delivery initiatives.
function getPersonAssignments(personId) {
  const assignments = [];
  let totalAllocated = 0;
  initiatives.forEach(init => {
    const ps = init.pipelineStatus || 'in_delivery';
    if (ps !== 'approved' && ps !== 'in_delivery') return;
    (init.estimatedRoles || []).forEach(r => {
      if (r.personId !== personId) return;
      const alloc = r.allocation != null ? r.allocation : 100;
      totalAllocated += alloc;
      assignments.push({
        initiativeId: init.id,
        initiativeName: init.name,
        allocation: alloc,
        role: r.role || '',
      });
    });
  });
  return {
    personId,
    totalAllocated,
    remaining: Math.max(0, 100 - totalAllocated),
    assignments,
  };
}

// Returns Dev+QE capacity and assignment-based utilisation for a squad.
function getSquadAvailableCapacity(squadId) {
  const todayDate = new Date();
  const devQePeople = [];

  people.forEach(p => {
    if (p.status !== 'active' || p.isVacant) return;
    const disc = getDiscipline(p.role);
    if (disc !== 'engineering' && disc !== 'qe') return;
    // Exclude contractors past endDate
    if (p.endDate && new Date(p.endDate) < todayDate) return;

    let weight = 0;
    if (p.squad === squadId) weight = p.secondarySquad ? 0.5 : 1;
    else if (p.secondarySquad === squadId) weight = 0.5;
    if (weight === 0) return;

    const pa = getPersonAssignments(p.id);
    // Only count allocation that reduces THIS squad's capacity
    // (use homeSquad on each assignment to determine which squad is affected)
    let allocForThisSquad = 0;
    pa.assignments.forEach(a => {
      const init = initiatives.find(i => i.id === a.initiativeId);
      if (!init) return;
      (init.estimatedRoles || []).forEach(r => {
        if (r.personId !== p.id) return;
        const alloc = r.allocation != null ? r.allocation : 100;
        // This role reduces the squad that matches homeSquad (or squad if no homeSquad)
        const affectedSquad = r.homeSquad || r.squad;
        if (affectedSquad === squadId) {
          allocForThisSquad += alloc;
        }
      });
    });

    devQePeople.push({
      personId: p.id,
      name: p.name,
      role: p.role,
      weight,
      totalAllocated: pa.totalAllocated,
      remaining: pa.remaining,
      allocForThisSquad,
      assignments: pa.assignments,
    });
  });

  const deliveryHeadcount = devQePeople.reduce((a, p) => a + p.weight, 0);
  const allocatedHeadcount = devQePeople.reduce((a, p) => a + (p.allocForThisSquad / 100) * p.weight, 0);
  const availableHeadcount = Math.max(0, deliveryHeadcount - allocatedHeadcount);
  const utilisationPct = deliveryHeadcount > 0 ? (allocatedHeadcount / deliveryHeadcount) * 100 : 0;

  return {
    squadId,
    deliveryHeadcount,
    allocatedHeadcount,
    availableHeadcount,
    utilisationPct,
    people: devQePeople,
  };
}

// Fuzzy-match a squad name string to a squadId. Returns null if no match.
function matchSquadByName(name) {
  if (!name || !name.trim()) return null;
  const needle = name.trim().toLowerCase();
  // Exact match first
  const exact = squads.find(s => s.name.toLowerCase() === needle);
  if (exact) return exact.id;
  // Partial contains match
  const partial = squads.find(s => s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase()));
  return partial ? partial.id : null;
}
