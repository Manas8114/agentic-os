// Handoffs — View and manage agent handoffs
let handoffsState = {
  handoffs: [],
  filter: 'all',
  search: '',
};

// Main page render function (alias for app.js router)
async function renderHandoffsPage() {
  await renderHandoffs();
}

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
          <select id="handoffAgentFilter" class="form-select" onchange="filterHandoffs()" style="width:auto">
            <option value="all">All Agents</option>
            <option value="opencode">opencode</option>
            <option value="hermes">Hermes</option>
            <option value="gemini">Gemini CLI</option>
            <option value="codex">Codex</option>
            <option value="claude">Claude</option>
            <option value="openclaw">OpenClaw</option>
            <option value="jarvis">Jarvis</option>
            <option value="odysseus">Odysseus</option>
            <option value="antigravity">Antigravity</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Handoffs List -->
    <div class="card" style="max-height:calc(100vh - 280px);overflow:auto">
      <div class="card-body" style="padding:0" id="handoffsList">
        <div class="loading"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Handoff Detail Modal (initially hidden) -->
    <div id="handoffDetail" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px">
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;min-width:500px;max-width:90vw;max-height:80vh;overflow:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 id="handoffDetailTitle" style="margin:0">Handoff Details</h3>
          <button onclick="closeHandoffDetail()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted)">&times;</button>
        </div>
        <div id="handoffDetailBody"></div>
      </div>
    </div>
  `;

  await refreshHandoffs();
}

async function refreshHandoffs() {
  try {
    const data = await api.getHandoffs();
    handoffsState.handoffs = data.handoffs || [];
    filterHandoffs();
  } catch (e) {
    console.error(e);
    (document.getElementById('handoffsList') || {}).innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load handoffs</div></div>`;
  }
}

function filterHandoffs() {
  const search = document.getElementById('handoffSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('handoffFilter')?.value || 'all';
  const agent = document.getElementById('handoffAgentFilter')?.value || 'all';

  const filtered = handoffsState.handoffs.filter(h => {
    if (search && !JSON.stringify(h).toLowerCase().includes(search)) return false;
    if (status !== 'all' && h.status !== status) return false;
    if (agent !== 'all' && h.from_agent !== agent && h.to_agent !== agent) return false;
    return true;
  });

  renderHandoffsList(filtered);
}

function renderHandoffsList(list) {
  const el = document.getElementById('handoffsList');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:40px 24px;text-align:center"><div class="empty-state-icon">🔄</div><div class="empty-state-title">No handoffs found</div></div>';
    return;
  }
  el.innerHTML = list.map(h => `
    <div class="card" style="margin:8px 16px;cursor:pointer" onclick="viewHandoffDetail('${h.id}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="badge" style="font-size:11px;background:var(--blue-dim);color:var(--blue)">${h.from_agent}</span>
            <span style="font-size:18px;color:var(--accent)">→</span>
            <span class="badge" style="font-size:11px;background:var(--purple-dim);color:var(--purple)">${h.to_agent}</span>
          </div>
          <span class="badge" style="background:${h.status === 'completed' ? 'var(--green-dim)' : h.status === 'in_progress' ? 'var(--blue-dim)' : h.status === 'pending' ? 'var(--yellow-dim)' : 'var(--red-dim)'};color:${h.status === 'completed' ? 'var(--green)' : h.status === 'in_progress' ? 'var(--blue)' : h.status === 'pending' ? 'var(--yellow)' : 'var(--red)'};font-size:10px">${h.status.toUpperCase()}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">Task: ${h.task_id}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${escapeHtml(h.context_summary?.substring(0, 100) || '')}${h.context_summary?.length > 100 ? '...' : ''}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono)">${h.created}</div>
      </div>
    </div>
  `).join('');
}

