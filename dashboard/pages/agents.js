async function renderAgents() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Roster</h1>
        <p class="page-subtitle">Manage, monitor, and coordinate your autonomous agents</p>
      </div>
      <div class="btn-group" style="display:flex;gap:12px;">
        <button class="mc-btn mc-btn-primary" onclick="window.CommandPalette && window.CommandPalette.toggle()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Spawn Agent
        </button>
      </div>
    </div>
    
    <div id="agentsGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:24px;">
      <div class="loading" style="padding:48px;grid-column:1/-1;"><div class="loading-spinner"></div></div>
    </div>
  `;

  try {
    const status = await api.getStatus();
    const agents = status.agents || [];
    
    (document.getElementById('agentsGrid') || {}).innerHTML = agents.map(a => {
      const isOnline = a.status === 'online';
      const clr = isOnline ? 'var(--mc-accent)' : 'var(--mc-red)';
      
      let description = "Autonomous AI Agent";
      if (a.name === "opencode") description = "Code generation, DevOps, File Ops";
      else if (a.name === "hermes") description = "Persistent memory, channels, orchestration";
      else if (a.name === "gemini") description = "Research, web analysis, reasoning";
      
      return `
      <div class="mc-card" style="display:flex;flex-direction:column;position:relative;overflow:hidden;">
        <!-- Status Indicator -->
        <div style="position:absolute;top:20px;right:20px;display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${clr};box-shadow:0 0 8px ${clr};"></div>
          <span style="font-size:11px;font-weight:600;color:${clr};text-transform:uppercase;">${a.status}</span>
        </div>
        
        <div style="margin-bottom:16px;display:flex;align-items:center;gap:16px;">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--mc-surface-hover);border:1px solid var(--mc-border);display:flex;align-items:center;justify-content:center;font-size:24px;">
            ${a.name === 'opencode' ? '💻' : a.name === 'hermes' ? '🧠' : '🔍'}
          </div>
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:600;color:var(--mc-text-primary);">${a.name}</h3>
            <div style="font-size:12px;color:var(--mc-text-secondary);font-family:var(--mc-font-mono);">${a.version || 'v1.0.0'}</div>
          </div>
        </div>
        
        <p style="font-size:13px;color:var(--mc-text-secondary);margin:0 0 20px 0;line-height:1.5;flex:1;">
          ${description}
        </p>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:16px;border-top:1px solid var(--mc-border);">
          <button class="mc-btn mc-btn-ghost" style="justify-content:center;" onclick="navigate('agent-control-room/${a.name}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </button>
          <button class="mc-btn mc-btn-primary" style="justify-content:center;" onclick="navigate('agent-control-room/${a.name}#terminal')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            Console
          </button>
        </div>
      </div>
    `}).join('');
    
  } catch (err) {
    (document.getElementById('agentsGrid') || {}).innerHTML = `
      <div class="mc-card" style="grid-column:1/-1;">
        <div style="color:var(--mc-red);font-weight:600;margin-bottom:8px;">Telemetry Error</div>
        <div style="font-size:13px;color:var(--mc-text-secondary);">${escapeHtml(err.message)}</div>
        <button class="mc-btn mc-btn-primary" style="margin-top:16px;" onclick="renderAgents()">Retry Connection</button>
      </div>`;
  }
}
