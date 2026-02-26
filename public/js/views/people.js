// ================================================================
// PEOPLE REGISTER VIEW
// ================================================================

let _peopleFilter = 'all';
let _peopleFilterActive = false;

function setPeopleFilter(v) {
  _peopleFilter = v;
  _peopleFilterActive = true;
  renderContent();
}

function renderPeople() {
  if (!_peopleFilterActive) _peopleFilter = 'all';
  _peopleFilterActive = false;
  const filter = _peopleFilter;

  let filtered = people.filter(p => p.status === 'active');
  if (filter === 'perm')    filtered = filtered.filter(p => p.type === 'perm');
  if (filter === 'nonperm') filtered = filtered.filter(p => p.type === 'contractor' || p.type === 'msp');

  const btnStyle = 'border-radius:999px';
  return `
    <div class="section-header">
      <div>
        <div class="section-title">People Register</div>
        <div class="section-sub">${people.filter(p=>p.status==='active').length} active people across all squads</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm ${filter==='all'    ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPeopleFilter('all')">All</button>
          <button class="btn btn-sm ${filter==='perm'   ? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPeopleFilter('perm')">Permanent</button>
          <button class="btn btn-sm ${filter==='nonperm'? 'btn-primary' : 'btn-secondary'}" style="${btnStyle}" onclick="setPeopleFilter('nonperm')">Contractors &amp; MSP</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openCsvImportModal()">↑ Import CSV</button>
        <button class="btn btn-primary btn-sm" onclick="openAddPersonModal(null)">+ Add Person</button>
      </div>
    </div>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Squad</th><th>2nd Squad</th><th>Tribe</th><th>Type</th><th>Day Rate</th><th>Agency</th><th>End Date</th><th>Next Action</th><th>Action Status</th></tr></thead>
        <tbody>
          ${filtered.map(p => {
            const sq = squads.find(s => s.id === p.squad);
            const secSq = p.secondarySquad ? squads.find(s => s.id === p.secondarySquad) : null;
            const tribe = sq ? TRIBES.find(t => t.id === sq.tribe) : null;
            return `<tr onclick="openPersonModal('${p.id}')">
              <td><strong>${p.name}</strong></td>
              <td style="color:var(--text-muted)">${p.role}</td>
              <td>${sq ? sq.name : '—'}</td>
              <td>${secSq ? secSq.name : '—'}</td>
              <td>${tribe ? `<span style="display:flex;align-items:center;gap:5px"><div style="width:7px;height:7px;border-radius:50%;background:${tribe.color}"></div>${tribe.name}</span>` : '—'}</td>
              <td><span class="badge ${getTypeClass(p.type)}">${getTypeLabel(p.type)}</span></td>
              <td style="font-family:'JetBrains Mono',monospace">${fmtCurrency(p.dayRate)}</td>
              <td>${p.agency || '—'}</td>
              <td class="${p.endDate ? getExpiryClass(p.endDate) : ''}">${p.endDate ? getExpiryLabel(p.endDate) : '—'}</td>
              <td>${p.nextAction ? `<span class="badge ${getActionClass(p.nextAction)}">${p.nextAction}</span>` : '—'}</td>
              <td>${p.actionStatus ? `<span class="badge badge-grey">${p.actionStatus}</span>` : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Leadership cleanup helper ─────────────────────────────────
// Removes a person from all tribe leadership slots. Called on
// delete and when a squad change is saved from the People Register.
function removePersonFromLeadership(personId) {
  Object.keys(tribeLeadership).forEach(tribeId => {
    if (Array.isArray(tribeLeadership[tribeId])) {
      tribeLeadership[tribeId] = tribeLeadership[tribeId].map(
        id => (id === personId ? null : id)
      );
    }
  });
}

// --- Person detail/edit modal ---
function openPersonModal(id) {
  const p = people.find(x=>x.id===id);
  if (!p) return;
  const sq = squads.find(s=>s.id===p.squad);
  openModal(`
    <div class="modal-header">
      <div class="modal-title">${p.name}</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:10px;margin-bottom:18px">
        <span class="badge ${getTypeClass(p.type)}">${getTypeLabel(p.type)}</span>
        <span class="badge badge-grey">${p.role}</span>
        ${sq ? `<span class="badge badge-grey">${sq.name}</span>` : ''}
      </div>
      <div class="form-grid">
        <div class="form-group">
          <div class="form-label">Name</div>
          <input class="form-input" id="pm-name" value="${p.name}" />
        </div>
        <div class="form-group">
          <div class="form-label">Role</div>
          <input class="form-input" id="pm-role" value="${p.role}" />
        </div>
        <div class="form-group">
          <div class="form-label">Type</div>
          <select class="form-select" id="pm-type">
            <option value="perm" ${p.type==='perm'?'selected':''}>Permanent</option>
            <option value="contractor" ${p.type==='contractor'?'selected':''}>Contractor</option>
            <option value="msp" ${p.type==='msp'?'selected':''}>Consultant (MSP)</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Squad</div>
          <select class="form-select" id="pm-squad">
            <option value="" ${!p.squad?'selected':''}>— Unassigned —</option>
            ${squads.map(s=>`<option value="${s.id}" ${s.id===p.squad?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Secondary Squad</div>
          <select class="form-select" id="pm-squad2">
            <option value="" ${!p.secondarySquad?'selected':''}>— None —</option>
            ${squads.map(s=>`<option value="${s.id}" ${s.id===p.secondarySquad?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Day Rate (ex GST)</div>
          <input class="form-input" id="pm-rate" type="number" value="${p.dayRate||''}" placeholder="e.g. 1200" />
        </div>
        <div class="form-group">
          <div class="form-label">Agency</div>
          <input class="form-input" id="pm-agency" value="${p.agency||''}" />
        </div>
        <div class="form-group">
          <div class="form-label">Start Date</div>
          <input class="form-input" id="pm-start" type="date" value="${p.startDate||''}" />
        </div>
        <div class="form-group">
          <div class="form-label">End Date</div>
          <input class="form-input" id="pm-end" type="date" value="${p.endDate||''}" />
        </div>
        <div class="form-group">
          <div class="form-label">Status</div>
          <select class="form-select" id="pm-status">
            <option value="active" ${p.status==='active'?'selected':''}>Active</option>
            <option value="inactive" ${p.status==='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Next Action</div>
          <select class="form-select" id="pm-action">
            <option value="" ${!p.nextAction?'selected':''}>— None —</option>
            <option value="Extend" ${p.nextAction==='Extend'?'selected':''}>Extend</option>
            <option value="Roll Off" ${p.nextAction==='Roll Off'?'selected':''}>Roll Off</option>
            <option value="Convert" ${p.nextAction==='Convert'?'selected':''}>Convert to Perm</option>
            <option value="New Hire" ${p.nextAction==='New Hire'?'selected':''}>New Hire</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Action Status</div>
          <select class="form-select" id="pm-actstatus">
            <option value="" ${!p.actionStatus?'selected':''}>— None —</option>
            <option value="Approved" ${p.actionStatus==='Approved'?'selected':''}>Approved</option>
            <option value="Awaiting Approval" ${p.actionStatus==='Awaiting Approval'?'selected':''}>Awaiting Approval</option>
            <option value="Pending" ${p.actionStatus==='Pending'?'selected':''}>Pending</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-label">Comments</div>
        <textarea class="form-textarea" id="pm-comments">${p.comments||''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="deletePerson('${p.id}')">Remove Person</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePerson('${p.id}')">Save Changes</button>
    </div>`);
}

function savePerson(id) {
  const p = people.find(x=>x.id===id);
  if (!p) return;
  const newSquad = document.getElementById('pm-squad').value || null;
  // Squad edit takes precedence: if squad changes, remove from any leadership slot
  if (newSquad !== p.squad) {
    removePersonFromLeadership(id);
  }
  const secSquad = document.getElementById('pm-squad2').value || null;
  p.name = document.getElementById('pm-name').value;
  p.role = document.getElementById('pm-role').value;
  p.type = document.getElementById('pm-type').value;
  p.squad = newSquad;
  p.secondarySquad = (secSquad && secSquad !== newSquad) ? secSquad : null;
  p.dayRate = parseFloat(document.getElementById('pm-rate').value) || null;
  p.agency = document.getElementById('pm-agency').value || null;
  p.startDate = document.getElementById('pm-start').value || null;
  p.endDate = document.getElementById('pm-end').value || null;
  p.status = document.getElementById('pm-status').value;
  p.nextAction = document.getElementById('pm-action').value || null;
  p.actionStatus = document.getElementById('pm-actstatus').value || null;
  p.comments = document.getElementById('pm-comments').value;
  closeModal();
  scheduleSave();
  renderContent();
  renderSidebar();
}

function deletePerson(id) {
  if (!confirm('Remove this person from the register? This will affect squad capacity calculations.')) return;
  removePersonFromLeadership(id);
  people = people.filter(p => p.id !== id);
  closeModal();
  scheduleSave();
  renderContent();
  renderSidebar();
}

function openAddPersonModal(squadId) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Add Person</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <div class="form-label">Name</div>
          <input class="form-input" id="np-name" placeholder="Full name" />
        </div>
        <div class="form-group">
          <div class="form-label">Role</div>
          <input class="form-input" id="np-role" placeholder="e.g. Senior Engineer" />
        </div>
        <div class="form-group">
          <div class="form-label">Type</div>
          <select class="form-select" id="np-type">
            <option value="perm">Permanent</option>
            <option value="contractor">Contractor</option>
            <option value="msp">Consultant (MSP)</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Squad</div>
          <select class="form-select" id="np-squad">
            ${squads.map(s=>`<option value="${s.id}" ${s.id===squadId?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Secondary Squad</div>
          <select class="form-select" id="np-squad2">
            <option value="">— None —</option>
            ${squads.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <div class="form-label">Day Rate (ex GST)</div>
          <input class="form-input" id="np-rate" type="number" placeholder="e.g. 1200" />
        </div>
        <div class="form-group">
          <div class="form-label">Agency</div>
          <input class="form-input" id="np-agency" placeholder="e.g. AKQA, Iterate" />
        </div>
        <div class="form-group">
          <div class="form-label">Start Date</div>
          <input class="form-input" id="np-start" type="date" />
        </div>
        <div class="form-group">
          <div class="form-label">End Date</div>
          <input class="form-input" id="np-end" type="date" />
        </div>
        <div class="form-group">
          <div class="form-label">Next Action</div>
          <select class="form-select" id="np-action">
            <option value="">— None —</option>
            <option value="Extend">Extend</option>
            <option value="Roll Off">Roll Off</option>
            <option value="Convert">Convert to Perm</option>
            <option value="New Hire">New Hire</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addPerson()">Add to Register</button>
    </div>`);
}

function addPerson() {
  const name = document.getElementById('np-name').value.trim();
  if (!name) { alert('Name is required'); return; }
  const npSquad = document.getElementById('np-squad').value;
  const npSec = document.getElementById('np-squad2').value || null;
  const newPerson = {
    id: 'p_' + Date.now(),
    name,
    role: document.getElementById('np-role').value,
    squad: npSquad,
    secondarySquad: (npSec && npSec !== npSquad) ? npSec : null,
    type: document.getElementById('np-type').value,
    dayRate: parseFloat(document.getElementById('np-rate').value) || null,
    agency: document.getElementById('np-agency').value || null,
    startDate: document.getElementById('np-start').value || null,
    endDate: document.getElementById('np-end').value || null,
    status: 'active',
    nextAction: document.getElementById('np-action').value || null,
    actionStatus: null,
    comments: '',
  };
  people.push(newPerson);
  closeModal();
  renderContent();
  renderSidebar();
}

// ── CSV Import ────────────────────────────────────────────────────

function openCsvImportModal() {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Import CSV — People Register</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" id="csv-modal-body">
      <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#92400e">
        <strong>⚠ Note:</strong> Contractor and MSP records will be <strong>updated or created</strong> by matching on name.
        Permanent staff are <strong>never modified</strong> by this import.
      </div>
      <div class="form-group">
        <div class="form-label">Select CSV file</div>
        <input type="file" accept=".csv" id="csv-file-input" style="font-size:13px" />
      </div>
      <div style="margin-top:18px">
        <div class="form-label" style="margin-bottom:8px">Expected CSV columns</div>
        <table class="data-table compact" style="font-size:12px">
          <thead><tr><th>CSV Column</th><th>Field</th></tr></thead>
          <tbody>
            <tr><td>Name</td><td>name — used to match existing records</td></tr>
            <tr><td>Role</td><td>role</td></tr>
            <tr><td>Squad</td><td>squad (matched by name, fuzzy)</td></tr>
            <tr><td>Type</td><td>type — Contractor / Consultant (MSP)</td></tr>
            <tr><td>Day Rate</td><td>dayRate — strips $, commas</td></tr>
            <tr><td>Agency</td><td>agency</td></tr>
            <tr><td>Start Date</td><td>startDate → YYYY-MM-DD</td></tr>
            <tr><td>End Date</td><td>endDate → YYYY-MM-DD</td></tr>
            <tr><td>Next Action</td><td>nextAction</td></tr>
            <tr><td>Action Status</td><td>actionStatus</td></tr>
            <tr><td>Comments</td><td>comments</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer" id="csv-modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="processCsvImport()">Import</button>
    </div>`);
}

function processCsvImport() {
  const fileInput = document.getElementById('csv-file-input');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert('Please select a CSV file first.');
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const result = importPeopleFromCsv(text);

    // Update modal body with summary
    const body = document.getElementById('csv-modal-body');
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;padding:24px 0">
          <div style="font-size:32px;margin-bottom:12px">✓</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">Import complete</div>
          <div style="font-size:14px;color:var(--text-muted)">
            ${result.added + result.updated} records processed
            &nbsp;·&nbsp; <strong>${result.added}</strong> added
            &nbsp;·&nbsp; <strong>${result.updated}</strong> updated
            &nbsp;·&nbsp; <strong>${result.skipped}</strong> skipped
          </div>
        </div>`;
    }
    // Replace footer with just Done
    const footer = document.getElementById('csv-modal-footer');
    if (footer) {
      footer.innerHTML = `<button class="btn btn-primary" onclick="closeModal()">Done</button>`;
    }

    renderContent();
    renderSidebar();
    scheduleSave();
  };
  reader.readAsText(file);
}

function importPeopleFromCsv(csvText) {
  const rows = parseCSV(csvText);
  let added = 0, updated = 0, skipped = 0;

  rows.forEach(row => {
    // Skip blank rows
    const name = (row['Name'] || '').trim();
    if (!name) { skipped++; return; }

    // Determine type — skip if row says perm
    const type = parseCsvType(row['Type']);
    if (type === 'perm') { skipped++; return; }

    // Build record
    const record = {
      name,
      role:         row['Role']          || '',
      squad:        matchSquadByName(row['Squad']) || '',
      type,
      dayRate:      parseCsvDayRate(row['Day Rate']),
      agency:       row['Agency']        || null,
      startDate:    parseCsvDate(row['Start Date']),
      endDate:      parseCsvDate(row['End Date']),
      status:       'active',
      nextAction:   row['Next Action']   || null,
      actionStatus: row['Action Status'] || null,
      comments:     row['Comments']      || '',
    };

    // Find existing non-perm record by name (case-insensitive)
    const existing = people.find(
      p => p.type !== 'perm' && p.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      Object.assign(existing, record);
      updated++;
    } else {
      people.push({ id: 'p_' + Date.now() + '_' + added, ...record });
      added++;
    }
  });

  return { added, updated, skipped };
}
