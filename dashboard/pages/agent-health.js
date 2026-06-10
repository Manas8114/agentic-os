let agentHealthInterval = null;

// Cleanup on navigation away
(function _ahSetupCleanup() {
  const _prev = window._ahHashHandler;
  if (_prev) window.removeEventListener('hashchange', _prev);
  window._ahHashHandler = function() { stopHealthAutoRefresh(); };
  window.addEventListener('hashchange', window._ahHashHandler);
})();

async function renderAgentHealth() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-title">Agent Health</div>
        <div class="page-subtitle">Real-time monitoring of all 3 agents</div>
      </div>
      <div class="btn-group">
        <label class="switch" title="Auto-refresh every 5s">
          <input type="checkbox" id="healthAutoRefresh" checked onchange="toggleHealthAutoRefresh()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted">Auto</span>
        <button class="btn btn-primary" onclick="refreshAgentHealth()">🔄 Refresh Now</button>
      </div>
    </div>
    <div id="agentHealthCards" class="grid grid-3" style="margin-bottom:20px">
      <div class="skeleton" style="height:180px"></div>
      <div class="skeleton" style="height:180px"></div>
      <div class="skeleton" style="height:180px"></div>
    </div>
    <div class="section-title">Health Overview</div>
    <div class="card" id="healthOverviewCard">
      <div class="loading"><div class="loading-spinner"></div><span>Loading health data...</span></div>
    </div>
  `;
  await refreshAgentHealth();
  if (document.getElementById('healthAutoRefresh')?.checked) {
    startHealthAutoRefresh();
  }
}

function startHealthAutoRefresh() {
  stopHealthAutoRefresh();
  agentHealthInterval = setInterval(refreshAgentHealth, 5000);
}

function stopHealthAutoRefresh() {
  if (agentHealthInterval) {
    clearInterval(agentHealthInterval);
    agentHealthInterval = null;
  }
}

function toggleHealthAutoRefresh() {
  if (document.getElementById('healthAutoRefresh')?.checked) {
    startHealthAutoRefresh();
  } else {
    stopHealthAutoRefresh();
  }
}

async function refreshAgentHealth() {
  try {
    const data = await api.getAgentHealth();
    const agents = data.agents || [];
    const cards = document.getElementById('agentHealthCards');
    if (!cards) return;
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', claude: '🤖' };
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', claude: 'orange' };
    cards.innerHTML = agents.map(a => {
      const uptime = a.uptime !== undefined ? `${a.uptime}%` : (a.status === 'online' ? '100%' : '0%');
      const totalRuns = a.total_runs !== undefined ? a.total_runs : 0;
      const chatMessages = a.chat_messages !== undefined ? a.chat_messages : 0;
      const successRate = a.success_rate !== undefined ? `${a.success_rate}%` : (a.status === 'online' ? '100%' : '0%');
      const lastSeen = a.last_seen ? new Date(a.last_seen).toLocaleTimeString() : (data.updated ? new Date(data.updated).toLocaleTimeString() : 'N/A');
      return `
      <div class="agent-health-card">
        <div class="agent-health-avatar" style="background:var(--${agentColors[a.name] || 'accent'}-dim);color:var(--${agentColors[a.name] || 'accent'})">
          ${agentIcons[a.name] || '🤖'}
        </div>
        <div class="agent-health-info">
          <div class="agent-health-name" style="text-transform:capitalize">${a.name}</div>
          <div class="agent-health-status">
            <span class="agent-dot ${a.status === 'online' ? 'online' : a.status === 'warning' ? 'warning' : 'offline'}"></span>
            <span style="text-transform:capitalize;color:var(--text-secondary)">${a.status}</span>
          </div>
          <div class="agent-health-stats">
            <div class="agent-health-stat">
              <div class="agent-health-stat-value" style="color:var(--green)">${uptime}</div>
              <div class="agent-health-stat-label">Uptime</div>
            </div>
            <div class="agent-health-stat">
              <div class="agent-health-stat-value" style="color:var(--accent-light)">${totalRuns}</div>
              <div class="agent-health-stat-label">Skill Runs</div>
            </div>
            <div class="agent-health-stat">
              <div class="agent-health-stat-value" style="color:var(--blue)">${chatMessages}</div>
              <div class="agent-health-stat-label">Chat Msgs</div>
            </div>
            <div class="agent-health-stat">
              <div class="agent-health-stat-value" style="color:var(--green)">${successRate}</div>
              <div class="agent-health-stat-label">Success Rate</div>
            </div>
            <div class="agent-health-stat">
              <div class="agent-health-stat-value text-sm" style="font-size:11px;color:var(--text-muted)">${lastSeen}</div>
              <div class="agent-health-stat-label">Last Seen</div>
            </div>
          </div>
        </div>
      </div>
    `}).join('');
    const overview = document.getElementById('healthOverviewCard');
    if (overview) {
      const online = agents.filter(a => a.status === 'online').length;
      const total = agents.length;
      const totalRuns = agents.reduce((sum, a) => sum + (a.total_runs || 0), 0);
      const totalChats = agents.reduce((sum, a) => sum + (a.chat_messages || 0), 0);
      overview.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600">System Status</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
              ${online}/${total} agents online · ${totalRuns} total runs · ${totalChats} chat messages · Last updated: ${new Date(data.updated).toLocaleTimeString()}
            </div>
          </div>
          <div class="status-indicator ${online === total ? 'online' : online > 0 ? 'warning' : 'offline'}">
            <span class="agent-dot ${online === total ? 'online' : online > 0 ? 'warning' : 'offline'}"></span>
            ${online === total ? 'All Online' : online > 0 ? 'Partial' : 'Offline'}
          </div>
        </div>
      `;
    }
  } catch (err) {
    const cards = document.getElementById('agentHealthCards');
    if (cards) cards.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load health data</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}
