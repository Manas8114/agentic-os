// ─── Command Room — Virtual Office View ───────────────────────────────────────
// Three sub-views: Round-table | Grid | Office
// ──────────────────────────────────────────────────────────────────────────────

const CR = {
  view: 'roundtable',
  agents: [],
  refreshInterval: null,
};

const CR_VIEWS = [
  { id: 'roundtable', icon: '🔵', label: 'Round-table' },
  { id: 'grid',       icon: '▦',  label: 'Grid View'   },
  { id: 'office',     icon: '🏢',  label: 'Office View' },
];

async function renderCommandRoom() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Command Room</h1>
        <p class="page-subtitle">Live view of all agents — who's working, who's idle</p>
      </div>
      <div class="btn-group">
        ${CR_VIEWS.map(v => `
          <button class="btn ${v.id === CR.view ? 'btn-primary' : ''}" id="crViewBtn_${v.id}"
                  onclick="crSwitchView('${v.id}')">${v.icon} ${v.label}</button>
        `).join('')}
        <button class="btn" onclick="crRefresh()">🔄 Refresh</button>
      </div>
    </div>
    <div id="crContent" style="min-height:400px">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;

  await crRefresh();
  // Clear any existing interval before starting a new one
  if (CR.refreshInterval) { clearInterval(CR.refreshInterval); CR.refreshInterval = null; }
  CR.refreshInterval = setInterval(crRefresh, 8000);
}

