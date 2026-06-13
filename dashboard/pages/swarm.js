async function renderSwarm() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Swarm Orchestration</h1>
        <p class="page-subtitle">Real-time multi-agent activity and task routing</p>
      </div>
      <div class="btn-group" style="display:flex;gap:12px;">
        <button class="mc-btn mc-btn-primary" onclick="triggerSwarmHandoff()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Test Handoff
        </button>
      </div>
    </div>
    
    <div style="display:flex;flex-direction:column;gap:32px;margin-bottom:32px;">
      
      <!-- Flow Visualization -->
      <div class="mc-card" style="padding:40px;position:relative;display:flex;justify-content:space-between;align-items:center;">
        <div style="position:absolute;top:50%;left:10%;right:10%;height:2px;background:var(--mc-border);z-index:0;transform:translateY(-50%);"></div>
        
        <!-- Gemini Node -->
        <div style="z-index:1;background:var(--mc-surface);border:1px solid var(--mc-green);border-radius:var(--mc-radius-lg);padding:24px;text-align:center;width:220px;box-shadow:0 8px 24px rgba(0, 224, 158, 0.1);">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(0, 224, 158, 0.1);color:var(--mc-green);font-size:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">🧠</div>
          <div style="font-weight:600;font-size:16px;color:var(--mc-text-primary);margin-bottom:4px;">Gemini CLI</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-bottom:16px;">Research & Analysis</div>
          <div style="background:var(--mc-bg);border:1px solid var(--mc-border);border-radius:12px;padding:8px;font-size:11px;color:var(--mc-text-muted);">
            Status: <span style="color:var(--mc-accent)">Idle</span>
          </div>
        </div>

        <!-- Hermes Node -->
        <div style="z-index:1;background:var(--mc-surface);border:1px solid var(--mc-purple);border-radius:var(--mc-radius-lg);padding:24px;text-align:center;width:220px;box-shadow:0 8px 24px rgba(168, 85, 247, 0.1);">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(168, 85, 247, 0.1);color:var(--mc-purple);font-size:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">⚡</div>
          <div style="font-weight:600;font-size:16px;color:var(--mc-text-primary);margin-bottom:4px;">Hermes</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-bottom:16px;">Coordinator & Memory</div>
          <div style="background:var(--mc-bg);border:1px solid var(--mc-border);border-radius:12px;padding:8px;font-size:11px;color:var(--mc-text-muted);">
            Status: <span style="color:var(--mc-accent)">Monitoring</span>
          </div>
        </div>

        <!-- opencode Node -->
        <div style="z-index:1;background:var(--mc-surface);border:1px solid var(--mc-blue);border-radius:var(--mc-radius-lg);padding:24px;text-align:center;width:220px;box-shadow:0 8px 24px rgba(59, 130, 246, 0.1);">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(59, 130, 246, 0.1);color:var(--mc-blue);font-size:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">💻</div>
          <div style="font-weight:600;font-size:16px;color:var(--mc-text-primary);margin-bottom:4px;">opencode</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-bottom:16px;">Code & Execution</div>
          <div style="background:var(--mc-bg);border:1px solid var(--mc-border);border-radius:12px;padding:8px;font-size:11px;color:var(--mc-text-muted);">
            Status: <span style="color:var(--mc-accent)">Idle</span>
          </div>
        </div>
      </div>

      <!-- Live Activity & Queues -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="mc-card">
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-primary);margin-bottom:16px;border-bottom:1px solid var(--mc-border);padding-bottom:12px;">Active Operations</div>
          <div style="display:flex;flex-direction:column;gap:12px;" id="swarmOps">
            <div style="padding:16px;text-align:center;color:var(--mc-text-muted);font-size:13px;">No active operations across the swarm.</div>
          </div>
        </div>
        
        <div class="mc-card">
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-primary);margin-bottom:16px;border-bottom:1px solid var(--mc-border);padding-bottom:12px;">Recent Handoffs</div>
          <div style="display:flex;flex-direction:column;gap:12px;" id="swarmHandoffs">
            <div class="loading"><div class="loading-spinner"></div></div>
          </div>
        </div>
      </div>
      
    </div>
  `;

  try {
    const audit = await api.getAudit(50);
    const handoffs = (audit.entries || audit.audit || []).filter(e => e.action && e.action.includes('handoff'));
    
    (document.getElementById('swarmHandoffs') || {}).innerHTML = handoffs.length === 0
      ? '<div style="padding:16px;text-align:center;color:var(--mc-text-muted);font-size:13px;">No handoffs recorded today.</div>'
      : handoffs.slice(0,5).map(h => `
        <div style="background:var(--mc-surface-hover);padding:12px 16px;border-radius:var(--mc-radius);border:1px solid var(--mc-border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="font-size:12px;font-family:var(--mc-font-mono);color:var(--mc-accent);">${h.from || 'System'} → ${h.to || 'Agent'}</div>
            <div style="font-size:11px;color:var(--mc-text-muted);">${timeAgo(h.timestamp)}</div>
          </div>
          <div style="font-size:13px;color:var(--mc-text-primary);">${escapeHtml(h.message || h.task || 'Transferred task context')}</div>
        </div>
      `).join('');
  } catch (err) {
    (document.getElementById('swarmHandoffs') || {}).innerHTML = `<div style="color:var(--mc-red);font-size:13px;">Error loading handoffs: ${err.message}</div>`;
  }
}

function triggerSwarmHandoff() {
  showToast('Initiating mock handoff from Gemini to opencode...', 'info');
  setTimeout(() => showToast('opencode received context. Processing.', 'success'), 2000);
}
