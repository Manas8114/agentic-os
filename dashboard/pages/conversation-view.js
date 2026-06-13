// Multi-Agent Conversation View — Threaded conversation with handoff visualization
// Cleanup: stop interval when navigating away
(function _cvSetupCleanup() {
  const prev = window._cvHashHandler;
  if (prev) window.removeEventListener('hashchange', prev);
  window._cvHashHandler = function() { stopConvAutoRefresh(); };
  window.addEventListener('hashchange', window._cvHashHandler);
})();

let conversationState = {
  messages: [],
  handoffs: {},
  agents: ['opencode', 'hermes', 'gemini', 'claude'],
  filterAgent: 'all',
  filterDate: 'all',
  searchQuery: '',
  grouped: [],
  selectedThread: null,
  autoRefresh: false,
  refreshInterval: null,
  splitInstance: null,
};

const agentMetaConversation = {
  opencode: { icon: '🔧', name: 'opencode', color: 'blue', desc: 'Code & DevOps' },
  hermes: { icon: '⚡', name: 'Hermes', color: 'purple', desc: 'Memory & Scheduling' },
  gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green', desc: 'Research & Analysis' },
  claude: { icon: '🤖', name: 'Claude', color: 'orange', desc: 'Strategy & Architecture' },
};

async function renderConversationView() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Multi-Agent Conversation View</h1>
        <p class="page-subtitle">Unified threaded conversations across all agents with handoff visualization</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label class="switch" title="Auto-refresh every 15s">
          <input type="checkbox" id="convAutoRefresh" onchange="toggleConvAutoRefresh()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted" style="margin-right:16px">Auto</span>
        <button class="btn btn-primary" onclick="loadConversations()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:200px">
            <input type="text" id="convSearch" class="form-input" placeholder="Search conversations..." oninput="debounceFilter()">
          </div>
          <select id="convAgentFilter" class="form-select" onchange="filterConversations()" style="width:auto">
            <option value="all">All Agents</option>
            <option value="opencode">🔧 opencode</option>
            <option value="hermes">⚡ Hermes</option>
            <option value="gemini">🧠 Gemini CLI</option>
            <option value="claude">🤖 Claude</option>
          </select>
          <select id="convDateFilter" class="form-select" onchange="filterConversations()" style="width:auto">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <label class="switch" title="Group by thread/task">
            <input type="checkbox" id="convGroupThreads" checked onchange="filterConversations()">
            <span class="switch-slider"></span>
          </label>
          <span class="text-sm text-muted">Threaded</span>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="card" style="margin-bottom:16px" id="convStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <!-- Split Pane Container -->
    <div id="convSplitContainer" class="dockable-split" style="height:calc(100vh - 380px);min-height:400px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg-primary)">
      <!-- Thread List Panel (Left) -->
      <div class="dockable-panel" id="threadListPanelWrapper" data-panel-id="threadList" data-panel-title="Conversation Threads" style="min-height:0;overflow:hidden;display:flex;flex-direction:column">
        <div class="dockable-panel-content" style="flex:1;overflow:auto;min-height:0">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-secondary)">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <strong style="font-size:13px">Conversation Threads</strong>
              <span class="badge" id="threadCount">0</span>
            </div>
          </div>
          <div id="threadList" style="padding:8px">
            <div class="loading" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Message View Panel (Right) -->
      <div class="dockable-panel" id="messageViewPanelWrapper" data-panel-id="messageView" data-panel-title="Message View" style="min-height:0;overflow:hidden;display:flex;flex-direction:column">
        <div class="dockable-panel-content" style="flex:1;overflow:auto;min-height:0">
          <div id="messageView" style="padding:24px">
            <div class="empty-state" style="padding:60px 20px;text-align:center">
              <div class="empty-state-icon">💬</div>
              <div class="empty-state-title">Select a thread</div>
              <div class="empty-state-desc">Click a conversation thread on the left to view messages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadConversations();

  // Initialize dockable panels after DOM is ready
  setTimeout(() => {
    const container = document.getElementById('convSplitContainer');
    if (container && window.DockablePanels) {
      conversationState.splitInstance = window.DockablePanels.init(container, {
        id: 'conv-split',
        direction: 'horizontal',
        panels: [
          { id: 'threadList', element: document.getElementById('threadListPanelWrapper'), minSize: 280, maxSize: 600 },
          { id: 'messageView', element: document.getElementById('messageViewPanelWrapper'), minSize: 300 },
        ],
        defaultSizes: [35, 65],
        persist: true,
      });
    }
  }, 0);

  if (document.getElementById('convAutoRefresh')?.checked) {
    startConvAutoRefresh();
  }
}