function viewHandoffDetail(id) {
  const handoff = handoffsState.handoffs.find(h => h.id === id);
  if (!handoff) return;
  document.getElementById('handoffDetailTitle').textContent = `Handoff ${handoff.id}`;
  (document.getElementById('handoffDetailBody') || {}).innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><strong>From Agent:</strong><div style="font-family:var(--font-mono);font-size:12px">${handoff.from_agent}</div></div>
      <div><strong>To Agent:</strong><div style="font-family:var(--font-mono);font-size:12px">${handoff.to_agent}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><strong>Task ID:</strong><div style="font-family:var(--font-mono);font-size:12px">${handoff.task_id}</div></div>
      <div><strong>Status:</strong><span class="badge" style="background:${handoff.status === 'completed' ? 'var(--green-dim)' : handoff.status === 'in_progress' ? 'var(--blue-dim)' : handoff.status === 'pending' ? 'var(--yellow-dim)' : 'var(--red-dim)'};color:${handoff.status === 'completed' ? 'var(--green)' : handoff.status === 'in_progress' ? 'var(--blue)' : handoff.status === 'pending' ? 'var(--yellow)' : 'var(--red)'}">${handoff.status}</span></div>
    </div>
    <div style="margin-bottom:16px"><strong>Context Summary:</strong><pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;margin-top:8px">${escapeHtml(handoff.context_summary || '—')}</pre></div>
    <div style="margin-bottom:16px"><strong>Pending Decisions:</strong><pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;margin-top:8px">${escapeHtml(handoff.pending_decisions?.join('\n') || '—')}</pre></div>
    <div style="margin-bottom:16px"><strong>Output Files:</strong><pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;margin-top:8px">${escapeHtml(handoff.output_files?.join('\n') || '—')}</pre></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><strong>Created:</strong><div style="font-family:var(--font-mono);font-size:12px">${handoff.created}</div></div>
      <div><strong>Updated:</strong><div style="font-family:var(--font-mono);font-size:12px">${handoff.updated}</div></div>
    </div>
    ${handoff.status === 'pending' ? `
      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-primary" onclick="updateHandoffStatus('${handoff.id}', 'in_progress')">▶ Start</button>
        <button class="btn btn-danger" onclick="updateHandoffStatus('${handoff.id}', 'failed')">✕ Fail</button>
      </div>
    ` : ''}
    ${handoff.status === 'in_progress' ? `
      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn btn-success" onclick="updateHandoffStatus('${handoff.id}', 'completed')">✓ Complete</button>
        <button class="btn btn-danger" onclick="updateHandoffStatus('${handoff.id}', 'failed')">✕ Fail</button>
      </div>
    ` : ''}
  `;
  document.getElementById('handoffDetail').style.display = 'flex';
}

function closeHandoffDetail() {
  const detail = document.getElementById('handoffDetail');
  if (detail) detail.style.display = 'none';
  const body = document.getElementById('handoffDetailBody');
  if (body) body.innerHTML = '';
}

async function updateHandoffStatus(id, status) {
  try {
    await api.updateHandoff(id, { status });
    showToast(`Handoff marked as ${status}`, 'success');
    closeHandoffDetail();
    refreshHandoffs();
  } catch (e) { showToast(e.message, 'error'); }
}

function filterHandoffs() {
  const search = document.getElementById('handoffSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('handoffFilter')?.value || 'all';
  const agent = document.getElementById('handoffAgentFilter')?.value || 'all';

  const filtered = handoffsState.handoffs.filter(h => {
    if (search && !JSON.stringify(h).toLowerCase().includes(search)) return false;
    if (status !== 'all' && h.status !== status) return false;
    if (agent !== 'all' && h.from_agent !== agent && h.to_agent !== agent) return false;
    return true;
  });

  renderHandoffsList(filtered);
}

window.renderHandoffsPage = renderHandoffsPage;
window.refreshHandoffs = refreshHandoffs;
window.filterHandoffs = filterHandoffs;
window.viewHandoffDetail = viewHandoffDetail;
window.closeHandoffDetail = closeHandoffDetail;
window.updateHandoffStatus = updateHandoffStatus;