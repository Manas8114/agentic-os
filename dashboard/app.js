const pageCache = {};

const PAGE_BASE = '/dashboard/pages/';

let ws = null;
let wsReconnectDelay = 1000;
const WS_MAX_RECONNECT_DELAY = 30000;
const WS_URL = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';

// Fix #18: consistent getAuthToken — falls back to local-dev-key, never throws
function getAuthToken() {
  let token = localStorage.getItem('agentic_os_token');
  if (token === 'null' || token === 'undefined') token = null;
  return token || 'local-dev-key';
}

function buildWSUrl(baseUrl) {
  const token = getAuthToken();
  const separator = baseUrl.includes('?') ? '&' : '?';
  // Determine if it's a JWT (has 3 parts separated by .) or API key
  if (token.includes('.') && token.split('.').length === 3) {
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return `${baseUrl}${separator}api_key=${encodeURIComponent(token)}`;
}

async function loadPage(name) {
  if (pageCache[name]) return pageCache[name];
  // Handle sub-routes like agent-control-room/hermes -> agent-control-room
  const cacheKey = name.split('/')[0];
  if (pageCache[cacheKey]) return pageCache[cacheKey];
  try {
    // Load the base page script (e.g., agent-control-room.js for agent-control-room/hermes)
    await loadScript(`${PAGE_BASE}${cacheKey}.js`);
    pageCache[cacheKey] = true;
    pageCache[name] = true; // Also cache the full path
  } catch (err) {
    showToast(`Failed to load page: ${name}`, 'error');
    throw err;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function navigate(page) {
  const hash = page || window.location.hash.slice(1) || 'dashboard';
  if (!hash) { window.location.hash = 'dashboard'; return; }
  const basePage = hash.split('/')[0];
  window.currentPage = hash;

  const bar = document.getElementById('topLoadingBar');
  if (bar) { bar.classList.add('active'); bar.style.width = '30%'; }

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = Array.from(document.querySelectorAll('.nav-item'))
    .find(el => el.getAttribute('href') === `#${hash}`)
    || Array.from(document.querySelectorAll('.nav-item'))
      .find(el => el.dataset.page === basePage);
  if (navItem) navItem.classList.add('active');

  const info = PAGE_TITLES[hash] || PAGE_TITLES[basePage] || { title: 'Unknown', breadcrumb: '' };

  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="loading"><div class="loading-spinner"></div><span>Loading ${info.title}...</span></div>`;

  try {
    await loadPage(hash);
    const renderName = basePage
      .split('-')
      .filter(Boolean)
      .map(capitalize)
      .join('');
    const renderFn = window[`render${renderName}`];
    if (renderFn) {
      content.innerHTML = '';
      content.className = 'mc-main page-enter';
      if (bar) bar.style.width = '70%';
      await renderFn(hash);
      if (bar) { bar.style.width = '100%'; setTimeout(() => { bar.style.width = '0'; bar.classList.remove('active'); }, 400); }
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Page not found</div><div class="empty-state-desc">The page "${hash}" doesn't have a render function</div></div>`;
      if (bar) { bar.style.width = '0'; bar.classList.remove('active'); }
    }
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load</div><div class="empty-state-desc">${escapeHtml(err.message)}</div><button class="btn btn-primary mt-3" onclick="navigate('dashboard')">Go to Dashboard</button></div>`;
    if (bar) { bar.style.width = '0'; bar.classList.remove('active'); }
  }
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function initWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  // Always connect — use stored token or fall back to local-dev-key
  const wsUrl = buildWSUrl(WS_URL);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] Connected');
    wsReconnectDelay = 1000;
    updateWSIndicator(true);
    ws.send(JSON.stringify({ type: 'request_status' }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWSMessage(msg);
    } catch (e) {
      console.warn('[WS] Failed to parse message:', e);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected, reconnecting in', wsReconnectDelay, 'ms');
    updateWSIndicator(false);
    setTimeout(initWebSocket, wsReconnectDelay);
    wsReconnectDelay = Math.min(wsReconnectDelay * 2, WS_MAX_RECONNECT_DELAY);
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };
}

function handleWSMessage(msg) {
  switch (msg.type) {
    case 'agent_status':
      updateAgentStatusFromWS(msg.data);
      break;
    case 'agent_health':
      if (window.renderAgentHealthPage) window.renderAgentHealthPage(msg.data);
      if (window.handleAgentHealthWS) window.handleAgentHealthWS(msg.data);
      break;
    case 'skill_event':
      if (msg.data.event === 'started') {
        showToast(`▶ Skill "${msg.data.skill}" started on ${msg.data.agent} #${msg.data.run_id}`, 'info');
      } else if (msg.data.event === 'completed') {
        showToast(`✓ Skill "${msg.data.skill}" completed via ${msg.data.agent} #${msg.data.run_id}`, 'success');
      } else if (msg.data.event === 'failed') {
        showToast(`✗ Skill "${msg.data.skill}" failed on ${msg.data.agent} #${msg.data.run_id}: ${msg.data.output}`, 'error');
      }
      if (window.renderSkillsPage) window.renderSkillsPage();
      break;
    case 'audit_event':
      if (window.renderAuditPage) window.renderAuditPage();
      break;
    case 'chat_message':
      if (window.renderChatPage) window.renderChatPage();
      break;
    case 'pong':
      break;
    default:
      console.log('[WS] Unhandled message type:', msg.type);
  }
}

