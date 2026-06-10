// Notification Center — Persistent notification history with priorities & channels
const NotificationCenter = (function() {
  let notifications = [];
  let filters = {
    priority: 'all',
    channel: 'all',
    read: 'all',
    search: '',
  };
  let sortDesc = true;

  // Default channels
  const CHANNELS = {
    system: { label: 'System', icon: '⚙️', color: 'purple' },
    skills: { label: 'Skills', icon: '⚡', color: 'blue' },
    agents: { label: 'Agents', icon: '🤖', color: 'green' },
    scheduler: { label: 'Scheduler', icon: '⏱', color: 'orange' },
    chat: { label: 'Chat', icon: '💬', color: 'pink' },
    audit: { label: 'Audit', icon: '📋', color: 'yellow' },
    handoff: { label: 'Handoffs', icon: '🔄', color: 'purple' },
    backup: { label: 'Backups', icon: '💾', color: 'blue' },
    cost: { label: 'Cost', icon: '💰', color: 'green' },
    security: { label: 'Security', icon: '🔒', color: 'red' },
  };

  // Priority levels
  const PRIORITIES = {
    critical: { label: 'Critical', icon: '🔴', color: 'red', order: 4, ttl: 0 },      // Never auto-dismiss
    high: { label: 'High', icon: '🟠', color: 'orange', order: 3, ttl: 300000 },      // 5 min
    normal: { label: 'Normal', icon: '🟡', color: 'yellow', order: 2, ttl: 10000 },    // 10 sec
    low: { label: 'Low', icon: '🟢', color: 'green', order: 1, ttl: 5000 },            // 5 sec
  };

  // Load from localStorage
  function load() {
    try {
      const stored = localStorage.getItem('agentic_notifications');
      if (stored) {
        notifications = JSON.parse(stored);
        // Migrate old format if needed
        notifications = notifications.map(n => ({
          ...n,
          priority: n.priority || 'normal',
          channel: n.channel || 'system',
          read: n.read !== undefined ? n.read : false,
          actions: n.actions || [],
        }));
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
      notifications = [];
    }
  }

  // Save to localStorage
  function save() {
    try {
      localStorage.setItem('agentic_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
  }

  // Create notification
  function notify(options) {
    const {
      title,
      message,
      priority = 'normal',
      channel = 'system',
      actions = [],
      persistent = false,
      source = null, // e.g., { type: 'skill_run', id: '...' }
    } = options;

    const notification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      priority,
      channel,
      actions,
      persistent,
      source,
      read: false,
      dismissed: false,
      timestamp: new Date().toISOString(),
    };

    notifications.unshift(notification);
    // Keep max 500
    if (notifications.length > 500) notifications = notifications.slice(0, 500);
    save();

    // Also show as toast if not persistent
    if (!persistent) {
      showToast(message, priority === 'critical' || priority === 'high' ? 'error' : priority);
    }

    // Auto-dismiss based on priority TTL
    if (!persistent && PRIORITIES[priority]?.ttl > 0) {
      setTimeout(() => dismiss(notification.id, true), PRIORITIES[priority].ttl);
    }

    // Trigger UI update if page is open
    if (window.renderNotificationCenter) {
      window.renderNotificationCenter();
    }

    return notification.id;
  }

  // Dismiss notification
  function dismiss(id, auto = false) {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      notifications[idx].dismissed = true;
      notifications[idx].dismissedAt = new Date().toISOString();
      notifications[idx].autoDismissed = auto;
      save();
      if (window.renderNotificationCenter) window.renderNotificationCenter();
    }
  }

  // Mark as read
  function markRead(id) {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      notifications[idx].read = true;
      notifications[idx].readAt = new Date().toISOString();
      save();
      if (window.renderNotificationCenter) window.renderNotificationCenter();
    }
  }

  // Mark all as read
  function markAllRead() {
    let changed = false;
    for (const n of notifications) {
      if (!n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) {
      save();
      if (window.renderNotificationCenter) window.renderNotificationCenter();
    }
  }

  // Clear all dismissed
  function clearDismissed() {
    const before = notifications.length;
    notifications = notifications.filter(n => !n.dismissed);
    if (notifications.length !== before) {
      save();
      if (window.renderNotificationCenter) window.renderNotificationCenter();
    }
  }

  // Execute notification action
  function executeAction(notificationId, actionId) {
    const n = notifications.find(n => n.id === notificationId);
    if (!n || !n.actions) return;

    const action = n.actions.find(a => a.id === actionId);
    if (!action || !action.handler) return;

    try {
      action.handler(n);
      markRead(notificationId);
    } catch (e) {
      console.error('Action failed:', e);
    }
  }

  // Filter notifications
  function getFiltered() {
    let result = [...notifications];

    if (filters.priority !== 'all') {
      result = result.filter(n => n.priority === filters.priority);
    }
    if (filters.channel !== 'all') {
      result = result.filter(n => n.channel === filters.channel);
    }
    if (filters.read === 'unread') {
      result = result.filter(n => !n.read);
    } else if (filters.read === 'read') {
      result = result.filter(n => n.read);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.channel.toLowerCase().includes(q)
      );
    }

    // Sort by priority order then timestamp
    result.sort((a, b) => {
      const pa = PRIORITIES[a.priority]?.order || 0;
      const pb = PRIORITIES[b.priority]?.order || 0;
      if (pa !== pb) return sortDesc ? pb - pa : pa - pb;
      return sortDesc
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp);
    });

    return result;
  }

  // Set filter
  function setFilter(key, value) {
    filters[key] = value;
    if (window.renderNotificationCenter) window.renderNotificationCenter();
  }

  // Toggle sort
  function toggleSort() {
    sortDesc = !sortDesc;
    if (window.renderNotificationCenter) window.renderNotificationCenter();
  }

  // Get stats
  function getStats() {
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read && !n.dismissed).length,
      critical: notifications.filter(n => n.priority === 'critical' && !n.dismissed).length,
      high: notifications.filter(n => n.priority === 'high' && !n.dismissed).length,
      byChannel: Object.keys(CHANNELS).reduce((acc, ch) => {
        acc[ch] = notifications.filter(n => n.channel === ch && !n.dismissed).length;
        return acc;
      }, {}),
    };
  }

  // Render page
  async function render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Notification Center</h1>
          <p class="page-subtitle">Persistent notification history with priorities & channels</p>
        </div>
        <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="window.NotificationCenter.markAllRead()" id="markAllReadBtn">
            ✓ Mark All Read
          </button>
          <button class="btn btn-ghost" onclick="window.NotificationCenter.clearDismissed()">
            🗑 Clear Dismissed
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="card" style="margin-bottom:16px" id="notifStatsBar">
        <div class="loading"><div class="loading-spinner"></div></div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:16px">
          <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
            <div style="flex:1;min-width:200px">
              <input type="text" id="notifSearch" class="form-input" placeholder="Search notifications..." oninput="debounceNotifFilter()">
            </div>
            <select id="notifPriorityFilter" class="form-select" onchange="window.NotificationCenter.setFilter('priority', this.value)" style="width:auto">
              <option value="all">All Priorities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="normal">🟡 Normal</option>
              <option value="low">🟢 Low</option>
            </select>
            <select id="notifChannelFilter" class="form-select" onchange="window.NotificationCenter.setFilter('channel', this.value)" style="width:auto">
              <option value="all">All Channels</option>
              <option value="system">⚙️ System</option>
              <option value="skills">⚡ Skills</option>
              <option value="agents">🤖 Agents</option>
              <option value="scheduler">⏱ Scheduler</option>
              <option value="chat">💬 Chat</option>
              <option value="audit">📋 Audit</option>
              <option value="handoff">🔄 Handoffs</option>
              <option value="backup">💾 Backups</option>
              <option value="cost">💰 Cost</option>
              <option value="security">🔒 Security</option>
            </select>
            <select id="notifReadFilter" class="form-select" onchange="window.NotificationCenter.setFilter('read', this.value)" style="width:auto">
              <option value="all">All</option>
              <option value="unread">🔔 Unread</option>
              <option value="read">✓ Read</option>
            </select>
            <button class="btn btn-ghost" onclick="window.NotificationCenter.toggleSort()" title="Toggle sort order">
              ${sortDesc ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>
        </div>
      </div>

      <!-- Notification List -->
      <div class="card" style="display:flex;height:calc(100vh - 320px);min-height:400px">
        <!-- List (left) -->
        <div style="width:420px;min-width:420px;max-width:420px;border-right:1px solid var(--border);overflow-y:auto;background:var(--bg-primary)" id="notifListPanel">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-secondary);display:flex;align-items:center;justify-content:space-between">
            <strong>Notifications</strong>
            <span class="badge" id="notifCount">0</span>
          </div>
          <div id="notifList" style="padding:8px"></div>
        </div>

        <!-- Detail (right) -->
        <div style="flex:1;overflow-y:auto;background:var(--bg-primary)">
          <div id="notifDetail" style="padding:24px">
            <div class="empty-state" style="padding:60px 20px;text-align:center">
              <div class="empty-state-icon">🔔</div>
              <div class="empty-state-title">Select a notification</div>
              <div class="empty-state-desc">Click a notification on the left to view details and actions</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize from localStorage
    load();
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderList();
  }

  function renderStats() {
    const stats = getStats();
    const container = document.getElementById('notifStatsBar');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
        <div style="display:flex;gap:24px">
          <div><strong>${stats.total}</strong> <span style="color:var(--text-muted);font-size:12px">total</span></div>
          <div><strong style="color:var(--red)">${stats.critical}</strong> <span style="color:var(--text-muted);font-size:12px">critical</span></div>
          <div><strong style="color:var(--orange)">${stats.high}</strong> <span style="color:var(--text-muted);font-size:12px">high</span></div>
          <div><strong style="color:var(--blue)">${stats.unread}</strong> <span style="color:var(--text-muted);font-size:12px">unread</span></div>
        </div>
        <div style="display:flex;gap:8px;font-size:11px">
          ${Object.entries(CHANNELS).map(([key, meta]) => `
            <span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color})" title="${meta.label}">
              ${meta.icon} ${stats.byChannel[key] || 0}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderList() {
    const container = document.getElementById('notifList');
    const countEl = document.getElementById('notifCount');
    if (!container) return;

    const filtered = getFiltered();
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:40px 20px;text-align:center"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications</div><div class="empty-state-desc">No notifications match current filters</div></div>';
      return;
    }

    container.innerHTML = filtered.map(n => {
      const meta = CHANNELS[n.channel] || { icon: '📌', color: 'accent' };
      const pri = PRIORITIES[n.priority] || { icon: '🟡', color: 'yellow', label: 'Normal' };
      const timeAgo = formatTimeAgo(n.timestamp);
      const isUnread = !n.read && !n.dismissed;

      return `
        <div class="notif-item ${isUnread ? 'unread' : ''} ${n.dismissed ? 'dismissed' : ''} ${n.priority}"
             onclick="window.NotificationCenter.select '${n.id}'"
             style="padding:12px;border-radius:var(--radius);margin-bottom:4px;cursor:pointer;transition:var(--transition);border-left:3px solid var(--${pri.color});background:${isUnread ? 'var(--accent-glow)' : 'transparent'}"
             onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='${isUnread ? 'var(--accent-glow)' : 'transparent'}'">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="font-size:14px;margin-top:2px;flex-shrink:0">${pri.icon}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.title)}</span>
                <span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color});font-size:9px">${meta.icon} ${meta.label}</span>
                <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${timeAgo}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.message.substring(0, 120))}</div>
              <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                ${n.read ? '' : '<span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:8px">Unread</span>'}
                ${n.dismissed ? '<span class="badge" style="background:var(--border);color:var(--text-muted);font-size:8px">Dismissed</span>' : ''}
                ${n.persistent ? '<span class="badge" style="background:var(--purple-dim);color:var(--purple);font-size:8px">Persistent</span>' : ''}
                ${n.actions?.length ? '<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:8px">Actions</span>' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function formatTimeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString();
  }

  function select(id) {
    const n = notifications.find(n => n.id === id);
    if (!n) return;

    const container = document.getElementById('notifDetail');
    if (!container) return;

    const meta = CHANNELS[n.channel] || { icon: '📌', color: 'accent' };
    const pri = PRIORITIES[n.priority] || { icon: '🟡', color: 'yellow', label: 'Normal' };

    // Mark as read
    if (!n.read) markRead(id);

    // Update list highlight
    document.querySelectorAll('.notif-item').forEach(el => {
      el.style.borderLeftColor = '';
      el.style.background = '';
    });
    const selectedEl = Array.from(document.querySelectorAll('.notif-item')).find(el =>
      el.onclick && el.onclick.toString().includes(id)
    );
    if (selectedEl) {
      selectedEl.style.borderLeftColor = `var(--${pri.color})`;
      selectedEl.style.background = 'var(--accent-glow)';
    }

    container.innerHTML = `
      <div style="max-width:700px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
          <div style="width:44px;height:44px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--${pri.color}-dim);color:var(--${pri.color});flex-shrink:0">${pri.icon}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <h3 style="font-size:16px;margin:0">${escapeHtml(n.title)}</h3>
              <span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color})">${meta.icon} ${meta.label}</span>
              <span class="badge" style="background:var(--${pri.color}-dim);color:var(--${pri.color})">${pri.label}</span>
              ${n.read ? '' : '<span class="badge" style="background:var(--blue-dim);color:var(--blue)">Unread</span>'}
              ${n.dismissed ? '<span class="badge" style="background:var(--border);color:var(--text-muted)">Dismissed</span>' : ''}
              ${n.persistent ? '<span class="badge" style="background:var(--purple-dim);color:var(--purple)">Persistent</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted);display:flex;gap:16px;flex-wrap:wrap">
              <span>${formatTimeAgo(n.timestamp)} · ${new Date(n.timestamp).toLocaleString()}</span>
              <span>ID: ${n.id}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:14px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${escapeHtml(n.message)}</div>

        ${n.source ? `
          <div style="margin-bottom:20px;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;color:var(--text-secondary)">
            <strong>Source:</strong> ${n.source.type || 'unknown'} ${n.source.id ? `(#${n.source.id})` : ''}
          </div>
        ` : ''}

        ${n.actions?.length > 0 ? `
          <div style="margin-bottom:20px">
            <h4 style="font-size:13px;margin:0 0 12px;color:var(--text-secondary)">Available Actions</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${n.actions.map(a => `
                <button class="btn ${a.primary ? 'btn-primary' : 'btn-ghost'}"
                        onclick="window.NotificationCenter.executeAction('${n.id}', '${a.id}')"
                        style="font-size:12px">
                  ${a.icon || ''} ${a.label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="window.NotificationCenter.dismiss('${n.id}')">🗑 Dismiss</button>
          <button class="btn btn-ghost" onclick="window.NotificationCenter.markRead('${n.id}')" ${n.read ? 'disabled' : ''}>${n.read ? '✓' : '🔔'} ${n.read ? 'Read' : 'Mark Read'}</button>
          ${n.source?.type === 'skill_run' ? `<button class="btn btn-primary" onclick="window.NotificationCenter.viewSkillRun('${n.source.id}')">🔍 View Run</button>` : ''}
          ${n.source?.type === 'handoff' ? `<button class="btn btn-primary" onclick="window.NotificationCenter.viewHandoff('${n.source.id}')">🔄 View Handoff</button>` : ''}
        </div>
      </div>
    `;
  }

  // Public action handlers
  function viewSkillRun(runId) {
    // Navigate to skill-chain or skills page
    navigate('skill-chain');
    showToast(`Navigate to Skill Chains to see run ${runId}`, 'info');
  }

  function viewHandoff(handoffId) {
    navigate('handoffs');
    showToast(`Navigate to Handoffs to see ${handoffId}`, 'info');
  }

  // Debounced filter
  let filterTimer = null;
  function debounceNotifFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      const val = document.getElementById('notifSearch')?.value || '';
      setFilter('search', val);
    }, 300);
  }

  // Initialize on load
  load();

  // Public API
  return {
    notify,
    dismiss,
    markRead,
    markAllRead,
    clearDismissed,
    executeAction,
    setFilter,
    toggleSort,
    select,
    viewSkillRun,
    viewHandoff,
    render: render,  // Changed from renderAll to render to match app.js expectation
    getStats,
    getFiltered,
  };
})();

// Expose render function globally for app.js
window.renderNotificationCenter = NotificationCenter.render.bind(NotificationCenter);

// Enhanced showToast that also logs to notification center
const originalShowToast = window.showToast;
window.showToast = function(message, type = 'info') {
  originalShowToast(message, type);

  // Map toast types to priorities
  const priorityMap = {
    error: 'high',
    warning: 'normal',
    success: 'low',
    info: 'low',
  };

  // Also add to notification center for persistence
  if (window.NotificationCenter && window.NotificationCenter.notify) {
    window.NotificationCenter.notify({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message,
      priority: priorityMap[type] || 'normal',
      channel: 'system',
    });
  }
};

// Expose globally
window.NotificationCenter = NotificationCenter;

// Also expose for backward compatibility with existing showToast calls
window._originalShowToast = originalShowToast;