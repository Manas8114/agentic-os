async function renderAudit() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Audit Log</h1>
        <p class="mc-subtitle">Complete system activity trail</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="mc-btn" onclick="refreshAudit()">🔄 Refresh</button>
        <button class="mc-btn" onclick="clearAuditFilters()">✕ Clear</button>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <input id="auditFilter" class="mc-input" style="width:200px" placeholder="Filter by keyword..." oninput="applyAuditFilter()">
      <select id="auditActionFilter" class="mc-input" style="width:150px" onchange="applyAuditFilter()">
        <option value="">All Actions</option>
        <option value="skill_run">Skill Run</option>
        <option value="brain_update">Brain Update</option>
        <option value="job_created">Job Created</option>
        <option value="job_deleted">Job Deleted</option>
        <option value="backup_created">Backup Created</option>
        <option value="backup_restored">Backup Restored</option>
        <option value="plugin_installed">Plugin Installed</option>
        <option value="settings_updated">Settings Updated</option>
      </select>
    </div>
    <div id="auditTable"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  await refreshAudit();
}

let _allAuditEntries = [];

async function refreshAudit() {
  const container = document.getElementById('auditTable');
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  try {
    const r = await api.getAudit(200);
    _allAuditEntries = r.entries || [];
    applyAuditFilter();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function applyAuditFilter() {
  const q = (document.getElementById('auditFilter').value || '').toLowerCase();
  const action = document.getElementById('auditActionFilter').value;
  let filtered = _allAuditEntries;
  if (q) filtered = filtered.filter(e => JSON.stringify(e).toLowerCase().includes(q));
  if (action) filtered = filtered.filter(e => e.action === action);

  const container = document.getElementById('auditTable');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No audit entries found</div></div>';
    return;
  }

  container.innerHTML = `
    <div class="mc-card" style="padding:0;overflow:hidden;">
      <div class="table-wrapper" style="margin:0;">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:500;font-size:12px;text-transform:uppercase;">
              <th style="padding:12px 16px;">Time</th>
              <th style="padding:12px 16px;">Action</th>
              <th style="padding:12px 16px;">Details</th>
              <th style="padding:12px 16px;text-align:right;">ID</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.slice(0, 100).map((e, i) => `
              <tr style="${i !== Math.min(filtered.length, 100) - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.02);' : ''}">
                <td style="padding:12px 16px;font-size:12px;color:var(--text-muted);white-space:nowrap">${formatDate(e.timestamp)}</td>
                <td style="padding:12px 16px;"><span class="mc-badge" style="background:${e.action === 'skill_run' ? 'rgba(34,197,94,0.1)' : e.action === 'brain_update' ? 'rgba(56,189,248,0.1)' : e.action === 'backup_created' ? 'rgba(168,85,247,0.1)' : 'rgba(234,179,8,0.1)'};color:${e.action === 'skill_run' ? 'var(--green)' : e.action === 'brain_update' ? 'var(--cyan)' : e.action === 'backup_created' ? 'var(--purple)' : 'var(--yellow)'};">${e.action}</span></td>
                <td style="padding:12px 16px;font-size:13px;color:var(--text-primary);">${e.skill ? `<strong>${e.skill}</strong>` : ''}${e.file ? `File: ${e.file}` : ''}${e.job ? `Job: ${e.job}` : ''}${e.plugin ? `Plugin: ${e.plugin}` : ''}</td>
                <td style="padding:12px 16px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono);text-align:right;">${e.id || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);text-align:right;margin-top:12px">${filtered.length > 100 ? 'Showing 100 of ' : ''}${filtered.length} entries</div>
  `;
}

function clearAuditFilters() {
  document.getElementById('auditFilter').value = '';
  document.getElementById('auditActionFilter').value = '';
  applyAuditFilter();
}