function updateAgentStatusFromWS(data) {
  const agents = data.agents || [];
  const online = agents.filter(a => a.status === 'online').length;
  const total = agents.length;

  const activeAgents = document.getElementById('mcActiveAgents');
  if (activeAgents) activeAgents.textContent = online;

  const badge = document.getElementById('skillCount');
  if (badge && data.skills_count !== undefined) badge.textContent = data.skills_count;

  // Update agent health count badge (shows number of agents online)
  const healthBadge = document.getElementById('agentHealthCount');
  if (healthBadge) healthBadge.textContent = online;

  // Update notification badge if notification center is loaded
  if (window.NotificationCenter && window.NotificationCenter.getStats) {
    const stats = window.NotificationCenter.getStats();
    const notifBadge = document.getElementById('notifCount');
    if (notifBadge) notifBadge.textContent = stats.unread;
  }

  // Sync gateway bar profile info
  if (window.gwUpdateProfileUI) window.gwUpdateProfileUI();
}

function updateWSIndicator(connected) {
  const indicator = document.getElementById('wsIndicator');
  if (!indicator) return;
  indicator.className = 'ws-indicator ' + (connected ? 'online' : 'offline');
  indicator.title = connected ? 'WebSocket connected' : 'WebSocket disconnected';
}

async function updateAgentStatus() {
  try {
    const status = await api.getStatus();
    updateAgentStatusFromWS(status);
  } catch {
    const activeAgents = document.getElementById('mcActiveAgents');
    if (activeAgents) activeAgents.textContent = '0';
  }
}

window.wsSend = function(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
};

window.wsReconnect = function() {
  if (ws) ws.close();
  wsReconnectDelay = 1000;
  initWebSocket();
};

window.renderPage = navigate;

window.addEventListener('hashchange', () => navigate());
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  navigate(window.location.hash.slice(1) || 'dashboard');
  updateAgentStatus();
  initWebSocket();
  // Polling fallback every 60s (reduced from 15s since WS is primary)
  window._appStatusInterval    = setInterval(updateAgentStatus, 60000);
  // Update notification badge every 10s
  window._appNotifInterval     = setInterval(() => {
    if (window.NotificationCenter && window.NotificationCenter.getStats) {
      const stats = window.NotificationCenter.getStats();
      const notifBadge = document.getElementById('notifCount');
      if (notifBadge) notifBadge.textContent = stats.unread;
    }
  }, 10000);
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/dashboard/sw.js').catch(() => {});
  }
});
