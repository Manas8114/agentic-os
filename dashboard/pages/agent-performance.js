// Agent Performance Dashboard — Real-time metrics, trends, and cost breakdown per agent
// Cleanup: stop interval + destroy charts when navigating away
(function _apSetupCleanup() {
  const prev = window._apHashHandler;
  if (prev) window.removeEventListener('hashchange', prev);
  window._apHashHandler = function() {
    stopPerfAutoRefresh();
    // Destroy all Chart.js instances to prevent canvas reuse errors
    Object.values(perfState.charts || {}).forEach(c => { try { c.destroy(); } catch {} });
    perfState.charts = {};
  };
  window.addEventListener('hashchange', window._apHashHandler);
})();

let perfState = {
  summary: null,
  selectedAgent: 'opencode',
  agentTrends: null,
  costBreakdown: null,
  autoRefresh: true,
  refreshInterval: null,
  charts: {},
};

const agentMetaPerformance = {
  opencode: { icon: '🔧', name: 'opencode', color: 'blue', desc: 'Code & DevOps' },
  hermes: { icon: '⚡', name: 'Hermes', color: 'purple', desc: 'Memory & Scheduling' },
  gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green', desc: 'Research & Analysis' },
  claude: { icon: '🤖', name: 'Claude', color: 'orange', desc: 'Strategy & Architecture' },
};

