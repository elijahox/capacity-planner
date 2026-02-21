// ================================================================
// PEOPLE REGISTER VIEW
// ================================================================

function renderPeople() {
  const filter = document.getElementById('people-type-filter')?.value || 'all';

  let filtered = people.filter(p => p.status === 'active');
  if (filter === 'perm') filtered = filtered.filter(p => p.type === 'perm');
  if (filter === 'contractor') filtered = filtered.filter(p => p.type === 'contractor');
  if (filter === 'msp') filtered = filtered.filter(p => p.type === 'msp');

  return `
    <div class="section-header">
      <div>
        <div class="section-title">People Register</div>
        <div class="section-sub">${people.filter(p=>p.status==='active').length} active people across all squads</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <select class="form-select" style="width:180px" id="people-type-filter" onchange="renderContent()">
          <option value="all">All types</option>
          <option value="perm">Permanent only</option>
          <option value="contractor">Contractors only</option>
          <option value="msp">MSP/Consultants only</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="openAddPersonModal(null)">+ Add Person</button>
      </div>
    </div>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Squad</th><th>Tribe</th><th>Type</th><th>Day Rate</th><th>Agency</th><th>End Date</th><th>Next Action</th><th>Action Status</th></tr></thead>
        <tbody>
          ${filtered.map(p => {
            const sq = squads.find(s => s.id === p.squad);
            const tribe = sq ? TRIBES.find(t => t.id === sq.tribe) : null;
            return `<tr onclick="openPersonModal('${p.id}')">
              <td><strong>${p.name}</strong></td>
              <td style="color:var(--text-muted)">${p.role}</td>
              <td>${sq ? sq.name : '—'}</td>
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
            ${squads.map(s=>`<option value="${s.id}" ${s.id===p.squad?'selected':''}>${s.name}</option>`).join('')}
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
  p.name = document.getElementById('pm-name').value;
  p.role = document.getElementById('pm-role').value;
  p.type = document.getElementById('pm-type').value;
  p.squad = document.getElementById('pm-squad').value;
  p.dayRate = parseFloat(document.getElementById('pm-rate').value) || null;
  p.agency = document.getElementById('pm-agency').value || null;
  p.startDate = document.getElementById('pm-start').value || null;
  p.endDate = document.getElementById('pm-end').value || null;
  p.status = document.getElementById('pm-status').value;
  p.nextAction = document.getElementById('pm-action').value || null;
  p.actionStatus = document.getElementById('pm-actstatus').value || null;
  p.comments = document.getElementById('pm-comments').value;
  closeModal();
  renderContent();
  renderSidebar();
}

function deletePerson(id) {
  if (!confirm('Remove this person from the register? This will affect squad capacity calculations.')) return;
  people = people.filter(p => p.id !== id);
  closeModal();
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
  const newPerson = {
    id: 'p_' + Date.now(),
    name,
    role: document.getElementById('np-role').value,
    squad: document.getElementById('np-squad').value,
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
