async function renderPlugins() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Plugin Registry</h1>
        <p class="mc-subtitle">Manage installed plugins and extensions</p>
      </div>
      <button class="mc-btn primary" onclick="showInstallPlugin()">+ Install</button>
    </div>
    <div id="pluginList"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const data = await api.getPlugins();
    const plugins = data.plugins || [];
    const container = document.getElementById('pluginList');

    if (plugins.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔌</div><div class="empty-state-title">No plugins installed</div><div class="empty-state-desc">Install plugins from the registry or create your own</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="mc-card" style="padding:0;overflow:hidden;">
        <div class="table-wrapper" style="margin:0;">
          <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:500;font-size:12px;text-transform:uppercase;">
                <th style="padding:12px 16px;">Plugin</th>
                <th style="padding:12px 16px;">Version</th>
                <th style="padding:12px 16px;">Type</th>
                <th style="padding:12px 16px;text-align:right;">Installed</th>
              </tr>
            </thead>
            <tbody>
              ${plugins.map((p, i) => `
                <tr style="${i !== plugins.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.02);' : ''}">
                  <td style="padding:12px 16px;font-weight:500;color:var(--text-primary);">${p.name}</td>
                  <td style="padding:12px 16px;"><code style="font-family:var(--font-mono);font-size:12px;color:var(--cyan);background:rgba(56,189,248,0.1);padding:2px 6px;border-radius:4px;">${p.version || '1.0.0'}</code></td>
                  <td style="padding:12px 16px;"><span class="mc-badge" style="background:rgba(255,255,255,0.05);color:var(--text-secondary);">${p.type || 'skill'}</span></td>
                  <td style="padding:12px 16px;text-align:right;color:var(--text-muted);">${formatDate(p.installed)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);text-align:right;margin-top:12px">${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} active</div>
    `;
  } catch (err) {
    (document.getElementById('pluginList') || {}).innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function showInstallPlugin() {
  showModal('Install Plugin', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="font-size:13px;color:var(--text-secondary);">Enter the name of the plugin to install from the registry.</div>
      <input id="pluginNameInput" class="mc-input" placeholder="e.g., my-custom-skill">
    </div>
  `, `
    <button class="mc-btn" onclick="closeModal()">Cancel</button>
    <button class="mc-btn primary" onclick="installPlugin()">Install</button>
  `);
}

async function installPlugin() {
  const name = document.getElementById('pluginNameInput').value.trim();
  if (!name) { showToast('Plugin name required', 'warning'); return; }
  try {
    const r = await api.installPlugin(name);
    closeModal();
    showToast(r.status === 'already_installed' ? 'Already installed' : `"${name}" installed`, r.status === 'already_installed' ? 'info' : 'success');
    renderPlugins();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
