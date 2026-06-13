async function renderDashboard() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Mission Control Overview</h1>
        <p class="page-subtitle">Agentic OS system status and live telemetry</p>
      </div>
      <div class="btn-group" style="display:flex;gap:12px;">
        <button class="mc-btn mc-btn-primary" onclick="runQuickSkill()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Quick Execute
        </button>
      </div>
    </div>
    
    <div id="dashStats" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:24px;margin-bottom:32px;"></div>
    
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
      <!-- Agent Radar -->
      <div class="mc-card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;font-size:14px;">Active Agents</span>
          <span style="font-size:12px;color:var(--mc-text-secondary);"><span class="mc-dot online" style="display:inline-block;margin-right:6px;"></span>Live Telemetry</span>
        </div>
        <div id="agentList" style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;overflow-y:auto;max-height:400px;">
          <div class="loading" style="padding:24px;"><div class="loading-spinner"></div></div>
        </div>
      </div>

      <!-- Live Activity Stream -->
      <div class="mc-card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;font-size:14px;">Activity Stream</span>
          <a href="#audit" style="font-size:12px;color:var(--mc-blue);text-decoration:none;">View all →</a>
        </div>
        <div id="recentActivity" style="padding:0;overflow-y:auto;max-height:400px;">
          <div class="loading" style="padding:24px;"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  try {
    const [status, skills, audit] = await Promise.all([
      api.getStatus(),
      api.getSkills(),
      api.getAudit(12)
    ]);

    const agents = status.agents || [];
    const skillsCount = status.skills_count || 0;
    const entries = audit.entries || [];
    const online = agents.filter(a => a.status === 'online').length;

    // Stat Cards
    (document.getElementById('dashStats') || {}).innerHTML = `
      <div class="mc-card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(59, 130, 246, 0.1);color:var(--mc-blue);display:flex;align-items:center;justify-content:center;font-size:20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <div style="font-size:24px;font-weight:600;line-height:1;">${online}<span style="font-size:14px;color:var(--mc-text-muted);font-weight:400;">/${agents.length}</span></div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:4px;">Agents Online</div>
        </div>
      </div>
      <div class="mc-card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(0, 224, 158, 0.1);color:var(--mc-accent);display:flex;align-items:center;justify-content:center;font-size:20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div>
          <div style="font-size:24px;font-weight:600;line-height:1;">${skillsCount}</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:4px;">Ready Skills</div>
        </div>
      </div>
      <div class="mc-card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(168, 85, 247, 0.1);color:var(--mc-purple);display:flex;align-items:center;justify-content:center;font-size:20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <div style="font-size:24px;font-weight:600;line-height:1;">${entries.length}</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:4px;">Recent Events</div>
        </div>
      </div>
      <div class="mc-card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(245, 158, 11, 0.1);color:var(--mc-orange);display:flex;align-items:center;justify-content:center;font-size:20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
        </div>
        <div>
          <div style="font-size:24px;font-weight:600;line-height:1;">${(skills || []).filter(s => s.scores && s.scores.length > 0).length}</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:4px;">Evaluated Skills</div>
        </div>
      </div>
    `;

    // Agent Grid
    (document.getElementById('agentList') || {}).innerHTML = agents.map(a => {
      const isOnline = a.status === 'online';
      const clr = isOnline ? 'var(--mc-accent)' : 'var(--mc-red)';
      return `
      <div style="background:var(--mc-surface);border:1px solid var(--mc-border);border-radius:var(--mc-radius-md);padding:16px;display:flex;align-items:flex-start;gap:12px;transition:all var(--mc-transition);cursor:pointer;" onmouseover="this.style.borderColor='var(--mc-border-light)'" onmouseout="this.style.borderColor='var(--mc-border)'" onclick="navigate('agent-control-room/${a.name}')">
        <div style="width:8px;height:8px;border-radius:50%;background:${clr};box-shadow:0 0 8px ${clr};margin-top:6px;flex-shrink:0;"></div>
        <div>
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-primary);">${a.name}</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:2px;font-family:var(--mc-font-mono);">${a.version || 'v1.0.0'}</div>
        </div>
      </div>
    `}).join('');

    // Activity Stream
    (document.getElementById('recentActivity') || {}).innerHTML = entries.length === 0
      ? '<div style="padding:32px;text-align:center;color:var(--mc-text-muted);font-size:13px;">No activity recorded</div>'
      : entries.map((e, idx) => `
        <div style="padding:16px 24px;border-bottom:1px solid var(--mc-border);display:flex;gap:16px;align-items:flex-start;${idx===0?'background:var(--mc-surface-hover)':''}">
          <div style="width:2px;height:100%;background:${e.action === 'skill_run' ? 'var(--mc-blue)' : 'var(--mc-text-muted)'};border-radius:2px;align-self:stretch;"></div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-weight:500;font-size:13px;color:var(--mc-text-primary);">${e.action}${e.skill ? `: <span style="font-family:var(--mc-font-mono);color:var(--mc-accent);">${e.skill}</span>` : ''}</span>
              <span style="font-size:11px;color:var(--mc-text-muted);">${timeAgo(e.timestamp)}</span>
            </div>
            <div style="font-size:12px;color:var(--mc-text-secondary);margin-top:4px;">
              ${e.agent ? `<span style="border:1px solid var(--mc-border);border-radius:4px;padding:2px 6px;margin-right:6px;">${e.agent}</span>` : ''}
              ${e.run_id ? `#${e.run_id}` : ''}
            </div>
          </div>
        </div>
      `).join('');

  } catch (err) {
    (document.getElementById('dashStats') || {}).innerHTML = `
      <div class="mc-card" style="grid-column:1/-1;">
        <div style="color:var(--mc-red);font-weight:600;margin-bottom:8px;">Telemetry Error</div>
        <div style="font-size:13px;color:var(--mc-text-secondary);">${escapeHtml(err.message)}</div>
        <button class="mc-btn mc-btn-primary" style="margin-top:16px;" onclick="renderDashboard()">Retry Connection</button>
      </div>`;
  }
}

async function runQuickSkill() {
  showModal('Quick Execute Skill', `
    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:12px;font-weight:600;color:var(--mc-text-secondary);margin-bottom:8px;">Target Skill</label>
      <select id="qrSkill" class="mc-input">
        <option value="">Select a skill...</option>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:12px;font-weight:600;color:var(--mc-text-secondary);margin-bottom:8px;">Parameters / Input (Optional)</label>
      <textarea id="qrInput" class="mc-input" rows="3" placeholder="Enter input context or arguments..." style="resize:vertical;"></textarea>
    </div>
  `, `
    <button class="mc-btn" onclick="closeModal()">Cancel</button>
    <button class="mc-btn mc-btn-primary" onclick="executeQuickRun()">Dispatch</button>
  `);

  try {
    const skills = await api.getSkills();
    const select = document.getElementById('qrSkill');
    skills.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name.replace(/-/g, ' ');
      select.appendChild(opt);
    });
  } catch {}
}

async function executeQuickRun() {
  const name = document.getElementById('qrSkill').value;
  const input = document.getElementById('qrInput').value;
  if (!name) { showToast('Please select a skill', 'warning'); return; }
  try {
    const r = await api.runSkill(name, input);
    closeModal();
    showToast(`Dispatched ${name} to ${r.agent} #${r.run_id}`, 'success');
  } catch (err) {
    showToast(`Dispatch failed: ${err.message}`, 'error');
  }
}
