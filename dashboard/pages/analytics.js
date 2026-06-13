async function renderAnalytics() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h1 style="font-weight:600;font-size:24px;color:var(--mc-text-primary);margin-bottom:4px;">System Analytics</h1>
          <div style="font-size:13px;color:var(--mc-text-secondary);">Real-time telemetry and resource usage</div>
        </div>
        <div style="display:flex;gap:12px;background:var(--mc-surface);padding:4px;border-radius:var(--mc-radius);border:1px solid var(--mc-border);">
          <button style="background:var(--mc-surface-hover);border:none;color:var(--mc-text-primary);padding:6px 12px;border-radius:4px;font-size:12px;font-weight:500;">Last 24h</button>
          <button style="background:transparent;border:none;color:var(--mc-text-secondary);padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">7 Days</button>
          <button style="background:transparent;border:none;color:var(--mc-text-secondary);padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">30 Days</button>
        </div>
      </div>

      <!-- Grafana Style Top Stats -->
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;" id="grafanaStats">
        <div class="mc-card" style="padding:20px;border-top:3px solid var(--mc-blue);">
          <div style="font-size:12px;color:var(--mc-text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Total Tokens</div>
          <div style="font-size:32px;font-weight:300;color:var(--mc-text-primary);font-family:var(--mc-font-mono);" id="statTokens">--</div>
        </div>
        <div class="mc-card" style="padding:20px;border-top:3px solid var(--mc-green);">
          <div style="font-size:12px;color:var(--mc-text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">API Cost</div>
          <div style="font-size:32px;font-weight:300;color:var(--mc-text-primary);font-family:var(--mc-font-mono);" id="statCost">--</div>
        </div>
        <div class="mc-card" style="padding:20px;border-top:3px solid var(--mc-purple);">
          <div style="font-size:12px;color:var(--mc-text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Active Agents</div>
          <div style="font-size:32px;font-weight:300;color:var(--mc-text-primary);font-family:var(--mc-font-mono);" id="statAgents">3</div>
        </div>
        <div class="mc-card" style="padding:20px;border-top:3px solid var(--mc-orange);">
          <div style="font-size:12px;color:var(--mc-text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Success Rate</div>
          <div style="font-size:32px;font-weight:300;color:var(--mc-text-primary);font-family:var(--mc-font-mono);">98.4%</div>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
        <div class="mc-card" style="display:flex;flex-direction:column;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--mc-border);font-weight:600;font-size:13px;color:var(--mc-text-primary);">Token Usage Over Time</div>
          <div style="padding:20px;height:280px;"><canvas id="grafanaTimeChart"></canvas></div>
        </div>
        <div class="mc-card" style="display:flex;flex-direction:column;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--mc-border);font-weight:600;font-size:13px;color:var(--mc-text-primary);">Usage by Agent</div>
          <div style="padding:20px;height:280px;display:flex;align-items:center;justify-content:center;"><canvas id="grafanaAgentChart"></canvas></div>
        </div>
      </div>

      <!-- Raw Data Log -->
      <div class="mc-card">
        <div style="padding:16px 20px;border-bottom:1px solid var(--mc-border);font-weight:600;font-size:13px;color:var(--mc-text-primary);display:flex;justify-content:space-between;align-items:center;">
          <span>Recent Telemetry Logs</span>
          <button class="mc-btn mc-btn-ghost" style="padding:4px 8px;font-size:11px;" onclick="renderAnalytics()">Refresh</button>
        </div>
        <div id="grafanaLogs" style="font-family:var(--mc-font-mono);font-size:12px;background:#050505;padding:16px;max-height:300px;overflow-y:auto;">
          <div class="loading" style="text-align:center;"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await api.getCost();
    const entries = data.entries || [];
    
    const totalCost = entries.reduce((s, e) => s + (e.cost || 0), 0);
    const totalTokens = entries.reduce((s, e) => s + (e.tokens || 0), 0);
    
    document.getElementById('statCost').textContent = '$' + totalCost.toFixed(4);
    document.getElementById('statTokens').textContent = totalTokens.toLocaleString();

    // Render Logs
    const logContainer = document.getElementById('grafanaLogs');
    if (entries.length === 0) {
      logContainer.innerHTML = '<span style="color:var(--mc-text-muted);">No telemetry data available.</span>';
    } else {
      logContainer.innerHTML = entries.slice(-50).reverse().map(e => `
        <div style="display:flex;gap:16px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:4px;">
          <span style="color:#569CD6;min-width:140px;">[${formatDate(e.timestamp)}]</span>
          <span style="color:#4EC9B0;min-width:80px;">${e.agent}</span>
          <span style="color:#CE9178;min-width:180px;">${e.model}</span>
          <span style="color:#DCDCAA;">${(e.tokens||0).toLocaleString()} tokens</span>
          <span style="color:#C586C0;">$${(e.cost||0).toFixed(6)}</span>
        </div>
      `).join('');
    }

    // Chart: Agent Doughnut
    const agentTotals = {};
    entries.forEach(e => {
      const a = e.agent || 'unknown';
      agentTotals[a] = (agentTotals[a] || 0) + (e.tokens || 0);
    });
    
    if (entries.length > 0) {
      new Chart(document.getElementById('grafanaAgentChart'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(agentTotals),
          datasets: [{
            data: Object.values(agentTotals),
            backgroundColor: ['#3b82f6', '#00e09e', '#a855f7', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#888', font: { size: 11, family: 'Inter' } } }
          }
        }
      });

      // Chart: Time Line
      const timeTotals = {};
      entries.forEach(e => {
        const day = e.timestamp ? e.timestamp.slice(0, 10) : 'unknown';
        timeTotals[day] = (timeTotals[day] || 0) + (e.tokens || 0);
      });
      const timeLabels = Object.keys(timeTotals).sort();
      const timeData = timeLabels.map(d => timeTotals[d]);

      new Chart(document.getElementById('grafanaTimeChart'), {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Tokens',
            data: timeData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { size: 10 } } }
          }
        }
      });
    }
  } catch (err) {
    (document.getElementById('grafanaLogs') || {}).innerHTML = `<span style="color:var(--mc-red);">Error: ${err.message}</span>`;
  }
}