async function renderAgentPerformance() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Performance Dashboard</h1>
        <p class="page-subtitle">Real-time metrics, trends, and cost breakdown per agent</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label class="switch" title="Auto-refresh every 30s">
          <input type="checkbox" id="perfAutoRefresh" checked onchange="togglePerfAutoRefresh()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted" style="margin-right:16px">Auto</span>
        <button class="btn btn-primary" onclick="refreshPerf()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Agent Selector -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px">
        <strong style="font-size:13px;margin-right:12px">Agent:</strong>
        <div class="agent-switcher" style="display:flex;gap:8px">
          ${Object.keys(agentMetaPerformance).map(key => `
            <button class="agent-switch-btn ${key === 'opencode' ? 'active' : ''}"
                    onclick="switchPerfAgent('${key}')"
                    style="padding:8px 16px;border-radius:var(--radius);border:1px solid var(--border);background:${key === 'opencode' ? 'var(--accent-glow)' : 'var(--bg-card)'};color:${key === 'opencode' ? 'var(--accent)' : 'var(--text-primary)'};font-weight:600;cursor:pointer;transition:var(--transition)"
                    data-agent="${key}">
              ${agentMetaPerformance[key].icon} ${agentMetaPerformance[key].name}
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Summary Stats Grid -->
    <div class="grid grid-4" style="margin-bottom:24px" id="perfSummaryCards">
      <div class="skeleton" style="height:100px"></div>
      <div class="skeleton" style="height:100px"></div>
      <div class="skeleton" style="height:100px"></div>
      <div class="skeleton" style="height:100px"></div>
    </div>

    <!-- Charts Row 1: Response Time & Success Rate -->
    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="card" style="min-height:350px">
        <div class="card-header">
          <h3 class="card-title">Response Time Trend</h3>
        </div>
        <div class="card-body" style="height:300px">
          <canvas id="responseTimeChart"></canvas>
        </div>
      </div>
      <div class="card" style="min-height:350px">
        <div class="card-header">
          <h3 class="card-title">Success Rate Trend</h3>
        </div>
        <div class="card-body" style="height:300px">
          <canvas id="successRateChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Charts Row 2: Cost Breakdown & Daily Costs -->
    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="card" style="min-height:350px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Cost by Agent</h3>
          <select id="costChartType" class="form-select" onchange="renderCostChart()" style="width:auto;font-size:12px">
            <option value="total">Total Cost</option>
            <option value="daily">Daily Trend</option>
            <option value="tokens">Token Usage</option>
          </select>
        </div>
        <div class="card-body" style="height:300px">
          <canvas id="costChart"></canvas>
        </div>
      </div>
      <div class="card" style="min-height:350px">
        <div class="card-header">
          <h3 class="card-title">Cost Breakdown by Agent</h3>
        </div>
        <div class="card-body" style="height:300px;overflow-y:auto" id="costBreakdownTable">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- Detailed Agent Metrics Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">All Agents — Detailed Metrics</h3>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Runs</th>
                <th>Success Rate</th>
                <th>Avg Response</th>
                <th>Chat Msgs</th>
                <th>Total Cost</th>
                <th>Tokens</th>
                <th>Trends</th>
              </tr>
            </thead>
            <tbody id="perfDetailTable"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await refreshPerf();

  if (document.getElementById('perfAutoRefresh')?.checked) {
    startPerfAutoRefresh();
  }
}

function togglePerfAutoRefresh() {
  const checked = document.getElementById('perfAutoRefresh')?.checked;
  perfState.autoRefresh = checked;
  if (checked) startPerfAutoRefresh();
  else stopPerfAutoRefresh();
}

function startPerfAutoRefresh() {
  stopPerfAutoRefresh();
  perfState.refreshInterval = setInterval(refreshPerf, 30000);
}

function stopPerfAutoRefresh() {
  if (perfState.refreshInterval) {
    clearInterval(perfState.refreshInterval);
    perfState.refreshInterval = null;
  }
}

function switchPerfAgent(agentName) {
  perfState.selectedAgent = agentName;
  
  document.querySelectorAll('.agent-switch-btn').forEach(btn => {
    const isActive = btn.dataset.agent === agentName;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--accent-glow)' : 'var(--bg-card)';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--text-primary)';
  });
  
  loadAgentTrends(agentName);
}

async function refreshPerf() {
  try {
    await Promise.all([
      loadSummary(),
      loadCostBreakdown(),
    ]);
    
    if (perfState.selectedAgent) {
      loadAgentTrends(perfState.selectedAgent);
    }
  } catch (err) {
    showToast('Failed to refresh: ' + err.message, 'error');
  }
}

async function loadSummary() {
  try {
    const data = await api.getAgentPerformanceSummary();
    perfState.summary = data.agents || [];
    renderSummaryCards();
    renderDetailTable();
  } catch (err) {
    showToast('Failed to load summary: ' + err.message, 'error');
  }
}

function renderSummaryCards() {
  const container = document.getElementById('perfSummaryCards');
  if (!perfState.summary) return;
  
  container.innerHTML = perfState.summary.map(a => {
    const meta = agentMeta[a.name];
    const costColor = a.total_cost > 0 ? 'var(--yellow)' : 'var(--text-muted)';
    return `
      <div class="card" style="border-left:4px solid var(--${meta.color});min-height:100px">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <span style="font-size:24px">${meta.icon}</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">${meta.name}</div>
            <span class="badge" style="background:var(--${a.success_rate >= 80 ? 'green' : a.success_rate >= 50 ? 'yellow' : 'red'}-dim);color:var(--${a.success_rate >= 80 ? 'green' : a.success_rate >= 50 ? 'yellow' : 'red'})">${a.success_rate}% success</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)"><div style="color:var(--text-muted)">Runs</div><div style="font-weight:600">${a.total_runs}</div></div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)"><div style="color:var(--text-muted)">Avg Response</div><div style="font-weight:600">${a.avg_response_time}s</div></div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)"><div style="color:var(--text-muted)">Chat Msgs</div><div style="font-weight:600">${a.chat_messages}</div></div>
          <div style="background:var(--bg-input);padding:8px;border-radius:var(--radius)"><div style="color:var(--text-muted)">Cost</div><div style="font-weight:600;color:${costColor}">$${a.total_cost.toFixed(4)}</div></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDetailTable() {
  const container = document.getElementById('perfDetailTable');
  if (!perfState.summary) return;
  
  container.innerHTML = perfState.summary.map(a => {
    const meta = agentMeta[a.name];
    const successColor = a.success_rate >= 80 ? 'var(--green)' : a.success_rate >= 50 ? 'var(--yellow)' : 'var(--red)';
    const isSelected = a.name === perfState.selectedAgent;
    
    return `
      <tr style="cursor:pointer;${isSelected ? 'background:var(--accent-glow);' : ''}" onclick="switchPerfAgent('${a.name}')">
        <td style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${meta.icon}</span><strong>${meta.name}</strong></td>
        <td><span class="agent-dot ${a.success_rate >= 80 ? 'online' : a.success_rate >= 50 ? 'warning' : 'offline'}"></span></td>
        <td>${a.total_runs}</td>
        <td><span style="color:${successColor};font-weight:600">${a.success_rate}%</span></td>
        <td>${a.avg_response_time}s</td>
        <td>${a.chat_messages}</td>
        <td>$${a.total_cost.toFixed(4)}</td>
        <td>${a.total_tokens.toLocaleString()}</td>
        <td>
          <span class="badge ${a.trend_response === 'up' ? 'badge-success' : a.trend_response === 'down' ? 'badge-danger' : ''}">RT: ${a.trend_response}</span>
          <span class="badge ${a.trend_success === 'up' ? 'badge-success' : a.trend_success === 'down' ? 'badge-danger' : ''}">SR: ${a.trend_success}</span>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAgentTrends(agentName) {
  if (!agentName) return;
  
  try {
    const data = await api.getAgentTrends(agentName);
    perfState.agentTrends = data;
    renderCharts(data);
  } catch (err) {
    showToast('Failed to load trends: ' + err.message, 'error');
  }
}

function renderCharts(data) {
  if (!data.trends) return;
  
  const labels = data.trends.response_time?.labels || [];
  const rtValues = data.trends.response_time?.values || [];
  const srValues = data.trends.success_rate?.values || [];
  
  // Response Time Chart
  const rtCtx = document.getElementById('responseTimeChart');
  if (rtCtx && rtCtx.getContext) {
    if (perfState.charts.responseTime) perfState.charts.responseTime.destroy();
    perfState.charts.responseTime = new Chart(rtCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Response Time (s)',
          data: rtValues,
          borderColor: 'var(--accent)',
          backgroundColor: 'var(--accent-glow)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'var(--border)' } }, x: { grid: { display: false } } }
      }
    });
  }
  
  // Success Rate Chart
  const srCtx = document.getElementById('successRateChart');
  if (srCtx && srCtx.getContext) {
    if (perfState.charts.successRate) perfState.charts.successRate.destroy();
    perfState.charts.successRate = new Chart(srCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Success Rate',
          data: srValues,
          borderColor: 'var(--green)',
          backgroundColor: 'var(--green-dim)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 1, grid: { color: 'var(--border)' } }, x: { grid: { display: false } } }
      }
    });
  }
}

async function loadCostBreakdown() {
  try {
    const data = await api.getAgentCostBreakdown();
    perfState.costBreakdown = data.agents || {};
    renderCostBreakdownTable();
    renderCostChart();
  } catch (err) {
    showToast('Failed to load cost breakdown: ' + err.message, 'error');
  }
}

function renderCostBreakdownTable() {
  const container = document.getElementById('costBreakdownTable');
  if (!perfState.costBreakdown) return;
  
  const agents = Object.entries(perfState.costBreakdown);
  
  if (agents.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="empty-state-icon">💰</div><div class="empty-state-title">No cost data</div></div>';
    return;
  }
  
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${agents.map(([name, data]) => {
        const meta = agentMeta[name] || { icon: '🤖', color: 'accent' };
        const dailyEntries = Object.entries(data.daily || {}).sort((a,b) => b[0].localeCompare(a[0]));
        return `
          <div style="padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:18px">${meta.icon}</span>
              <strong style="color:var(--${meta.color})">${meta.name}</strong>
              <span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color})">Total: $${data.total_cost.toFixed(4)}</span>
              <span class="badge" style="background:var(--blue-dim);color:var(--blue)">${data.total_tokens.toLocaleString()} tokens</span>
            </div>
            ${dailyEntries.length > 0 ? `
              <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px">
                ${dailyEntries.slice(-7).map(([date, vals]) => `
                  <span style="background:var(--bg-input);padding:4px 8px;border-radius:var(--radius);color:var(--text-secondary)">
                    ${date}: $${vals.cost.toFixed(4)} (${vals.count} calls)
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCostChart() {
  const type = document.getElementById('costChartType')?.value || 'total';
  const ctx = document.getElementById('costChart');
  if (!ctx || !ctx.getContext || !perfState.costBreakdown) return;
  
  const agents = Object.entries(perfState.costBreakdown);
  
  if (perfState.charts.cost) perfState.charts.cost.destroy();
  
  let datasets = [];
  let labels = [];
  
  if (type === 'total') {
    // Bar chart: total cost per agent
    labels = agents.map(([name]) => name);
    datasets = [{
      label: 'Total Cost ($)',
      data: agents.map(([, data]) => data.total_cost),
      backgroundColor: agents.map(([name]) => `var(--${agentMeta[name]?.color || 'accent'}-dim)`),
      borderColor: agents.map(([name]) => `var(--${agentMeta[name]?.color || 'accent'})`),
      borderWidth: 2,
    }];
  } else if (type === 'daily') {
    // Line chart: daily cost trend
    const allDates = new Set();
    agents.forEach(([, data]) => {
      Object.keys(data.daily || {}).forEach(d => allDates.add(d));
    });
    labels = Array.from(allDates).sort();
    
    datasets = agents.map(([name, data]) => ({
      label: name,
      data: labels.map(date => (data.daily || {})[date]?.cost || 0),
      borderColor: `var(--${agentMeta[name]?.color || 'accent'})`,
      backgroundColor: `var(--${agentMeta[name]?.color || 'accent'}-dim)`,
      fill: true,
      tension: 0.3,
    }));
  } else if (type === 'tokens') {
    // Bar chart: total tokens per agent
    labels = agents.map(([name]) => name);
    datasets = [{
      label: 'Total Tokens',
      data: agents.map(([, data]) => data.total_tokens),
      backgroundColor: agents.map(([name]) => `var(--${agentMeta[name]?.color || 'accent'}-dim)`),
      borderColor: agents.map(([name]) => `var(--${agentMeta[name]?.color || 'accent'})`),
      borderWidth: 2,
    }];
  }
  
  perfState.charts.cost = new Chart(ctx.getContext('2d'), {
    type: type === 'daily' ? 'line' : 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: type === 'daily' } },
      scales: { y: { beginAtZero: true, grid: { color: 'var(--border)' } }, x: { grid: { display: false } } }
    }
  });
}

function renderCostChart() {
  // Wrapper to re-render when dropdown changes
  renderCostChart();
}

// Expose globally
window.renderAgentPerformance = renderAgentPerformance;
window.refreshPerf = refreshPerf;
window.togglePerfAutoRefresh = togglePerfAutoRefresh;
window.switchPerfAgent = switchPerfAgent;