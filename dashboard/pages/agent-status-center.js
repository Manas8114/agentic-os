// Agent Status Center — Unified real-time monitoring for all agents
// Cleanup: stop interval when navigating away
(function _ascSetupCleanup() {
  const prev = window._ascHashHandler;
  if (prev) window.removeEventListener('hashchange', prev);
  window._ascHashHandler = function() { stopAutoRefresh(); };
  window.addEventListener('hashchange', window._ascHashHandler);
})();

let agentStatusState = {
  agents: {},
  stats: {},
  selectedAgent: null,
  autoRefresh: true,
  refreshInterval: null,
  wsConnected: false,
};

async function renderAgentStatusCenter() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Status Center</h1>
        <p class="page-subtitle">Unified real-time monitoring & activity feeds for all agents</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center">
        <label class="switch" title="Auto-refresh every 10s (WebSocket primary)">
          <input type="checkbox" id="statusAutoRefresh" checked onchange="toggleAutoRefresh()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted" id="autoRefreshLabel">Auto</span>
        <span class="ws-indicator ${agentStatusState.wsConnected ? 'online' : 'offline'}" id="wsStatus" title="WebSocket disconnected"></span>
        <button class="btn btn-primary" onclick="refreshAll()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Overview Bar -->
    <div class="card" style="margin-bottom:24px" id="overviewBar">
      <div class="loading"><div class="loading-spinner"></div><span>Loading...</span></div>
    </div>

    <!-- Agent Grid -->
    <div class="grid grid-4" style="margin-bottom:24px" id="agentGrid">
      <div class="skeleton" style="height:160px"></div>
      <div class="skeleton" style="height:160px"></div>
      <div class="skeleton" style="height:160px"></div>
      <div class="skeleton" style="height:160px"></div>
    </div>

    <!-- Detail Panel (shown when agent selected) -->
    <div id="detailPanel" style="display:none">
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title" id="detailTitle">Agent Details</h3>
          <button class="btn btn-ghost" onclick="closeDetailPanel()">← Back</button>
        </div>
        <div class="card-body" id="detailContent">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  // Initial load
  await refreshAll();

  // Start auto-refresh
  if (document.getElementById('statusAutoRefresh')?.checked) {
    startAutoRefresh();
  }

  // Ensure WebSocket is connected
  if (typeof initWebSocket === 'function') {
    initWebSocket();
  }
}

function toggleAutoRefresh() {
  const checked = document.getElementById('statusAutoRefresh')?.checked;
  agentStatusState.autoRefresh = checked;
  if (checked) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  agentStatusState.refreshInterval = setInterval(refreshAll, 10000);
}

function stopAutoRefresh() {
  if (agentStatusState.refreshInterval) {
    clearInterval(agentStatusState.refreshInterval);
    agentStatusState.refreshInterval = null;
  }
}

async function refreshAll() {
  try {
    const [health, stats] = await Promise.all([
      api.getAgentHealth(),
      Promise.all(['opencode', 'hermes', 'gemini', 'claude'].map(a => api.getAgentStats(a).catch(() => ({}))))
    ]);

    agentStatusState.agents = {};
    for (const a of health.agents || []) {
      agentStatusState.agents[a.name] = a;
    }

    agentStatusState.stats = {};
    for (const s of stats) {
      if (s.name) agentStatusState.stats[s.name] = s;
    }

    renderOverviewBar();
    renderAgentGrid();

    // Update detail panel if open
    if (agentStatusState.selectedAgent && document.getElementById('detailPanel').style.display !== 'none') {
      renderDetailPanel(agentStatusState.selectedAgent);
    }
  } catch (err) {
    showToast('Failed to refresh: ' + err.message, 'error');
  }
}

