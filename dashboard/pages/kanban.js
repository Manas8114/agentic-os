let kanbanData = null;

async function renderKanban() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Kanban Board</h1>
        <p class="mc-subtitle">Visual task management — track, prioritize, and organize work</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="mc-btn primary" onclick="showAddKanbanTask()">+ Add Task</button>
        <button class="mc-btn" onclick="renderKanban()">🔄 Refresh</button>
      </div>
    </div>
    <div class="mc-toolbar" style="display:flex;gap:12px;margin-bottom:24px;">
      <input class="mc-input" id="kanbanFilterInput" placeholder="Filter tasks..." oninput="filterKanbanTasks()" style="flex:1;max-width:280px">
      <select class="mc-input" id="kanbanFilterPriority" onchange="filterKanbanTasks()" style="width:120px">
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select class="mc-input" id="kanbanFilterCategory" onchange="filterKanbanTasks()" style="width:140px">
        <option value="all">All Categories</option>
        <option value="development">Development</option>
        <option value="devops">DevOps</option>
        <option value="study">Study</option>
        <option value="content">Content</option>
        <option value="general">General</option>
      </select>
    </div>
    <div class="kanban-board" id="kanbanBoard" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:16px;min-height:400px;scrollbar-width:thin;">
      <div class="skeleton" style="height:400px;width:100%"></div>
    </div>
  `;
  await loadKanbanData();
}

async function loadKanbanData() {
  try {
    const data = await api.getKanbanBoard();
    kanbanData = data;
    renderKanbanBoard();
  } catch (err) {
    const board = document.getElementById('kanbanBoard');
    if (board) board.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Failed to load kanban</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

function renderKanbanBoard() {
  const board = document.getElementById('kanbanBoard');
  if (!board || !kanbanData) return;
  const columnsObj = kanbanData.columns || {};
  const columns = Object.keys(columnsObj);
  const allTasks = kanbanData.tasks || Object.values(columnsObj).flat();
  const filterText = (document.getElementById('kanbanFilterInput')?.value || '').toLowerCase();
  const filterPriority = document.getElementById('kanbanFilterPriority')?.value || 'all';
  const filterCategory = document.getElementById('kanbanFilterCategory')?.value || 'all';
  const columnLabels = { triage: 'Triage', todo: 'To Do', ready: 'Ready', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done', backlog: 'Backlog', review: 'Review' };
  const columnIcons = { triage: '🔍', todo: '📝', ready: '✅', in_progress: '🔄', blocked: '🚫', done: '🎉', backlog: '📋', review: '🔍' };
  board.innerHTML = columns.map(col => {
    let colTasks = (columnsObj[col] || []).filter(t => {
      if (filterText) return (t.title || '').toLowerCase().includes(filterText) || (t.body || t.description || '').toLowerCase().includes(filterText);
      return true;
    }).filter(t => filterPriority === 'all' || (t.priority || 'medium') === filterPriority)
      .filter(t => filterCategory === 'all' || (t.category || 'general') === filterCategory);
      
    // Determine priority dot color
    const getPriorityColor = (p) => {
      if (p === 'high') return 'var(--red)';
      if (p === 'medium') return 'var(--yellow)';
      return 'var(--text-muted)';
    };

    return `
      <div class="mc-kanban-column" data-column="${col}" style="flex:0 0 300px;display:flex;flex-direction:column;gap:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div class="kanban-column-header" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">
          <div>
            <span>${columnIcons[col] || '📌'}</span>
            ${columnLabels[col] || col}
          </div>
          <span class="mc-badge" style="background:var(--bg-card);color:var(--text-muted);border-radius:4px;padding:2px 6px;">${colTasks.length}</span>
        </div>
        <div class="kanban-column-body" ondragover="event.preventDefault()" ondrop="onKanbanDrop(event, '${col}')" style="flex:1;display:flex;flex-direction:column;gap:8px;min-height:100px;">
          ${colTasks.length === 0 ? `<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;border:1px dashed var(--border);border-radius:6px;">No tasks</div>` :
            colTasks.map(t => `
              <div class="mc-card" draggable="true" ondragstart="onKanbanDrag(event, '${t.id}')" onclick="showKanbanDetail('${t.id}')" style="cursor:grab;padding:12px;background:var(--bg-panel);border:1px solid var(--border);transition:border-color 0.2s;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="mc-dot" style="background:${getPriorityColor(t.priority || 'medium')}"></span>
                    <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">${t.priority || 'medium'}</span>
                  </div>
                  ${t.status === 'blocked' ? `<span class="mc-badge" style="background:rgba(239,68,68,0.1);color:var(--red);">🚫 Blocked</span>` : ''}
                </div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:6px;line-height:1.4;">${escapeHtml(t.title)}</div>
                ${t.body ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">${escapeHtml(t.body.substring(0, 80))}${t.body.length > 80 ? '...' : ''}</div>` : ''}
                <div style="display:flex;justify-content:flex-end;font-size:11px;color:var(--text-muted);">
                  ${t.assignee ? `<span>👤 ${escapeHtml(t.assignee)}</span>` : ''}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function showAddKanbanTask() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <div class="modal-title">Add Kanban Task</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input class="form-input" id="kanbanTitle" placeholder="e.g., Implement login page">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="kanbanDescription" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="kanbanStatus">
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
              <select class="form-select" id="kanbanPriority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-select" id="kanbanCategory">
                <option value="general">General</option>
                <option value="development">Development</option>
                <option value="devops">DevOps</option>
                <option value="study">Study</option>
                <option value="content">Content</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Assigned To</label>
              <input class="form-input" id="kanbanAssigned" placeholder="e.g., opencode" style="text-transform:lowercase">
            </div>
            <div class="form-group">
              <label class="form-label">Target Date</label>
              <input class="form-input" id="kanbanDate" type="date">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tags (comma separated)</label>
            <input class="form-input" id="kanbanTags" placeholder="e.g., frontend, api">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createKanbanTask()">Add Task</button>
        </div>
      </div>
    </div>
  `;
}

async function createKanbanTask() {
  const title = document.getElementById('kanbanTitle').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }
  const tagsStr = document.getElementById('kanbanTags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  try {
    await api.createKanbanTask({
      title,
      body: document.getElementById('kanbanDescription').value.trim(),
      status: document.getElementById('kanbanStatus').value,
      priority: document.getElementById('kanbanPriority').value,
      assignee: document.getElementById('kanbanAssigned').value.trim(),
    });
    showToast('Task added to kanban board!', 'success');
    closeModal();
    renderKanban();
  } catch (err) {
    showToast('Failed to create task: ' + err.message, 'error');
  }
}

let kanbanDraggedId = null;
function onKanbanDrag(e, id) {
  kanbanDraggedId = id;
  e.dataTransfer.effectAllowed = 'move';
}
async function onKanbanDrop(e, status) {
  e.preventDefault();
  if (!kanbanDraggedId) return;
  try {
    await api.updateKanbanTask(kanbanDraggedId, { status });
    kanbanDraggedId = null;
    renderKanban();
  } catch (err) {
    showToast('Failed to move task: ' + err.message, 'error');
  }
}

function showKanbanDetail(id) {
  const task = kanbanData?.tasks?.find(t => t.id === id);
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

async function completeKanbanTask(id) {
  try {
    await api.completeKanbanTask(id);
    closeModal();
    renderKanban();
    showToast('Task completed! ✅', 'success');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function blockKanbanTask(id) {
  try {
    await api.blockKanbanTask(id);
    closeModal();
    renderKanban();
    showToast('Task blocked 🚫', 'warning');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function unblockKanbanTask(id) {
  try {
    await api.unblockKanbanTask(id);
    closeModal();
    renderKanban();
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
    renderKanban();
    showToast('Task deleted', 'info');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

function filterKanbanTasks() {
  renderKanbanBoard();
}