function toggleConvAutoRefresh() {
  const checked = document.getElementById('convAutoRefresh')?.checked;
  conversationState.autoRefresh = checked;
  if (checked) startConvAutoRefresh();
  else stopConvAutoRefresh();
}

function startConvAutoRefresh() {
  stopConvAutoRefresh();
  conversationState.refreshInterval = setInterval(loadConversations, 15000);
}

function stopConvAutoRefresh() {
  if (conversationState.refreshInterval) {
    clearInterval(conversationState.refreshInterval);
    conversationState.refreshInterval = null;
  }
}

let filterDebounceTimer = null;
function debounceFilter() {
  clearTimeout(filterDebounceTimer);
  filterDebounceTimer = setTimeout(filterConversations, 300);
}

async function loadConversations() {
  try {
    const [chatData, handoffsData] = await Promise.all([
      api.getChatHistory(),
      api.getHandoffs(),
    ]);

    conversationState.messages = chatData.messages || [];
    conversationState.handoffs = {};
    for (const h of handoffsData.handoffs || []) {
      if (!conversationState.handoffs[h.task_id]) {
        conversationState.handoffs[h.task_id] = [];
      }
      conversationState.handoffs[h.task_id].push(h);
    }

    filterConversations();
  } catch (err) {
    showToast('Failed to load conversations: ' + err.message, 'error');
    (document.getElementById('threadList') || {}).innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load</div></div>`;
  }
}

function filterConversations() {
  const agentFilter = document.getElementById('convAgentFilter')?.value || 'all';
  const dateFilter = document.getElementById('convDateFilter')?.value || 'all';
  const search = document.getElementById('convSearch')?.value.toLowerCase() || '';
  const groupThreads = document.getElementById('convGroupThreads')?.checked !== false;

  conversationState.filterAgent = agentFilter;
  conversationState.filterDate = dateFilter;
  conversationState.searchQuery = search;

  let filtered = [...conversationState.messages];

  if (agentFilter !== 'all') {
    filtered = filtered.filter(m => m.agent === agentFilter);
  }

  if (dateFilter !== 'all') {
    const now = new Date();
    let cutoff;
    if (dateFilter === 'today') cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (dateFilter === 'week') cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (dateFilter === 'month') cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(m => new Date(m.timestamp) >= cutoff);
  }

  if (search) {
    filtered = filtered.filter(m =>
      m.content.toLowerCase().includes(search) ||
      m.agent.toLowerCase().includes(search)
    );
  }

  if (groupThreads) {
    const threads = groupIntoThreads(filtered);
    conversationState.grouped = threads;
  } else {
    conversationState.grouped = groupByAgent(filtered);
  }

  renderStatsBar();
  renderThreadList();
}

function groupIntoThreads(messages) {
  // Group messages by task_id from handoffs
  const taskThreads = {};
  const noTaskMessages = [];

  for (const msg of messages) {
    let foundTask = null;

    // Check if message belongs to a known handoff task
    for (const [taskId, handoffs] of Object.entries(conversationState.handoffs)) {
      for (const h of handoffs) {
        // Check if message timestamp falls within task timeframe
        const msgTime = new Date(msg.timestamp).getTime();
        const taskStart = new Date(h.created).getTime();
        const taskEnd = h.updated ? new Date(h.updated).getTime() : Date.now();
        // Check if this message's agent was involved
        if (msg.agent === h.from_agent || msg.agent === h.to_agent) {
          if (msgTime >= taskStart - 60000 && msgTime <= taskEnd + 60000) {
            foundTask = taskId;
            break;
          }
        }
      }
      if (foundTask) break;
    }

    if (foundTask) {
      if (!taskThreads[foundTask]) taskThreads[foundTask] = [];
      taskThreads[foundTask].push(msg);
    } else {
      noTaskMessages.push(msg);
    }
  }

  // Convert to array of thread objects
  const threads = [];

  // Task-based threads (with handoffs)
  for (const [taskId, msgs] of Object.entries(taskThreads)) {
    msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const agents = [...new Set(msgs.map(m => m.agent))];
    const handoffChain = conversationState.handoffs[taskId] || [];

    threads.push({
      id: taskId,
      type: 'chain',
      title: `Chain: ${agents.map(a => agentMetaConversation[a]?.icon || '🤖').join(' → ')}`,
      agents,
      messages: msgs,
      handoffs: handoffChain,
      startTime: msgs[0]?.timestamp,
      endTime: msgs[msgs.length - 1]?.timestamp,
      messageCount: msgs.length,
    });
  }

  // Session threads (group by time gaps per agent)
  if (noTaskMessages.length > 0) {
    const sessionThreads = groupIntoSessions(noTaskMessages);
    for (const t of sessionThreads) {
      t.type = 'session';
    }
    threads.push(...sessionThreads);
  }

  // Sort by most recent activity
  threads.sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime));

  return threads;
}

function groupIntoSessions(messages) {
  // Group messages by agent and time gaps (10 min = new session)
  const byAgent = {};
  for (const msg of messages) {
    if (!byAgent[msg.agent]) byAgent[msg.agent] = [];
    byAgent[msg.agent].push(msg);
  }

  const sessions = [];
  for (const [agent, msgs] of Object.entries(byAgent)) {
    msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let currentSession = [msgs[0]];
    for (let i = 1; i < msgs.length; i++) {
      const gap = new Date(msgs[i].timestamp) - new Date(msgs[i-1].timestamp);
      if (gap > 10 * 60 * 1000) { // 10 minutes
        if (currentSession.length > 0) {
          sessions.push(createSessionThread(agent, currentSession));
        }
        currentSession = [msgs[i]];
      } else {
        currentSession.push(msgs[i]);
      }
    }
    if (currentSession.length > 0) {
      sessions.push(createSessionThread(agent, currentSession));
    }
  }

  return sessions;
}

function createSessionThread(agent, messages) {
  const meta = agentMetaConversation[agent] || { icon: '🤖', name: agent };
  const startTime = messages[0]?.timestamp;
  const endTime = messages[messages.length - 1]?.timestamp;
  const preview = messages[0]?.content?.substring(0, 80) || 'Empty';
  return {
    id: `session-${agent}-${startTime}`,
    type: 'session',
    title: `${meta.icon} ${meta.name}: ${preview}...`,
    agents: [agent],
    messages,
    handoffs: [],
    startTime,
    endTime,
    messageCount: messages.length,
  };
}

function groupByAgent(messages) {
  const byAgent = {};
  for (const msg of messages) {
    if (!byAgent[msg.agent]) byAgent[msg.agent] = [];
    byAgent[msg.agent].push(msg);
  }

  const threads = [];
  for (const [agent, msgs] of Object.entries(byAgent)) {
    msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
    const meta = agentMetaConversation[agent] || { icon: '🤖', name: agent };
    threads.push({
      id: `agent-${agent}`,
      type: 'agent',
      title: `${meta.icon} ${meta.name} (${msgs.length} messages)`,
      agents: [agent],
      messages: msgs,
      handoffs: [],
      startTime: msgs[msgs.length - 1]?.timestamp,
      endTime: msgs[0]?.timestamp,
      messageCount: msgs.length,
    });
  }
  return threads;
}

function renderStatsBar() {
  const container = document.getElementById('convStatsBar');
  const totalMessages = conversationState.messages.length;
  const totalThreads = conversationState.grouped.length;
  const chainThreads = conversationState.grouped.filter(t => t.type === 'chain').length;
  const agentCounts = {};
  for (const msg of conversationState.messages) {
    agentCounts[msg.agent] = (agentCounts[msg.agent] || 0) + 1;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
      <div style="display:flex;gap:24px">
        <div><strong>${totalMessages}</strong> <span style="color:var(--text-muted);font-size:12px">messages</span></div>
        <div><strong>${totalThreads}</strong> <span style="color:var(--text-muted);font-size:12px">threads</span></div>
        <div><strong>${chainThreads}</strong> <span style="color:var(--text-muted);font-size:12px">multi-agent chains</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:12px">
        ${Object.entries(agentCounts).map(([agent, count]) => `
          <span class="badge" style="background:var(--${agentMetaConversation[agent]?.color || 'accent'}-dim);color:var(--${agentMetaConversation[agent]?.color || 'accent'})">
            ${agentMetaConversation[agent]?.icon || '🤖'} ${count}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

function renderThreadList() {
  const container = document.getElementById('threadList');
  const countEl = document.getElementById('threadCount');

  if (!container) return;
  countEl.textContent = conversationState.grouped.length;

  if (conversationState.grouped.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;text-align:center"><div class="empty-state-icon">💬</div><div class="empty-state-title">No conversations</div><div class="empty-state-desc">No messages match current filters</div></div>';
    return;
  }

  container.innerHTML = conversationState.grouped.map((thread, idx) => {
    const isSelected = conversationState.selectedThread?.id === thread.id;
    const duration = thread.startTime && thread.endTime ?
      formatDuration(new Date(thread.startTime), new Date(thread.endTime)) : '—';
    const timeAgo = thread.endTime ? timeAgoStr(thread.endTime) : '—';

    const agentBadges = thread.agents.map(a => {
      const meta = agentMetaConversation[a];
      return `<span class="badge" style="background:var(--${meta?.color || 'accent'}-dim);color:var(--${meta?.color || 'accent'});font-size:9px;margin-right:2px">${meta?.icon || '🤖'}</span>`;
    }).join('');

    const typeIcon = thread.type === 'chain' ? '⛓' : thread.type === 'session' ? '💬' : '📋';

    return `
      <div class="thread-item ${isSelected ? 'selected' : ''}"
           onclick="selectThread('${thread.id}')"
           style="padding:12px;border-radius:var(--radius);margin-bottom:4px;cursor:pointer;transition:var(--transition);border:1px solid ${isSelected ? 'var(--accent)' : 'transparent'};background:${isSelected ? 'var(--accent-glow)' : 'transparent'}"
           onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='${isSelected ? 'var(--accent-glow)' : 'transparent'}'">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:16px;margin-top:2px">${typeIcon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(thread.title)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${agentBadges}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px;display:flex;gap:12px">
              <span>📨 ${thread.messageCount} msgs</span>
              <span>⏱ ${duration}</span>
              <span>${timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDuration(start, end) {
  const diff = end - start;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function timeAgoStr(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function selectThread(threadId) {
  const thread = conversationState.grouped.find(t => t.id === threadId);
  if (!thread) return;

  conversationState.selectedThread = thread;

  // Update selection highlight
  document.querySelectorAll('.thread-item').forEach(el => {
    el.classList.remove('selected');
    el.style.borderColor = 'transparent';
    el.style.background = 'transparent';
  });
  const selectedEl = Array.from(document.querySelectorAll('.thread-item')).find(el =>
    el.onclick && el.onclick.toString().includes(threadId)
  );
  if (selectedEl) {
    selectedEl.classList.add('selected');
    selectedEl.style.borderColor = 'var(--accent)';
    selectedEl.style.background = 'var(--accent-glow)';
  }

  renderMessageView(thread);
}

function renderMessageView(thread) {
  const container = document.getElementById('messageView');
  if (!container) return;

  const messages = thread.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const handoffs = thread.handoffs || [];

  let html = `
    <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <h3 style="font-size:16px;margin:0">${escapeHtml(thread.title)}</h3>
        <span class="badge" style="background:${thread.type === 'chain' ? 'var(--accent)' : 'var(--blue)'}">${thread.type}</span>
      </div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted);flex-wrap:wrap">
        <span>📨 ${messages.length} messages</span>
        <span>⏱ ${formatDuration(new Date(thread.startTime), new Date(thread.endTime))}</span>
        <span>🕐 Started ${timeAgoStr(thread.startTime)}</span>
        <span>🔚 Ended ${timeAgoStr(thread.endTime)}</span>
      </div>
      ${thread.type === 'chain' && handoffs.length > 0 ? `
        <div style="margin-top:12px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
          <strong style="font-size:12px">Handoff Chain:</strong>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
            ${handoffs.map(h => `
              <span class="badge" style="background:var(--${agentMetaConversation[h.from_agent]?.color || 'accent'}-dim);color:var(--${agentMetaConversation[h.from_agent]?.color || 'accent'})">
                ${agentMetaConversation[h.from_agent]?.icon || '🤖'} ${h.from_agent}
              </span>
              <span style="color:var(--text-muted)?">→</span>
              <span class="badge" style="background:var(--${agentMetaConversation[h.to_agent]?.color || 'accent'}-dim);color:var(--${agentMetaConversation[h.to_agent]?.color || 'accent'})">
                ${h.to_agent} ${agentMetaConversation[h.to_agent]?.icon || '🤖'}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Messages timeline
  html += '<div style="display:flex;flex-direction:column;gap:16px">';
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const meta = agentMetaConversation[msg.agent] || { icon: '🤖', name: msg.agent, color: 'accent' };
    const isUser = msg.role === 'user';

    // Check if this message is near a handoff
    let handoffMarker = '';
    for (const h of handoffs) {
      const msgTime = new Date(msg.timestamp).getTime();
      const hTime = new Date(h.created).getTime();
      if (Math.abs(msgTime - hTime) < 30000 && (msg.agent === h.from_agent || msg.agent === h.to_agent)) {
        handoffMarker = `
          <div style="margin-bottom:8px;padding:6px 10px;background:var(--purple-dim);border:1px solid var(--purple);border-radius:var(--radius);font-size:11px;color:var(--purple);display:flex;align-items:center;gap:6px">
            <span>🔄</span> Handoff: ${h.from_agent} → ${h.to_agent} · ${h.context_summary || 'context transfer'}
          </div>
        `;
        break;
      }
    }

    html += `
      <div class="conv-message ${isUser ? 'user' : 'assistant'}" style="display:flex;gap:12px;${isUser ? 'flex-direction:row-reverse' : ''}">
        <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--${meta.color}-dim);color:var(--${meta.color});flex-shrink:0">${isUser ? '👤' : meta.icon}</div>
        <div style="flex:1;min-width:0;${isUser ? 'text-align:right' : ''}">
          ${handoffMarker}
          <div style="display:flex;align-items:center;gap:8px;justify-content:${isUser ? 'flex-end' : 'flex-start'};margin-bottom:4px">
            <span style="font-weight:600;font-size:13px;color:var(--${meta.color})">${isUser ? 'You' : meta.name}</span>
            <span style="font-size:11px;color:var(--text-muted)">${formatDate(msg.timestamp)}</span>
            <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${msg.id}</span>
          </div>
          <div style="font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary);background:var(--bg-card);padding:12px;border-radius:var(--radius);border:1px solid var(--border)">${escapeHtml(msg.content)}</div>
        </div>
      </div>
    `;
  }
  html += '</div>';

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// Expose globally
window.renderConversationView = renderConversationView;
window.loadConversations = loadConversations;
window.filterConversations = filterConversations;
window.selectThread = selectThread;
window.toggleConvAutoRefresh = toggleConvAutoRefresh;