function renderOverviewBar() {
  const container = document.getElementById('overviewBar');
  const agents = Object.values(agentStatusState.agents);
  const online = agents.filter(a => a.status === 'online').length;
  const total = agents.length;
  const warning = agents.filter(a => a.status === 'warning').length;
  const totalRuns = agents.reduce((sum, a) => sum + (a.total_runs || 0), 0);
  const totalChats = agents.reduce((sum, a) => sum + (a.chat_messages || 0), 0);

  const statusClass = online === total ? 'online' : online > 0 ? 'warning' : 'offline';
  const statusText = online === total ? 'All Online' : online > 0 ? `${online}/${total} Online` : 'All Offline';

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="status-indicator ${statusClass}" style="margin-right:8px">
          <span class="agent-dot ${statusClass}"></span>
          ${statusText}
        </div>
        <div style="font-size:13px;color:var(--text-secondary)">
          ${totalRuns} total skill runs · ${totalChats} chat messages · Last: ${new Date().toLocaleTimeString()}
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
        <span>WS: ${agentStatusState.wsConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        <span>Polling: ${agentStatusState.autoRefresh ? '🟢 On (10s)' : '🔴 Off'}</span>
      </div>
    </div>
  `;
}

function renderAgentGrid() {
  const container = document.getElementById('agentGrid');
  const agentOrder = ['opencode', 'hermes', 'gemini', 'claude'];

  container.innerHTML = agentOrder.map(name => {
    const a = agentStatusState.agents[name];
    const meta = agentMeta[name];
    const stats = agentStatusState.stats[name] || {};
    const status = a?.status || 'offline';
    const successRate = stats.success_rate !== undefined ? `${stats.success_rate}%` : '—';
    const avgTime = stats.avg_response_time !== undefined ? `${stats.avg_response_time}s` : '—';
    const totalRuns = stats.total_runs || a?.total_runs || 0;
    const successful = stats.successful_runs || 0;
    const failed = stats.failed_runs || 0;
    const chatMsgs = stats.chat_messages || a?.chat_messages || 0;
    const lastSeen = a?.last_seen ? new Date(a.last_seen).toLocaleTimeString() : 'Never';

    const statusColor = status === 'online' ? 'var(--green)' : status === 'warning' ? 'var(--yellow)' : 'var(--red)';
    const statusDot = status === 'online' ? 'online' : status === 'warning' ? 'warning' : 'offline';

    return `
      <div class="card agent-status-card" onclick="openDetailPanel('${name}')" style="cursor:pointer;transition:var(--transition);border-left:4px solid ${statusColor}" onmouseover="this.style.boxShadow='var(--shadow-lg)'" onmouseout="this.style.boxShadow=''">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div class="agent-health-avatar" style="background:var(--${meta.color}-dim);color:var(--${meta.color});font-size:20px;width:44px;height:44px">${meta.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:700;font-size:15px">${meta.name}</span>
              <span class="agent-dot ${statusDot}" style="width:8px;height:8px;margin-top:2px"></span>
              <span style="font-size:11px;color:${statusColor};text-transform:capitalize">${status}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${meta.desc}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px">
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)">
            <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Success Rate</div>
            <div style="font-weight:600;color:${successRate !== '—' && parseFloat(successRate) >= 80 ? 'var(--green)' : 'var(--yellow)'}">${successRate}</div>
          </div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)">
            <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Avg Response</div>
            <div style="font-weight:600">${avgTime}</div>
          </div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)">
            <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Total Runs</div>
            <div style="font-weight:600">${totalRuns}</div>
          </div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)">
            <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Chat Msgs</div>
            <div style="font-weight:600">${chatMsgs}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;font-size:11px;color:var(--text-muted)">
          <span>✓ ${successful}</span>
          <span>✕ ${failed}</span>
          <span style="margin-left:auto">Last: ${lastSeen}</span>
        </div>

        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text-muted)">
          Capabilities: ${meta.caps.join(', ')}
        </div>

        <div style="margin-top:8px;text-align:right">
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openDetailPanel('${name}')" style="font-size:11px">View Details →</button>
        </div>
      </div>
    `;
  }).join('');
}

async function openDetailPanel(agentName) {
  agentStatusState.selectedAgent = agentName;
  const panel = document.getElementById('detailPanel');
  const grid = document.getElementById('agentGrid');
  panel.style.display = 'block';
  grid.style.opacity = '0.5';
  grid.style.pointerEvents = 'none';

  await renderDetailPanel(agentName);
}

function closeDetailPanel() {
  agentStatusState.selectedAgent = null;
  document.getElementById('detailPanel').style.display = 'none';
  document.getElementById('agentGrid').style.opacity = '1';
  document.getElementById('agentGrid').style.pointerEvents = 'auto';
}

async function renderDetailPanel(agentName) {
  const container = document.getElementById('detailContent');
  const meta = {
    opencode: { icon: '🔧', name: 'opencode', color: 'blue' },
    hermes: { icon: '⚡', name: 'Hermes', color: 'purple' },
    gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green' },
    claude: { icon: '🤖', name: 'Claude', color: 'orange' },
  }[agentName];

  const a = agentStatusState.agents[agentName] || { status: 'offline' };
  const stats = agentStatusState.stats[agentName] || {};

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div class="agent-health-avatar" style="background:var(--${meta.color}-dim);color:var(--${meta.color});font-size:28px;width:56px;height:56px">${meta.icon}</div>
      <div>
        <div style="font-weight:700;font-size:18px">${meta.name}<span class="agent-dot ${a.status === 'online' ? 'online' : a.status === 'warning' ? 'warning' : 'offline'}" style="width:10px;height:10px;margin-left:8px;margin-top:2px"></span></div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Status: <strong style="color:${a.status === 'online' ? 'var(--green)' : a.status === 'warning' ? 'var(--yellow)' : 'var(--red)'}">${a.status}</strong> · Last seen: ${a.last_seen ? new Date(a.last_seen).toLocaleString() : 'Never'}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px">
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${stats.successful_runs || 0}</div><div class="stat-label">Successful</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${stats.failed_runs || 0}</div><div class="stat-label">Failed</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${stats.total_runs || 0}</div><div class="stat-label">Total Runs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--blue)">${stats.chat_messages || 0}</div><div class="stat-label">Chat Msgs</div></div>
      <div class="stat-card"><div class="stat-value">${stats.success_rate !== undefined ? stats.success_rate + '%' : '—'}</div><div class="stat-label">Success Rate</div></div>
      <div class="stat-card"><div class="stat-value">${stats.avg_response_time !== undefined ? stats.avg_response_time + 's' : '—'}</div><div class="stat-label">Avg Response</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <!-- Activity Feed -->
      <div class="card" style="flex:1;min-height:400px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Activity Feed</h3>
          <select id="activityFilter" class="form-select" onchange="renderActivityFeed('${agentName}')" style="width:auto;font-size:12px">
            <option value="all">All Activity</option>
            <option value="skill_runs">Skill Runs</option>
            <option value="chat_messages">Chat Messages</option>
            <option value="handoffs">Handoffs</option>
          </select>
        </div>
        <div class="card-body" style="padding:0;max-height:400px;overflow-y:auto" id="activityFeed_${agentName}">
          <div class="loading" style="padding:20px"><div class="loading-spinner"></div></div>
        </div>
      </div>

      <!-- Quick Actions & Config -->
      <div class="card" style="flex:1">
        <div class="card-header"><h3 class="card-title">Quick Actions</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="testAgent('${agentName}')" style="width:100%;justify-content:center">🧪 Test Agent</button>
          <button class="btn btn-ghost" onclick="viewAgentSkills('${agentName}')" style="width:100%;justify-content:center">⚡ View Skills</button>
          <button class="btn btn-ghost" onclick="viewAgentChats('${agentName}')" style="width:100%;justify-content:center">💬 View Chats</button>
        </div>

        <div class="card-header" style="margin-top:20px"><h3 class="card-title">Configuration</h3></div>
        <div class="card-body" style="font-size:12px;color:var(--text-secondary)">
          <div style="margin-bottom:12px"><strong>Agent:</strong> ${meta.name}</div>
          <div style="margin-bottom:12px"><strong>Primary Role:</strong> ${a?.description || 'General purpose'}</div>
          <div style="margin-bottom:12px"><strong>Routes to this agent:</strong></div>
          <ul style="margin:0;padding-left:20px;line-height:2;font-size:11px">
            ${getAgentRoutes(agentName).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  // Load activity feed
  renderActivityFeed(agentName);
}

function getAgentRoutes(agentName) {
  const routes = {
    opencode: ['code', 'devops', 'deploy', 'git', 'file', 'terraform', 'docker', 'test', 'build', 'infra', 'script'],
    hermes: ['memory', 'schedule', 'channel', 'skill', 'cron', 'reminder', 'brain', 'plugin', 'backup'],
    gemini: ['research', 'analyze', 'search', 'compare', 'explain', 'study', 'learn', 'document', 'report', 'review'],
    claude: ['strategy', 'architecture', 'plan', 'design', 'review', 'reasoning', 'analysis', 'decision', 'complex', 'problem'],
  };
  return routes[agentName] || [];
}

async function renderActivityFeed(agentName) {
  const container = document.getElementById(`activityFeed_${agentName}`);
  if (!container) return;

  try {
    // Fetch recent audit entries for this agent
    const auditRes = await fetch('/api/audit?limit=200', {
      headers: { 'X-API-Key': 'dev-api-key-change-in-production' }
    });
    const auditData = await auditRes.json();
    const entries = auditData.entries || [];

    // Fetch handoffs for this agent
    const handoffsRes = await fetch('/api/handoffs', {
      headers: { 'X-API-Key': 'dev-api-key-change-in-production' }
    });
    const handoffsData = await handoffsRes.json();
    const handoffs = handoffsData.handoffs || [];

    // Filter by agent
    const filter = document.getElementById('activityFilter')?.value || 'all';

    let activities = [];

    // Skill runs
    if (filter === 'all' || filter === 'skill_runs') {
      for (const e of entries) {
        if (e.agent === agentName && (e.action === 'skill_run' || e.action === 'scheduler_run' || e.action === 'scheduler_chain_step')) {
          activities.push({
            time: e.timestamp,
            type: 'skill_run',
            title: `Skill: ${e.skill}`,
            detail: `via ${e.agent} · ${e.output_preview || ''}`,
            status: e.action === 'scheduler_chain_step' ? 'chain' : 'normal',
            chainStep: e.chain_step,
            taskId: e.task_id,
          });
        }
      }
    }

    // Chat messages
    if (filter === 'all' || filter === 'chat_messages') {
      for (const e of entries) {
        if (e.agent === agentName && e.action === 'chat_message') {
          activities.push({
            time: e.timestamp,
            type: 'chat',
            title: 'Chat Message',
            detail: e.message_preview || '',
            status: 'chat',
          });
        }
      }
    }

    // Handoffs
    if (filter === 'all' || filter === 'handoffs') {
      for (const h of handoffs) {
        if (h.from_agent === agentName || h.to_agent === agentName) {
          activities.push({
            time: h.created,
            type: 'handoff',
            title: `Handoff: ${h.from_agent} → ${h.to_agent}`,
            detail: h.context_summary || '',
            status: h.status,
            taskId: h.task_id,
            chainStep: h.chain_step,
          });
        }
      }
    }

    // Sort by time desc
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (activities.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="empty-state-icon">📭</div><div class="empty-state-title">No activity</div><div class="empty-state-desc">No recent activity for this agent</div></div>';
      return;
    }

    // Show last 50
    const display = activities.slice(0, 50);

    container.innerHTML = display.map(act => {
      const time = act.time ? new Date(act.time).toLocaleTimeString() : '—';
      const typeIcons = { skill_run: '⚡', chat: '💬', handoff: '🔄' };
      const typeColors = { skill_run: 'var(--accent)', chat: 'var(--blue)', handoff: 'var(--purple)' };
      const statusBadge = act.status && act.status !== 'normal' && act.status !== 'chat' ?
        `<span class="badge" style="background:${act.status === 'completed' ? 'var(--green)' : act.status === 'failed' ? 'var(--red)' : 'var(--yellow)'};font-size:9px">${act.status}</span>` : '';

      return `
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);transition:var(--transition)" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:14px;color:${typeColors[act.type] || 'var(--text-muted)'}">${typeIcons[act.type] || '•'}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:600;font-size:12px">${act.title}</span>
                ${statusBadge}
                ${act.chainStep ? `<span class="badge badge-info" style="font-size:9px">Step ${act.chainStep}</span>` : ''}
                <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${time}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(act.detail.substring(0, 200))}</div>
              ${act.taskId ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Task: <code>${act.taskId}</code></div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

async function testAgent(agentName) {
  showToast(`Testing ${agentName}...`, 'info');
  try {
    // Use the agent stats endpoint which does a fresh check
    const stats = await api.getAgentStats(agentName);
    const status = stats.status || 'unknown';
    showToast(`${agentName}: ${status}`, status === 'online' ? 'success' : 'warning');
    refreshAll();
  } catch (err) {
    showToast(`Test failed: ${err.message}`, 'error');
  }
}

function viewAgentSkills(agentName) {
  // Navigate to skills page with filter
  navigate('skills');
  // Could add filter parameter in future
  showToast(`Navigate to Skills page to filter by ${agentName}`, 'info');
}

function viewAgentChats(agentName) {
  navigate('chat');
  showToast(`Navigate to Chat page for ${agentName} history`, 'info');
}

// WebSocket handler for agent health updates
function handleAgentHealthWS(data) {
  if (data.agents) {
    for (const a of data.agents) {
      agentStatusState.agents[a.name] = a;
    }
    renderOverviewBar();
    renderAgentGrid();
    if (agentStatusState.selectedAgent) {
      renderDetailPanel(agentStatusState.selectedAgent);
    }
  }
  agentStatusState.wsConnected = true;
  updateWSIndicator();
}

function updateWSIndicator() {
  const indicator = document.getElementById('wsStatus');
  if (indicator) {
    indicator.className = 'ws-indicator ' + (agentStatusState.wsConnected ? 'online' : 'offline');
    indicator.title = agentStatusState.wsConnected ? 'WebSocket connected' : 'WebSocket disconnected';
  }
}

// Expose for WebSocket messages
window.handleAgentHealthWS = handleAgentHealthWS;
window.renderAgentStatusCenter = renderAgentStatusCenter;
window.openDetailPanel = openDetailPanel;
window.closeDetailPanel = closeDetailPanel;
window.toggleAutoRefresh = toggleAutoRefresh;
window.refreshAll = refreshAll;
window.renderActivityFeed = renderActivityFeed;
window.testAgent = testAgent;
window.viewAgentSkills = viewAgentSkills;
window.viewAgentChats = viewAgentChats;