async function crRefresh() {
  try {
    const data = await api.getAgentHealth();
    CR.agents = data.agents || [];
    crRenderView();
  } catch (err) {
    const el = document.getElementById('crContent');
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load agents</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

function crSwitchView(viewId) {
  CR.view = viewId;
  CR_VIEWS.forEach(v => {
    const btn = document.getElementById(`crViewBtn_${v.id}`);
    if (btn) { btn.className = `btn ${v.id === viewId ? 'btn-primary' : ''}`; }
  });
  crRenderView();
}

function crRenderView() {
  const el = document.getElementById('crContent');
  if (!el) return;
  switch (CR.view) {
    case 'roundtable': crRenderRoundTable(el); break;
    case 'grid':       crRenderGrid(el); break;
    case 'office':     crRenderOffice(el); break;
  }
}

// ─── Round-table View ─────────────────────────────────────────────────────────

function crRenderRoundTable(container) {
  const agents = CR.agents;
  const n = agents.length;
  const cx = 50, cy = 52, r = 36; // % units

  // Position agents in a circle
  const positions = agents.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const AGENT_META = {
    opencode: { icon: '🔧', color: '#7c6dff' },
    hermes:   { icon: '⚡', color: '#00e09e' },
    gemini:   { icon: '🧠', color: '#4285f4' },
    claude:   { icon: '🤖', color: '#ff9f43' },
  };

  container.innerHTML = `
    <div class="cr-roundtable-wrap">
      <div class="cr-roundtable">
        <!-- Center table -->
        <div class="cr-table-center">
          <div class="cr-table-label">Mission<br>Control</div>
        </div>
        <!-- Connection lines (SVG) -->
        <svg class="cr-lines" viewBox="0 0 100 104" preserveAspectRatio="none">
          ${agents.map((a, i) => {
            const p = positions[i];
            const active = a.status === 'online';
            return `<line x1="${cx}%" y1="${cy}%" x2="${p.x}%" y2="${p.y}%"
              stroke="${active ? AGENT_META[a.name]?.color || '#7c6dff' : 'var(--border)'}"
              stroke-width="0.3" stroke-dasharray="${active ? 'none' : '1,1'}" opacity="${active ? '.6' : '.3'}"/>`;
          }).join('')}
        </svg>
        <!-- Agent nodes -->
        ${agents.map((a, i) => {
          const p = positions[i];
          const meta = AGENT_META[a.name] || { icon: '🤖', color: '#7c6dff' };
          const active = a.status === 'online';
          return `
            <div class="cr-agent-node ${active ? 'cr-agent-active' : ''}"
                 style="left:${p.x}%;top:${p.y}%;border-color:${meta.color};box-shadow:${active ? `0 0 16px ${meta.color}44` : 'none'}"
                 onclick="crShowAgentDetail('${a.name}')">
              <div class="cr-node-icon">${meta.icon}</div>
              <div class="cr-node-name">${a.name}</div>
              <div class="cr-node-status">
                <span class="agent-dot ${a.status}" style="width:8px;height:8px"></span>
                <span style="font-size:9px;color:var(--text-muted)">${a.status}</span>
              </div>
              ${active ? `<div class="cr-node-pulse" style="border-color:${meta.color}"></div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="cr-legend">
        ${agents.map(a => {
          const meta = AGENT_META[a.name] || { icon: '🤖', color: '#7c6dff' };
          return `
            <div class="cr-legend-item">
              <span class="agent-dot ${a.status}" style="width:10px;height:10px"></span>
              <span style="font-size:13px">${meta.icon} ${a.name}</span>
              <span style="font-size:11px;color:var(--text-muted)">${a.total_runs || 0} runs · ${a.success_rate || 100}% success</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── Grid View ────────────────────────────────────────────────────────────────

function crRenderGrid(container) {
  const agents = CR.agents;
  const AGENT_META = {
    opencode: { icon: '🔧', color: 'blue',   label: 'Code & DevOps' },
    hermes:   { icon: '⚡', color: 'green',  label: 'Memory & Scheduling' },
    gemini:   { icon: '🧠', color: 'blue',   label: 'Research & Analysis' },
    claude:   { icon: '🤖', color: 'orange', label: 'Strategy & Architecture' },
  };

  container.innerHTML = `
    <div class="grid grid-2" style="gap:20px">
      ${agents.map(a => {
        const meta = AGENT_META[a.name] || { icon: '🤖', color: 'accent', label: 'Agent' };
        const tokenPct = Math.min(100, Math.round(((a.total_runs || 0) / Math.max(a.total_runs || 1, 50)) * 100));
        return `
          <div class="card cr-agent-card" onclick="crShowAgentDetail('${a.name}')">
            <div class="cr-grid-card-header">
              <div class="agent-health-avatar" style="background:var(--${meta.color}-dim);color:var(--${meta.color})">
                ${meta.icon}
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:15px;text-transform:capitalize">${a.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${meta.label}</div>
              </div>
              <div class="status-indicator ${a.status}">
                <span class="agent-dot ${a.status}"></span>
                <span style="text-transform:capitalize">${a.status}</span>
              </div>
            </div>
            <div class="cr-grid-stats">
              <div class="cr-grid-stat">
                <div class="cr-grid-stat-val" style="color:var(--${meta.color})">${a.total_runs || 0}</div>
                <div class="cr-grid-stat-label">Runs</div>
              </div>
              <div class="cr-grid-stat">
                <div class="cr-grid-stat-val" style="color:var(--green)">${a.success_rate || 100}%</div>
                <div class="cr-grid-stat-label">Success</div>
              </div>
              <div class="cr-grid-stat">
                <div class="cr-grid-stat-val" style="color:var(--accent)">${a.chat_messages || 0}</div>
                <div class="cr-grid-stat-label">Chats</div>
              </div>
              <div class="cr-grid-stat">
                <div class="cr-grid-stat-val" style="color:var(--text-muted);font-size:11px">
                  ${a.last_seen ? new Date(a.last_seen).toLocaleTimeString() : '—'}
                </div>
                <div class="cr-grid-stat-label">Last seen</div>
              </div>
            </div>
            <!-- Token usage bar -->
            <div style="margin-top:12px">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px">
                <span>Activity</span><span>${tokenPct}%</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${tokenPct}%;background:var(--${meta.color})"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Office View ──────────────────────────────────────────────────────────────

function crRenderOffice(container) {
  const agents = CR.agents;
  const DESKS = {
    opencode: { x: 10,  y: 15, rotation: 0,   label: 'Engineering Desk' },
    hermes:   { x: 60,  y: 15, rotation: 0,   label: 'Memory & Ops Desk' },
    gemini:   { x: 10,  y: 60, rotation: 180, label: 'Research Station' },
    claude:   { x: 60,  y: 60, rotation: 180, label: 'Strategy Hub' },
  };
  const AGENT_META = {
    opencode: { icon: '🔧', color: '#7c6dff' },
    hermes:   { icon: '⚡', color: '#00e09e' },
    gemini:   { icon: '🧠', color: '#4285f4' },
    claude:   { icon: '🤖', color: '#ff9f43' },
  };

  container.innerHTML = `
    <div class="cr-office-wrap">
      <div class="cr-office-floor">
        <!-- Floor grid -->
        <div class="cr-office-grid-overlay"></div>

        ${agents.map(a => {
          const desk = DESKS[a.name] || { x: 35, y: 35, rotation: 0, label: 'Desk' };
          const meta = AGENT_META[a.name] || { icon: '🤖', color: '#7c6dff' };
          const active = a.status === 'online';
          const queueLen = Math.floor(Math.random() * 3); // simulated task queue
          return `
            <div class="cr-desk" style="left:${desk.x}%;top:${desk.y}%;border-color:${meta.color}40;box-shadow:${active ? `0 4px 20px ${meta.color}22` : 'none'}"
                 onclick="crShowAgentDetail('${a.name}')">
              <div class="cr-desk-header" style="color:${meta.color}">
                ${meta.icon} ${a.name}
                <span class="agent-dot ${a.status}" style="width:8px;height:8px;margin-left:4px"></span>
              </div>
              <div class="cr-desk-label">${desk.label}</div>
              ${active ? `
                <div class="cr-desk-queue">
                  ${queueLen > 0 ? `<div class="cr-task-bubble">📋 ${queueLen} task${queueLen>1?'s':''} queued</div>` : '<div class="cr-task-bubble" style="opacity:.4">idle</div>'}
                </div>
                <div class="cr-desk-glow" style="background:${meta.color}"></div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <!-- Central hub -->
        <div class="cr-office-hub">
          <div style="font-size:20px">🏛</div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted)">HQ</div>
        </div>
      </div>
      <div class="cr-office-legend">
        <strong style="font-size:12px;color:var(--text-muted)">OFFICE STATUS</strong>
        ${agents.map(a => `
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
            <span class="agent-dot ${a.status}" style="width:8px;height:8px"></span>
            <span style="font-size:12px;text-transform:capitalize">${a.name}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${a.status}</span>
          </div>
        `).join('')}
        <div style="margin-top:16px;font-size:11px;color:var(--text-muted)">
          Auto-refresh: 8s
        </div>
      </div>
    </div>
  `;
}

// ─── Agent Detail Modal ───────────────────────────────────────────────────────

async function crShowAgentDetail(name) {
  try {
    const data = await api.getAgentStats(name);
    showModal(`${name} — Details`, `
      <div class="grid grid-2" style="gap:12px">
        <div class="card" style="padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Total Runs</div>
          <div style="font-size:22px;font-weight:700">${data.total_runs || 0}</div>
        </div>
        <div class="card" style="padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Success Rate</div>
          <div style="font-size:22px;font-weight:700;color:var(--green)">${data.success_rate || 100}%</div>
        </div>
        <div class="card" style="padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Chat Messages</div>
          <div style="font-size:22px;font-weight:700;color:var(--accent)">${data.chat_messages || 0}</div>
        </div>
        <div class="card" style="padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Avg Response</div>
          <div style="font-size:22px;font-weight:700;color:var(--blue)">${data.avg_response_time ? data.avg_response_time.toFixed(1) + 's' : '—'}</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="closeModal();navigate('chat')">💬 Open Chat</button>
        <button class="btn" style="flex:1" onclick="closeModal();navigate('agent-health')">🏥 Health</button>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
  } catch {
    showToast('Stats unavailable', 'warning');
  }
}

// Cleanup on page leave
window.addEventListener('hashchange', () => {
  if (CR.refreshInterval) { clearInterval(CR.refreshInterval); CR.refreshInterval = null; }
});

window.renderCommandRoom  = renderCommandRoom;
window.crSwitchView       = crSwitchView;
window.crRefresh          = crRefresh;
window.crShowAgentDetail  = crShowAgentDetail;
