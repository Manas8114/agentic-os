async function renderSettings() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Settings</h1>
        <p class="mc-subtitle">Configure Agentic OS behavior</p>
      </div>
      <button class="mc-btn primary" onclick="saveAllSettings()">💾 Save All</button>
    </div>
    <div id="settingsForm"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const settings = await api.getSettings();
    const prefs = settings.agent_preferences || {};
    const dashboard = settings.dashboard || {};
    const limits = settings.free_tier_limits || {};
    const apiKeys = settings.api_keys || {};

    (document.getElementById('settingsForm') || {}).innerHTML = `
      <div class="mc-card" style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:16px;display:flex;align-items:center;gap:8px;">🤖 Agent Preferences</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;">
          ${['opencode', 'hermes', 'gemini'].map(a => `
            <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:6px;padding:14px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div class="agent-dot ${prefs[a] && prefs[a].enabled !== false ? 'online' : 'offline'}" style="width:10px;height:10px;border-radius:50%;background:${prefs[a] && prefs[a].enabled !== false ? 'var(--green)' : 'var(--text-muted)'};box-shadow:${prefs[a] && prefs[a].enabled !== false ? '0 0 8px var(--green)' : 'none'}"></div>
                <strong style="font-size:13px;color:var(--text-primary);text-transform:capitalize;">${a}</strong>
              </div>
              <label class="switch" style="margin:8px 0;display:inline-block;position:relative;width:40px;height:22px;">
                <input type="checkbox" id="agent_${a}" ${prefs[a] && prefs[a].enabled !== false ? 'checked' : ''} onchange="toggleAgent('${a}')" style="opacity:0;width:0;height:0;">
                <span class="switch-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:var(--bg-panel);border:1px solid var(--border);transition:.4s;border-radius:34px;"></span>
              </label>
              <div style="margin-top:12px;">
                <label style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;display:block;">Binary Path</label>
                <input id="bin_${a}" class="mc-input" value="${(prefs[a] && prefs[a].binary) || a}">
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="mc-card" style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:16px;display:flex;align-items:center;gap:8px;">🎨 Dashboard</div>
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Port</label>
            <input id="setPort" class="mc-input" type="number" value="${dashboard.port || 8080}">
          </div>
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Host</label>
            <input id="setHost" class="mc-input" value="${dashboard.host || '127.0.0.1'}">
          </div>
        </div>
        <div>
          <label class="switch" style="width:auto;display:flex;align-items:center;gap:10px">
            <input type="checkbox" id="setDarkMode" ${dashboard.dark_mode !== false ? 'checked' : ''}>
            <span class="switch-slider" style="position:relative;display:inline-block;width:40px;height:22px"></span>
            <span style="font-size:13px;color:var(--text-primary);">Dark Mode</span>
          </label>
        </div>
      </div>

      <div class="mc-card" style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:16px;display:flex;align-items:center;gap:8px;">🔑 API Keys</div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Gemini API Key</label>
            <input id="keyGemini" class="mc-input" type="password" value="${apiKeys.gemini || ''}" placeholder="Enter Gemini API key">
          </div>
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">OpenRouter API Key</label>
            <input id="keyOpenrouter" class="mc-input" type="password" value="${apiKeys.openrouter || ''}" placeholder="Enter OpenRouter API key">
          </div>
        </div>
      </div>

      <div class="mc-card" style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:16px;display:flex;align-items:center;gap:8px;">💰 Free Tier Limits</div>
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Gemini Flash — Requests/Day</label>
            <input id="limGReqs" class="mc-input" type="number" value="${(limits.gemini_flash && limits.gemini_flash.requests_per_day) || 1500}">
          </div>
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Gemini Flash — Tokens/Day</label>
            <input id="limGTokens" class="mc-input" type="number" value="${(limits.gemini_flash && limits.gemini_flash.tokens_per_day) || 1000000}">
          </div>
        </div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">OpenRouter Free — Requests/Day</label>
            <input id="limORReqs" class="mc-input" type="number" value="${(limits.openrouter_free && limits.openrouter_free.requests_per_day) || 100}">
          </div>
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">OpenRouter Free — Tokens/Day</label>
            <input id="limORTokens" class="mc-input" type="number" value="${(limits.openrouter_free && limits.openrouter_free.tokens_per_day) || 200000}">
          </div>
        </div>
      </div>

      <div class="mc-card" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.02);">
        <div style="font-weight:600;font-size:14px;color:var(--red);margin-bottom:8px;display:flex;align-items:center;gap:8px;">⚠ Danger Zone</div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Reset all settings to factory defaults.</p>
        <button class="mc-btn" onclick="resetSettings()" style="color:var(--red);border-color:rgba(239,68,68,0.3);">Reset to Defaults</button>
      </div>
    `;
  } catch (err) {
    (document.getElementById('settingsForm') || {}).innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function toggleAgent(name) {
  const cb = document.getElementById(`agent_${name}`);
  const card = cb.closest('.card');
  const dot = card.querySelector('.agent-dot');
  dot.className = `agent-dot ${cb.checked ? 'online' : 'offline'}`;
}

async function saveAllSettings() {
  try {
    const settings = {
      agent_preferences: {
        opencode: { enabled: document.getElementById('agent_opencode').checked, binary: document.getElementById('bin_opencode').value },
        hermes: { enabled: document.getElementById('agent_hermes').checked, binary: document.getElementById('bin_hermes').value },
        gemini: { enabled: document.getElementById('agent_gemini').checked, binary: document.getElementById('bin_gemini').value },
      },
      dashboard: {
        port: parseInt(document.getElementById('setPort').value) || 8080,
        host: document.getElementById('setHost').value || '127.0.0.1',
        dark_mode: document.getElementById('setDarkMode').checked,
      },
      api_keys: {
        gemini: document.getElementById('keyGemini').value,
        openrouter: document.getElementById('keyOpenrouter').value,
      },
      free_tier_limits: {
        gemini_flash: {
          requests_per_day: parseInt(document.getElementById('limGReqs').value) || 1500,
          tokens_per_day: parseInt(document.getElementById('limGTokens').value) || 1000000,
        },
        openrouter_free: {
          requests_per_day: parseInt(document.getElementById('limORReqs').value) || 100,
          tokens_per_day: parseInt(document.getElementById('limORTokens').value) || 200000,
        },
      },
    };
    await api.updateSettings(settings);
    showToast('Settings saved successfully', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function resetSettings() {
  showModal('Reset to Defaults', `
    <div style="background:rgba(239,68,68,0.1);border-radius:6px;padding:16px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:18px;color:var(--red);">⚠</span>
        <div>
          <strong style="font-size:13px;color:var(--red);">Warning</strong>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">This will reset all settings to factory defaults and cannot be undone.</div>
        </div>
      </div>
    </div>
  `, `
    <button class="mc-btn" onclick="closeModal()">Cancel</button>
    <button class="mc-btn" onclick="confirmReset()" style="color:var(--red);border-color:rgba(239,68,68,0.3);">Reset</button>
  `);
}

async function confirmReset() {
  const defaults = {
    theme: 'dark',
    agent_preferences: { opencode: { enabled: true, binary: 'opencode' }, hermes: { enabled: true, binary: 'hermes' }, gemini: { enabled: true, binary: 'gemini', model: 'gemini-2.5-flash' } },
    dashboard: { port: 8080, host: '127.0.0.1', dark_mode: true },
    api_keys: { gemini: '', openrouter: '' },
    free_tier_limits: { gemini_flash: { requests_per_day: 1500, tokens_per_day: 1000000 }, openrouter_free: { requests_per_day: 100, tokens_per_day: 200000 } },
  };
  try {
    await api.updateSettings(defaults);
    closeModal();
    showToast('Settings reset to defaults', 'success');
    renderSettings();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
