// Handoffs — View and manage agent handoffs
let handoffsState = {
  handoffs: [],
  filter: 'all',
  search: '',
};

async function renderHandoffs() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Handoffs</h1>
        <p class="page-subtitle">Track multi-agent workflow handoffs and context transfers</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="refreshHandoffs()">↻ Refresh</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:200px">
            <input type="text" id="handoffSearch" class="form-input" placeholder="Search handoffs..." oninput="filterHandoffs()">
          </div>
          <select id="handoffFilter" class="form-select" onchange="filterHandoffs()" style="width:auto">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-4" style="margin-bottom:24px" id="handoffStats"></div>

    <!-- Handoffs List -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Handoffs</h3>
      </div>
      <div class="card-body" style="padding:0">
        <div id="handoffsList"></div>
      </div>
    </div>

    <!-- Handoff Detail Modal (inline) -->
    <div id="handoffDetail" style="display:none"></div>
  `;

  await refreshHandoffs();
}

async function refreshHandoffs() {
  try {
    const data = await api.getHandoffs();
    handoffsState.handoffs = data.handoffs || [];
    renderStats();
    renderHandoffsList();
  } catch (err) {
    showToast('Failed to load handoffs: ' + err.message, 'error');
  }
}

function renderStats() {
  const container = document.getElementById('handoffStats');
  const all = handoffsState.handoffs;
  const pending = all.filter(h => h.status === 'pending').length;
  const inProgress = all.filter(h => h.status === 'in_progress').length;
  const completed = all.filter(h => h.status === 'completed').length;
  const failed = all.filter(h => h.status === 'failed').length;

  container.innerHTML = `
    <div class="stat-card"><div class="stat-value">${all.length}</div><div class="stat-label">Total</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--yellow)">${pending}</div><div class="stat-label">Pending</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${inProgress}</div><div class="stat-label">In Progress</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--green)">${completed}</div><div class="stat-label">Completed</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--red)">${failed}</div><div class="stat-label">Failed</div></div>
  `;
}

function filterHandoffs() {
  const search = document.getElementById('handoffSearch').value.toLowerCase();
  const filter = document.getElementById('handoffFilter').value;
  handoffsState.filter = filter;
  handoffsState.search = search;
  renderHandoffsList();
}

function renderHandoffsList() {
  const container = document.getElementById('handoffsList');

  let filtered = handoffsState.handoffs;
  if (handoffsState.filter !== 'all') {
    filtered = filtered.filter(h => h.status === handoffsState.filter);
  }
  if (handoffsState.search) {
    filtered = filtered.filter(h =>
      (h.from_agent || '').toLowerCase().includes(handoffsState.search) ||
      (h.to_agent || '').toLowerCase().includes(handoffsState.search) ||
      (h.context_summary || '').toLowerCase().includes(handoffsState.search) ||
      (h.task_id || '').toLowerCase().includes(handoffsState.search)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">🔄</div><div class="empty-state-title">No handoffs found</div></div>';
    return;
  }

  // Sort by created desc
  filtered.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));

  let html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg-card);border-bottom:1px solid var(--border)">';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">From → To</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Task ID</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Context Summary</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Step</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Status</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Created</th>';
  html += '<th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Actions</th>';
  html += '</tr></thead><tbody>';

  for (const h of filtered) {
    const statusColor = h.status === 'completed' ? 'var(--green)' :
      h.status === 'failed' ? 'var(--red)' :
      h.status === 'in_progress' ? 'var(--accent)' : 'var(--yellow)';
    const statusIcon = h.status === 'completed' ? '✓' : h.status === 'failed' ? '✕' : h.status === 'in_progress' ? '⟳' : '○';

    html += `
      <tr style="border-bottom:1px solid var(--border);transition:var(--transition)" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
        <td style="padding:12px;font-family:var(--font-mono);font-size:12px">${h.from_agent} → ${h.to_agent}</td>
        <td style="padding:12px;font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${h.task_id}</td>
        <td style="padding:12px;font-size:12px;color:var(--text-secondary);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.context_summary || '—'}</td>
        <td style="padding:12px;font-size:12px">${h.chain_step || '—'}</td>
        <td style="padding:12px"><span class="badge" style="background:${statusColor}">${statusIcon} ${h.status}</span></td>
        <td style="padding:12px;font-size:11px;color:var(--text-muted)">${formatDate(h.created)}</td>
        <td style="padding:12px">
          <button class="btn btn-ghost" onclick="viewHandoff('${h.id}')" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      </tr>
    `;
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function viewHandoff(handoffId) {
  try {
    const data = await api.getHandoff(handoffId);
    const h = data.handoff || data;

    const detail = document.getElementById('handoffDetail');
    const statusColor = h.status === 'completed' ? 'var(--green)' :
      h.status === 'failed' ? 'var(--red)' :
      h.status === 'in_progress' ? 'var(--accent)' : 'var(--yellow)';

    detail.style.display = 'block';
    detail.innerHTML = `
      <div class="card" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1000;min-width:600px;max-width:80vw;max-height:80vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3)">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Handoff Details</h3>
          <button class="btn btn-ghost" onclick="closeHandoffDetail()">✕</button>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">ID</label>
              <div style="font-family:var(--font-mono);font-size:12px">${h.id}</div>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Status</label>
              <div><span class="badge" style="background:${statusColor}">${h.status}</span></div>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">From Agent</label>
              <div style="font-weight:600">${h.from_agent}</div>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">To Agent</label>
              <div style="font-weight:600">${h.to_agent}</div>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Task ID</label>
              <div style="font-family:var(--font-mono);font-size:12px">${h.task_id}</div>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Chain Step</label>
              <div>${h.chain_step || '—'}</div>
            </div>
            <div style="grid-column:span 2">
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Created</label>
              <div>${formatDate(h.created)}</div>
            </div>
            <div style="grid-column:span 2">
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Updated</label>
              <div>${formatDate(h.updated)}</div>
            </div>
          </div>

          <div style="margin-bottom:16px">
            <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Context Summary</label>
            <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;white-space:pre-wrap">${escapeHtml(h.context_summary || '—')}</div>
          </div>

          <div style="margin-bottom:16px">
            <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Pending Decisions</label>
            <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;white-space:pre-wrap">${escapeHtml(Array.isArray(h.pending_decisions) ? h.pending_decisions.join('\n') : (h.pending_decisions || '—'))}</div>
          </div>

          <div style="margin-bottom:16px">
            <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Output Files</label>
            <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;white-space:pre-wrap;font-family:var(--font-mono)">${escapeHtml(Array.isArray(h.output_files) ? h.output_files.join('\n') : (h.output_files || '—'))}</div>
          </div>

          ${h.output ? `
            <div>
              <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Output</label>
              <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:11px;max-height:300px;overflow-y:auto;font-family:var(--font-mono);white-space:pre-wrap">${escapeHtml(h.output)}</div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal-overlay" onclick="closeHandoffDetail()" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999"></div>
    `;
  } catch (err) {
    showToast('Failed to load handoff: ' + err.message, 'error');
  }
}

function closeHandoffDetail() {
  const detail = document.getElementById('handoffDetail');
  detail.style.display = 'none';
  detail.innerHTML = '';
}

window.renderHandoffsPage = renderHandoffsPage;