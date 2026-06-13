// ─── Gateway Status Bar Logic ─────────────────────────────────────────────────
// Manages the top persistent status bar: connection · profile · tokens · model
// ──────────────────────────────────────────────────────────────────────────────

const Gateway = {
  connected: false,
  tokensToday: 0,
  profile: null,
  interval: null,
};

function gwInit() {
  // Guard: clear any existing interval before starting
  if (Gateway.interval) { clearInterval(Gateway.interval); Gateway.interval = null; }
  gwLoadProfile();
  gwRefreshStatus();
  Gateway.interval = setInterval(gwRefreshStatus, 15000);
}

async function gwRefreshStatus() {
  try {
    const data = await api.getStatus();
    const online = (data.agents || []).filter(a => a.status === 'online').length;
    const total  = (data.agents || []).length;
    Gateway.connected = online > 0;

    const gwDot = document.getElementById('gwDot');
    const activeAgents = document.getElementById('mcActiveAgents');
    
    if (gwDot) gwDot.className = `mc-dot ${online === total ? 'online' : online > 0 ? 'warning' : 'error'}`;
    if (activeAgents) activeAgents.textContent = online;
  } catch {
    const gwDot = document.getElementById('gwDot');
    const activeAgents = document.getElementById('mcActiveAgents');
    
    if (gwDot) gwDot.className = 'mc-dot error';
    if (activeAgents) activeAgents.textContent = '0';
    Gateway.connected = false;
  }
}

function gwLoadProfile() {
  try {
    const activeKey = localStorage.getItem('hw_active_profile') || 'Default';
    const profiles  = JSON.parse(localStorage.getItem('hw_profiles') || '[]');
    Gateway.profile = profiles.find(p => p.name === activeKey) || { name: 'Default', model: 'openrouter/owl-alpha' };
  } catch {
    Gateway.profile = { name: 'Default', model: 'openrouter/owl-alpha' };
  }
  gwUpdateProfileUI();
}

function gwUpdateProfileUI() {
  const p = Gateway.profile;
  const mcSidebarModel = document.getElementById('mcSidebarModel');
  const mcProfileName  = document.getElementById('mcProfileName');

  if (mcSidebarModel) mcSidebarModel.textContent = (p?.model || 'owl-alpha').split('/').pop();
  if (mcProfileName)  mcProfileName.textContent  = p?.name  || 'Default';
}

function gwUpdateTokens(tokens) {
  Gateway.tokensToday += tokens || 0;
  const mcTokens = document.getElementById('mcTokensToday');
  if (mcTokens) {
    const t = Gateway.tokensToday;
    mcTokens.textContent = t >= 1000 ? `${(t / 1000).toFixed(1)}k` : `${t}`;
  }
}

async function gwRestartGateway() {
  const btn = document.querySelector('.gw-restart-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Restarting…'; }
  try {
    await api.post('/api/agents/health/refresh', {});
    showToast('Gateway refreshed', 'success');
    await gwRefreshStatus();
  } catch (err) {
    showToast('Refresh failed: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↺ Restart'; }
  }
}

// Sync profile changes from HW to gateway bar
window.addEventListener('storage', (e) => {
  if (e.key === 'hw_active_profile' || e.key === 'hw_profiles') {
    gwLoadProfile();
  }
});

// Expose
window.gwRestartGateway  = gwRestartGateway;
window.gwUpdateTokens    = gwUpdateTokens;
window.gwUpdateProfileUI = gwUpdateProfileUI;

// Fix #19: global openProfileSwitcher always available (was only defined inside hermes-workspace.js)
// If the real implementation is loaded (by navigating to hermes-workspace), call it.
// Otherwise navigate to hermes-workspace first so it loads the real function.
window.openProfileSwitcher = function() {
  if (typeof window._hwOpenProfileSwitcher === 'function') {
    window._hwOpenProfileSwitcher();
  } else {
    // Navigate to hermes-workspace; once rendered, the real implementation registers itself
    if (typeof navigate === 'function') {
      navigate('hermes-workspace');
      // Retry after a brief delay for the page script to load
      setTimeout(() => {
        if (typeof window._hwOpenProfileSwitcher === 'function') {
          window._hwOpenProfileSwitcher();
        }
      }, 600);
    }
  }
};

// Auto-init on DOMContentLoaded
window.addEventListener('DOMContentLoaded', gwInit);
