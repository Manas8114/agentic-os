// Per-Agent Kanban — Task board filtered by agent assignee
let agentKanbanState = {
  activeAgent: 'opencode',
  filterPriority: 'all',
  filterCategory: 'all',
  filterText: '',
  columnsObj: {},
  allTasks: [],
};

const agentMetaKanban = {
  opencode: { icon: '🔧', name: 'opencode', color: 'blue', desc: 'Code & DevOps' },
  hermes: { icon: '⚡', name: 'Hermes', color: 'purple', desc: 'Memory & Scheduling' },
  gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green', desc: 'Research & Analysis' },
  claude: { icon: '🤖', name: 'Claude', color: 'orange', desc: 'Strategy & Architecture' },
};

async function renderAgentKanban() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Per-Agent Kanban</h1>
        <p class="page-subtitle">Task board filtered by agent assignee</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="showAddAgentKanbanTask()">+ Add Task</button>
        <button class="btn btn-ghost" onclick="loadAgentKanban()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Agent Switcher -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:12px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <strong style="font-size:14px">Assignee:</strong>
          <div class="agent-switcher" style="display:flex;gap:8px">
            ${Object.keys(agentMetaKanban).map(key => `
              <button class="agent-switch-btn ${key === 'opencode' ? 'active' : ''}"
                      onclick="switchAgentKanban('${key}')"
                      style="padding:8px 16px;border-radius:var(--radius);border:1px solid var(--border);background:${key === 'opencode' ? 'var(--accent-glow)' : 'var(--bg-card)'};color:${key === 'opencode' ? 'var(--accent)' : 'var(--text-primary)'};font-weight:600;cursor:pointer;transition:var(--transition)"
                      data-agent="${key}">
                ${agentMetaKanban[key].icon} ${agentMetaKanban[key].name}
              </button>
            `).join('')}
          </div>
          <div style="margin-left:auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <input class="form-input" id="agentKanbanFilter" placeholder="Filter tasks..." oninput="filterAgentKanban()" style="max-width:220px">
            <select class="form-select" id="agentKanbanPriority" onchange="filterAgentKanban()" style="width:110px">
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select class="form-select" id="agentKanbanCategory" onchange="filterAgentKanban()" style="width:130px">
              <option value="all">All</option>
              <option value="development">Development</option>
              <option value="devops">DevOps</option>
              <option value="study">Study</option>
              <option value="content">Content</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board" id="agentKanbanBoard">
      <div class="skeleton" style="height:400px"></div>
    </div>
  `;

  await loadAgentKanban();
}

async function loadAgentKanban() {
  try {
    // Add assignee filter to API call
    const agent = agentKanbanState.activeAgent;
    let url = `/api/kanban/board?assignee=${encodeURIComponent(agent)}`;
    const data = await fetch(url, {
      headers: { 'X-API-Key': 'dev-api-key-change-in-production' }
    }).then(r => r.json());
    
    agentKanbanState.columnsObj = data.columns || {};
    agentKanbanState.allTasks = Object.values(agentKanbanState.columnsObj).flat();
    renderAgentKanbanBoard();
  } catch (err) {
    const board = document.getElementById('agentKanbanBoard');
    if (board) board.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Failed to load</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

function switchAgentKanban(agentName) {
  agentKanbanState.activeAgent = agentName;
  
  // Update buttons
  document.querySelectorAll('.agent-switch-btn').forEach(btn => {
    const isActive = btn.dataset.agent === agentName;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--accent-glow)' : 'var(--bg-card)';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--text-primary)';
  });
  
  // Reset filters
  const filterEl = document.getElementById('agentKanbanFilter');
  if (filterEl) filterEl.value = '';
  const priorityEl = document.getElementById('agentKanbanPriority');
  if (priorityEl) priorityEl.value = 'all';
  const categoryEl = document.getElementById('agentKanbanCategory');
  if (categoryEl) categoryEl.value = 'all';
  
  loadAgentKanban();
}

function filterAgentKanban() {
  renderAgentKanbanBoard();
}

function renderAgentKanbanBoard() {
  const board = document.getElementById('agentKanbanBoard');
  if (!board) return;
  
  const columnsObj = agentKanbanState.columnsObj || {};
  const columns = Object.keys(columnsObj);
  
  const filterText = (document.getElementById('agentKanbanFilter')?.value || '').toLowerCase();
  const filterPriority = document.getElementById('agentKanbanPriority')?.value || 'all';
  const filterCategory = document.getElementById('agentKanbanCategory')?.value || 'all';
  
  const columnLabels = { triage: 'Triage', todo: 'To Do', ready: 'Ready', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done', backlog: 'Backlog', review: 'Review' };
  const columnIcons = { triage: '🔍', todo: '📝', ready: '✅', in_progress: '🔄', blocked: '🚫', done: '🎉', backlog: '📋', review: '🔍' };

  board.innerHTML = columns.map(col => {
    let colTasks = (columnsObj[col] || []).filter(t => {
      if (filterText) return (t.title || '').toLowerCase().includes(filterText) || (t.body || t.description || '').toLowerCase().includes(filterText);
      return true;
    }).filter(t => filterPriority === 'all' || (t.priority || 'medium') === filterPriority)
      .filter(t => filterCategory === 'all' || (t.category || 'general') === filterCategory);
    
    // Also ensure assignee matches active agent (for safety)
    colTasks = colTasks.filter(t => (t.assignee || '').toLowerCase() === agentKanbanState.activeAgent.toLowerCase());

    return `
      <div class="kanban-column" data-column="${col}">
        <div class="kanban-column-header">
          <div class="kanban-column-title">
            <span>${columnIcons[col] || '📌'}</span>
            ${columnLabels[col] || col}
            <span class="kanban-count">${colTasks.length}</span>
          </div>
        </div>
        <div class="kanban-column-body" ondragover="event.preventDefault()" ondrop="onAgentKanbanDrop(event, '${col}')">
          ${colTasks.length === 0 ? `<div class="kanban-empty">No tasks</div>` :
            colTasks.map(t => `
              <div class="kanban-card" draggable="true" ondragstart="onAgentKanbanDrag(event, '${t.id}')" onclick="showAgentKanbanDetail('${t.id}')">
                <div class="kanban-card-header">
                  <span class="kanban-priority priority-${t.priority || 'medium'}">${t.priority || 'medium'}</span>
                </div>
                <div class="kanban-card-title">${escapeHtml(t.title)}</div>
                ${t.body ? `<div class="kanban-card-desc">${escapeHtml(t.body.substring(0, 80))}${t.body.length > 80 ? '...' : ''}</div>` : ''}
                <div class="kanban-card-meta">
                  ${t.assignee ? `<span>👤 ${escapeHtml(t.assignee)}</span>` : ''}
                </div>
                ${t.status === 'blocked' ? `<div class="kanban-blocked-badge">🚫 Blocked</div>` : ''}
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

let agentKanbanDraggedId = null;
function onAgentKanbanDrag(e, id) {
  agentKanbanDraggedId = id;
  e.dataTransfer.effectAllowed = 'move';
}

async function onAgentKanbanDrop(e, status) {
  e.preventDefault();
  if (!agentKanbanDraggedId) return;
  try {
    await api.updateKanbanTask(agentKanbanDraggedId, { status });
    agentKanbanDraggedId = null;
    loadAgentKanban();
  } catch (err) {
    showToast('Failed to move task: ' + err.message, 'error');
  }
}

function showAgentKanbanDetail(id) {
  const task = agentKanbanState.allTasks?.find(t => t.id === id);
  if (!task) return;
  
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <div class="modal-title">${escapeHtml(task.title)}</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <span class="badge badge-${task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning'}">${task.status}</span>
            <span class="kanban-priority priority-${task.priority || 'medium'}">${task.priority}</span>
            ${task.status === 'blocked' ? `<span class="badge badge-danger">🚫 Blocked</span>` : ''}
          </div>
          ${task.body ? `<div style="margin-bottom:12px;color:var(--text-secondary);font-size:13px">${escapeHtml(task.body)}</div>` : ''}
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;font-size:12px">
            ${task.assignee ? `<span>👤 <strong>${escapeHtml(task.assignee)}</strong></span>` : ''}
            <span>📅 <strong>${task.created || 'N/A'}</strong></span>
            ${task.completed_at ? `<span>✅ <strong>${task.completed_at}</strong></span>` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${task.status !== 'done' ? `<button class="btn btn-sm btn-primary" onclick="completeKanbanTask('${task.id}')">✅ Mark Done</button>` : ''}
            ${task.status !== 'blocked' ? `<button class="btn btn-sm btn-ghost" onclick="blockKanbanTask('${task.id}')">🚫 Block</button>` : `<button class="btn btn-sm btn-ghost" onclick="unblockKanbanTask('${task.id}')">🔓 Unblock</button>`}
            <button class="btn btn-sm btn-ghost" onclick="deleteKanbanTask('${task.id}')" style="color:var(--red)">🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function showAddAgentKanbanTask() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <div class="modal-title">Add Task for ${agentKanbanState.activeAgent}</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input class="form-input" id="agentKanbanTitle" placeholder="e.g., Implement login page">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="agentKanbanDescription" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="agentKanbanStatus">
                <option value="triage">Triage</option>
                <option value="todo">To Do</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="agentKanbanPriority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-select" id="agentKanbanCategory">
                <option value="general">General</option>
                <option value="development">Development</option>
                <option value="devops">DevOps</option>
                <option value="study">Study</option>
                <option value="content">Content</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Assigned To</label>
            <input class="form-input" id="agentKanbanAssigned" value="${agentKanbanState.activeAgent}" style="text-transform:lowercase" readonly>
            <div class="form-hint">Automatically set to current agent</div>
          </div>
          <div class="form-group">
            <label class="form-label">Target Date</label>
            <input class="form-input" id="agentKanbanDate" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">Tags (comma separated)</label>
            <input class="form-input" id="agentKanbanTags" placeholder="e.g., frontend, api">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createAgentKanbanTask()">Add Task</button>
        </div>
      </div>
    </div>
  `;
}

async function createAgentKanbanTask() {
  const title = document.getElementById('agentKanbanTitle').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }
  const tagsStr = document.getElementById('agentKanbanTags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  try {
    await api.createKanbanTask({
      title,
      body: document.getElementById('agentKanbanDescription').value.trim(),
      status: document.getElementById('agentKanbanStatus').value,
      priority: document.getElementById('agentKanbanPriority').value,
      assignee: agentKanbanState.activeAgent,
      category: document.getElementById('agentKanbanCategory').value,
      tags: tags,
    });
    showToast('Task added!', 'success');
    closeModal();
    loadAgentKanban();
  } catch (err) {
    showToast('Failed to create task: ' + err.message, 'error');
  }
}

