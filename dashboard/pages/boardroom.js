async function renderBoardroom() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title" style="display:flex;align-items:center;gap:12px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="color:var(--mc-blue)"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          CEO Boardroom
        </h1>
        <p class="page-subtitle">Unified control of agents, tasks, and project goals</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span id="br-swarm-badge" style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--mc-accent-dim);border:1px solid var(--mc-accent);border-radius:var(--mc-radius);font-size:12px;font-weight:600;color:var(--mc-accent);">
          <span class="mc-dot online"></span>Swarm Active
        </span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;height:calc(100vh - 200px);min-height:500px;">
      <!-- LEFT: Kanban + Goals -->
      <div style="display:flex;flex-direction:column;gap:16px;overflow:hidden;">
        <div class="mc-card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;padding:0;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:14px;">Active Projects &amp; Goals</span>
            <button class="mc-btn mc-btn-ghost" onclick="navigate('kanban')" style="font-size:11px;">Full Board →</button>
          </div>
          <div id="br-tasks" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div class="loading"><div class="loading-spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Agent Swarm + Log + Command -->
      <div style="display:flex;flex-direction:column;gap:16px;overflow:hidden;">
        <!-- Agent Swarm Status -->
        <div class="mc-card" style="padding:0;">
          <div style="padding:14px 20px;border-bottom:1px solid var(--mc-border);">
            <span style="font-weight:600;font-size:14px;">Agent Swarm Allocation</span>
          </div>
          <div id="br-agents" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;">
            <div class="loading" style="grid-column:1/-1;padding:20px;"><div class="loading-spinner"></div></div>
          </div>
        </div>

        <!-- Live Swarm Log -->
        <div class="mc-card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;padding:0;">
          <div style="padding:14px 20px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Live Swarm Logs
            </span>
            <span id="br-ws-status" style="font-size:11px;color:var(--mc-text-muted);">Connecting…</span>
          </div>
          <div id="br-terminal" style="flex:1;overflow-y:auto;padding:16px;font-family:var(--mc-font-mono);font-size:12px;background:rgba(0,0,0,0.2);display:flex;flex-direction:column;gap:6px;">
            <span style="color:var(--mc-accent);">[SYSTEM] Boardroom initialized.</span>
            <span style="color:var(--mc-text-muted);">[SYSTEM] Listening for agent telemetry...</span>
          </div>
          <div style="padding:12px 16px;border-top:1px solid var(--mc-border);background:var(--mc-surface);">
            <form id="br-cmd-form" style="display:flex;gap:8px;">
              <input type="text" id="br-cmd-input" placeholder="Give a swarm instruction…" class="mc-input" style="flex:1;">
              <button type="submit" class="mc-btn mc-btn-primary">Execute</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load active Kanban tasks
  const tasksEl = document.getElementById('br-tasks');
  try {
    const data = await api.get('/api/kanban/board');
    if (data && data.columns) {
      const activeTasks = [];
      // data.columns is an object with keys like 'triage', 'todo', 'in_progress', etc.
      ['triage', 'todo', 'in_progress'].forEach(colId => {
        const col = data.columns[colId];
        if (col && Array.isArray(col)) col.forEach(t => activeTasks.push(t));
      });
      if (activeTasks.length === 0) {
        tasksEl.innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-state-icon">✨</div><div class="empty-state-title">No active tasks</div><div class="empty-state-desc">Swarm is idle and ready.</div></div>`;
      } else {
        tasksEl.innerHTML = activeTasks.map(t => {
          const statusColor = t.status === 'in_progress' ? 'var(--mc-blue)' : t.status === 'triage' ? 'var(--mc-orange)' : 'var(--mc-text-muted)';
          const priColor = { high: 'var(--mc-red)', medium: 'var(--mc-orange)', low: 'var(--mc-accent)' }[t.priority] || 'var(--mc-text-muted)';
          return `
          <div style="background:var(--mc-surface);border:1px solid var(--mc-border);border-radius:var(--mc-radius);padding:14px;transition:var(--mc-transition);" onmouseover="this.style.borderColor='var(--mc-border-light)'" onmouseout="this.style.borderColor='var(--mc-border)'">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${statusColor};margin-top:6px;flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.title || 'Untitled')}</div>
                ${t.body ? `<div style="font-size:11px;color:var(--mc-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.body.substring(0, 120))}</div>` : ''}
                <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                  <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--mc-surface-hover);color:var(--mc-text-muted);">${t.status || 'todo'}</span>
                  ${t.priority ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${priColor}22;color:${priColor};">${t.priority}</span>` : ''}
                  ${(t.tags || []).slice(0, 2).map(tag => `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--mc-surface-hover);color:var(--mc-text-muted);">${escapeHtml(tag)}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>`;
        }).join('');
      }
    }
  } catch(e) {
    tasksEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load tasks</div><div class="empty-state-desc">${escapeHtml(e.message)}</div></div>`;
  }

  // Load agent health
  const agentsEl = document.getElementById('br-agents');
  try {
    const data = await api.getStatus();
    const agents = data.agents || [];
    if (agents.length === 0) {
      agentsEl.innerHTML = `<div style="grid-column:1/-1;padding:16px;color:var(--mc-text-muted);font-size:12px;text-align:center;">No agent data</div>`;
    } else {
      agentsEl.innerHTML = agents.slice(0, 6).map((a, i) => {
        const online = a.status === 'online';
        const colors = ['var(--mc-blue)', 'var(--mc-purple)', 'var(--mc-accent)', 'var(--mc-orange)', 'var(--mc-red)', 'var(--mc-blue)'];
        const col = colors[i % colors.length];
        return `
        <div style="padding:14px 16px;border-right:1px solid var(--mc-border);border-bottom:1px solid var(--mc-border);text-align:center;cursor:pointer;transition:var(--mc-transition);" 
             onmouseover="this.style.background='var(--mc-surface-hover)'" 
             onmouseout="this.style.background='transparent'"
             onclick="navigate('agent-control-room/${a.name}')">
          <div style="font-size:11px;color:var(--mc-text-muted);margin-bottom:4px;">${escapeHtml(a.name)}</div>
          <div style="font-size:13px;font-weight:700;color:${online ? col : 'var(--mc-text-muted)'};">${online ? (a.current_task || 'Ready') : 'Offline'}</div>
          <div style="width:6px;height:6px;border-radius:50%;background:${online ? 'var(--mc-accent)' : 'var(--mc-red)'};margin:6px auto 0;box-shadow:${online ? '0 0 8px var(--mc-accent)' : 'none'};"></div>
        </div>`;
      }).join('');
    }
  } catch(e) {
    agentsEl.innerHTML = `<div style="grid-column:1/-1;padding:16px;color:var(--mc-red);font-size:12px;">Failed to load agents</div>`;
  }

  // WebSocket for live log
  const terminal = document.getElementById('br-terminal');
  const wsStatus = document.getElementById('br-ws-status');
  function brLog(text, color = 'var(--mc-text-secondary)') {
    const span = document.createElement('span');
    span.style.color = color;
    span.textContent = text;
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
  }

  let brWs = null;
  function connectBoardroomWS() {
    const token = localStorage.getItem('agentic_os_token') || 'local-dev-key';
    const isJwt = token.split('.').length === 3;
    const param = isJwt ? `token=${token}` : `api_key=${token}`;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    brWs = new WebSocket(`${protocol}//${location.host}/ws?${param}`);
    brWs.onopen = () => { if (wsStatus) wsStatus.textContent = 'Connected via WebSocket'; wsStatus.style.color = 'var(--mc-accent)'; };
    brWs.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'agent_telemetry') brLog(`[${msg.agent?.toUpperCase()}] ${msg.message}`, 'var(--mc-blue)');
        else if (msg.type === 'system') brLog(`[SYSTEM] ${msg.message}`, 'var(--mc-text-muted)');
        else brLog(`> ${ev.data}`, 'var(--mc-text-secondary)');
      } catch { brLog(`> ${ev.data}`, 'var(--mc-text-secondary)'); }
    };
    brWs.onclose = () => {
      if (wsStatus) { wsStatus.textContent = 'Disconnected. Reconnecting...'; wsStatus.style.color = 'var(--mc-red)'; }
      brLog('[SYSTEM] Connection lost. Reconnecting in 5s...', 'var(--mc-red)');
      setTimeout(connectBoardroomWS, 5000);
    };
  }
  connectBoardroomWS();

  // Command form
  document.getElementById('br-cmd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('br-cmd-input');
    const cmd = input.value.trim();
    if (!cmd) return;
    brLog(`[YOU] ${cmd}`, 'var(--mc-orange)');
    input.value = '';
    input.disabled = true;
    try {
      const routeData = await api.post('/api/router/suggest', { task: cmd });
      const agent = routeData.suggested_agent || routeData.suggested || 'hermes';
      brLog(`[ROUTER] Routing to ${agent.toUpperCase()}`, 'var(--mc-purple)');
      const res = await api.chat(agent, cmd);
      const reply = res.response?.content || res.response || '(no response)';
      brLog(`[${agent.toUpperCase()}] ${reply.substring(0, 300)}`, 'var(--mc-text-primary)');
    } catch (err) {
      brLog(`[ERROR] ${err.message}`, 'var(--mc-red)');
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

window.renderBoardroom = renderBoardroom;