async function completeKanbanTask(id) {
  try {
    await api.completeKanbanTask(id);
    closeModal();
    loadAgentKanban();
    showToast('Task completed! ✅', 'success');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function blockKanbanTask(id) {
  try {
    await api.blockKanbanTask(id);
    closeModal();
    loadAgentKanban();
    showToast('Task blocked 🚫', 'warning');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function unblockKanbanTask(id) {
  try {
    await api.unblockKanbanTask(id);
    closeModal();
    loadAgentKanban();
    showToast('Task unblocked 🔓', 'success');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteKanbanTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api.deleteKanbanTask(id);
    closeModal();
    loadAgentKanban();
    showToast('Task deleted', 'info');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

// Expose globally
window.renderAgentKanban = renderAgentKanban;
window.loadAgentKanban = loadAgentKanban;
window.switchAgentKanban = switchAgentKanban;
window.filterAgentKanban = filterAgentKanban;
window.showAddAgentKanbanTask = showAddAgentKanbanTask;
window.createAgentKanbanTask = createAgentKanbanTask;
window.completeKanbanTask = completeKanbanTask;
window.blockKanbanTask = blockKanbanTask;
window.unblockKanbanTask = unblockKanbanTask;
window.deleteKanbanTask = deleteKanbanTask;
window.showAgentKanbanDetail = showAgentKanbanDetail;