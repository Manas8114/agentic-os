// Unified Agent Control Room — Complete per-agent workspace
// Features: Chat, History, Config, Models, Skills, Kanban, Activity, Performance
// Loads agent from URL hash: #agent-control-room/{agentName}

const ACR_STATE = {
  agentName: 'opencode',
  activePanel: 'chat',
  chatHistory: [],
  sessionHistory: [],
  kanbanTasks: [],
  activityLog: [],
  performanceData: {},
  skills: [],
  config: {},
  apiKeys: {},
  ws: null,
};

const ACR_AGENT_META = {
  opencode:      { icon: '🔧', name: 'opencode',       desc: 'Code & DevOps',        color: 'var(--blue)',   panels: ['chat','history','config','models','skills','kanban','activity','performance'] },
  hermes:        { icon: '⚡', name: 'Hermes',         desc: 'Memory & Scheduling',  color: 'var(--purple)', panels: ['chat','history','config','models','skills','memory','tasks','activity','performance'] },
  gemini:        { icon: '🧠', name: 'Gemini CLI',     desc: 'Research & Analysis',  color: 'var(--green)',  panels: ['chat','history','config','models','skills','research','activity','performance'] },
  claude:        { icon: '🤖', name: 'Claude',         desc: 'Strategy & Architecture', color: 'var(--orange)', panels: ['chat','history','config','models','skills','review','activity','performance'] },
  codex:         { icon: '🐙', name: 'Codex',          desc: 'Code & CI/CD',         color: 'var(--teal)',   panels: ['chat','history','config','models','skills','kanban','ci','activity','performance'] },
  antigravity:   { icon: '🔭', name: 'Antigravity',    desc: 'Research & Discovery', color: 'var(--indigo)', panels: ['chat','history','config','models','skills','research','activity','performance'] },
  openclaw:      { icon: '🕸', name: 'OpenClaw',       desc: 'Routing & Orchestration', color: 'var(--violet)',panels: ['chat','history','config','models','skills','routing','handoffs','activity','performance'] },
  odysseus:      { icon: '🧭', name: 'Odysseus',       desc: 'Planning & Execution', color: 'var(--amber)',  panels: ['chat','history','config','models','skills','planning','goals','activity','performance'] },
  jarvis:        { icon: '🎙', name: 'Jarvis',         desc: 'Voice Assistant',      color: 'var(--pink)',   panels: ['chat','history','config','models','skills','voice','schedule','tasks','activity','performance'] },
};

const PANEL_DEFS = {
  chat:       { icon: '💬', label: 'Chat',       render: 'acrRenderChat' },
  history:    { icon: '📜', label: 'History',    render: 'acrRenderHistory' },
  config:     { icon: '⚙️', label: 'Config',     render: 'acrRenderConfig' },
  models:     { icon: '🤖', label: 'Models',     render: 'acrRenderModels' },
  skills:     { icon: '⚡', label: 'Skills',     render: 'acrRenderSkills' },
  kanban:     { icon: '📌', label: 'Kanban',     render: 'acrRenderKanban' },
  ci:         { icon: '🔀', label: 'CI/CD',      render: 'acrRenderCI' },
  memory:     { icon: '🧠', label: 'Memory',     render: 'acrRenderMemory' },
  tasks:      { icon: '📋', label: 'Tasks',      render: 'acrRenderTasks' },
  routing:    { icon: '🧭', label: 'Routing',    render: 'acrRenderRouting' },
  handoffs:   { icon: '🔄', label: 'Handoffs',   render: 'acrRenderHandoffs' },
  review:     { icon: '🔍', label: 'Code Review',render: 'acrRenderReview' },
  research:   { icon: '🔬', label: 'Research',   render: 'acrRenderResearch' },
  planning:   { icon: '📋', label: 'Planning',   render: 'acrRenderPlanning' },
  goals:      { icon: '🎯', label: 'Goals',      render: 'acrRenderGoals' },
  voice:      { icon: '🎙', label: 'Voice',      render: 'acrRenderVoice' },
  schedule:   { icon: '📅', label: 'Schedule',   render: 'acrRenderSchedule' },
  activity:   { icon: '📊', label: 'Activity',   render: 'acrRenderActivity' },
  performance:{ icon: '📈', label: 'Performance',render: 'acrRenderPerformance' },
};

async function renderAgentControlRoom() {
  // Determine agent from URL hash
  const hash = window.location.hash.slice(1);
  const agentMatch = hash.match(/^agent-control-room\/?(\w+)?/);
  ACR_STATE.agentName = agentMatch ? agentMatch[1] : 'opencode';
  ACR_STATE.activePanel = 'chat';

  const meta = ACR_AGENT_META[ACR_STATE.agentName];
  if (!meta) { console.error('Unknown agent:', ACR_STATE.agentName); return; }

  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="acr-root" style="display:flex;height:calc(100vh - 60px);background:var(--bg-primary)">
      <!-- Left Panel Nav -->
      <nav class="acr-sidebar" style="width:260px;min-width:260px;background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column">
        <div class="acr-sidebar-header" style="padding:16px;border-bottom:1px solid var(--border)">
          <div class="acr-agent-badge" style="display:flex;align-items:center;gap:12px">
            <span class="acr-agent-icon" style="font-size:32px">${meta.icon}</span>
            <div>
              <div class="acr-agent-name" style="font-weight:700;font-size:16px">${meta.name}</div>
              <div class="acr-agent-desc" style="font-size:11px;color:var(--text-muted)">${meta.desc}</div>
            </div>
            <span class="agent-dot online" style="width:10px;height:10px;margin-left:auto"></span>
          </div>
        </div>
        <div class="acr-nav" style="flex:1;overflow-y:auto;padding:8px">
          ${meta.panels.map(p => {
            const def = PANEL_DEFS[p];
            return `<button class="acr-nav-item ${p === 'chat' ? 'active' : ''}" onclick="acrSwitchPanel('${p}')" id="acrnav_${p}" style="display:flex;align-items:center;gap:10px;padding:12px;background:none;border:none;border-radius:8px;color:var(--text-secondary);font-size:13px;font-weight:500;cursor:pointer;transition:var(--transition);width:100%;text-align:left" ${!PANEL_DEFS[p] ? 'disabled style="opacity:.4"' : ''}>
              <span class="acr-nav-icon" style="font-size:16px">${def?.icon || '🔧'}</span>
              <span class="acr-nav-label">${def?.label || p}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="acr-sidebar-footer" style="padding:12px;border-top:1px solid var(--border)">
          <div class="acr-agent-status" style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-muted)">
            <span id="acrModel">${meta.name}</span>
            <span id="acrStatus">● Online</span>
          </div>
        </div>
      </nav>

      <!-- Main Panel Area -->
      <div class="acr-main" style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg-primary)">
        <div class="acr-panel-header" style="padding:16px 24px;border-bottom:1px solid var(--border);background:var(--bg-secondary);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0">
            <div class="acr-agent-mini" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;cursor:pointer" onclick="acrOpenAgentSwitcher()" title="Switch agent">
              <span class="acr-agent-icon" style="font-size:20px">${meta.icon}</span>
              <span class="acr-agent-name" style="font-weight:600;font-size:13px">${meta.name}</span>
              <span style="font-size:10px;color:var(--text-muted)">▼</span>
            </div>
            <div>
              <div class="acr-panel-title" id="acrPanelTitle" style="font-weight:600;font-size:16px">${PANEL_DEFS.chat.icon} ${PANEL_DEFS.chat.label}</div>
              <div class="acr-panel-sub" id="acrPanelSub" style="font-size:12px;color:var(--text-muted);margin-top:2px">${getPanelDescription('chat')}</div>
            </div>
          </div>
          <div class="btn-group" id="acrPanelActions" style="display:flex;gap:8px;flex-shrink:0"></div>
        </div>
        <div class="acr-panel-content" id="acrMain" style="flex:1;overflow:auto;min-height:0">
          <div class="loading" style="padding:60px;text-align:center"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  await acrSwitchPanel('chat');
}

function getPanelDescription(panelId) {
  const descs = {
    chat: 'Persistent chat with markdown, syntax highlighting, and history',
    history: 'Session history and message replay',
    config: 'Agent configuration: binary, prompts, limits, tools',
    models: 'Model selection, temperature, max tokens',
    skills: 'Skills registry filtered for this agent',
    kanban: 'Task board for this agent\'s work',
    ci: 'CI/CD pipeline monitoring and triggers',
    memory: 'Brain files, journal, semantic search, knowledge graph',
    tasks: 'Agent-specific task queue and scheduling',
    routing: 'Task routing rules and agent selection logic',
    handoffs: 'Inter-agent handoff protocol management',
    review: 'Automated code review queue and history',
    research: 'Web research, synthesis, and discovery tools',
    planning: 'Multi-step plan creation and execution',
    goals: 'OKR tracking, progress bars, milestone tracking',
    voice: 'Voice capture, TTS, wake word configuration',
    schedule: 'Calendar events, recurring, briefings',
    activity: 'Audit log, skill runs, chat messages, timeline',
    performance: 'Latency, success rate, cost, token usage trends',
  };
  return descs[panelId] || 'Panel content';
}

async function acrSwitchPanel(panelId) {
  ACR_STATE.activePanel = panelId;
  document.querySelectorAll('.acr-nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`acrnav_${panelId}`);
  if (navEl) navEl.classList.add('active');

  const def = PANEL_DEFS[panelId];
  if (!def) return;

  document.getElementById('acrPanelTitle').textContent = `${def.icon} ${def.label}`;
  document.getElementById('acrPanelSub').textContent = getPanelDescription(panelId);
  document.getElementById('acrPanelActions').innerHTML = getPanelActions(panelId);

  const main = document.getElementById('acrMain');
  if (!main) return;
  main.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

  const renderFn = window[def.render];
  if (renderFn) {
    await renderFn(main);
  } else {
    main.innerHTML = `<div class="empty-state" style="padding:60px;text-align:center"><div class="empty-state-icon">🔧</div><div class="empty-state-title">${def.label} Panel</div><div class="empty-state-desc">Coming soon</div></div>`;
  }
}

function getPanelActions(panelId) {
  const actions = {
    chat: '<button class="btn btn-sm" onclick="acrExportChat()">⬇ Export</button><button class="btn btn-sm" onclick="acrClearChat()">🗑 Clear</button>',
    history: '<button class="btn btn-sm" onclick="acrReloadHistory()">🔄 Refresh</button>',
    kanban: '<button class="btn btn-sm btn-primary" onclick="acrAddKanbanTask()">+ Add Task</button>',
    memory: '<button class="btn btn-sm" onclick="acrReindexMemory()">🔄 Reindex</button>',
    performance: '<button class="btn btn-sm" onclick="acrReloadPerformance()">🔄 Refresh</button>',
    skills: '<button class="btn btn-sm" onclick="acrReloadSkills()">🔄 Refresh Skills</button>',
    kanban: '<button class="btn btn-sm btn-primary" onclick="acrAddKanbanTask()">+ Add Task</button>',
    review: '<button class="btn btn-sm btn-primary" onclick="acrRunCodeReview()">🔍 Run Review</button>',
    research: '<button class="btn btn-sm btn-primary" onclick="acrRunResearch()">🔍 Start Research</button>',
    planning: '<button class="btn btn-sm btn-primary" onclick="acrCreatePlan()">📋 New Plan</button>',
    goals: '<button class="btn btn-sm btn-primary" onclick="acrAddGoal()">🎯 New Goal</button>',
    voice: '<button class="btn btn-sm btn-primary" onclick="acrTestTTS()">🔊 Test TTS</button>',
    schedule: '<button class="btn btn-sm btn-primary" onclick="acrAddScheduleEvent()">+ Add Event</button>',
    ci: '<button class="btn btn-sm btn-primary" onclick="acrTriggerPipeline()">▶ Trigger</button>',
    handoffs: '<button class="btn btn-sm btn-primary" onclick="acrCreateHandoff()">+ New Handoff</button>',
    routing: '<button class="btn btn-sm btn-primary" onclick="acrAddRoutingRule()">+ Add Rule</button>',
    planning: '<button class="btn btn-sm btn-primary" onclick="acrCreatePlan()">📋 New Plan</button>',
    goals: '<button class="btn btn-sm btn-primary" onclick="acrAddGoal()">🎯 New Goal</button>',
  };
  return actions[panelId] || '';
}

// Agent Switcher Modal
function acrOpenAgentSwitcher() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;min-width:320px;max-width:90vw;max-height:80vh;overflow:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="margin:0;font-size:18px">Switch Agent</h3>
        <button class="btn btn-ghost" onclick="this.closest('[data-modal]').remove()" style="padding:4px 8px">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        ${Object.entries(ACR_AGENT_META).map(([key, meta]) => `
          <button onclick="acrSwitchAgent('${key}'); this.closest('[data-modal]').remove()" 
                  style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;background:${key === ACR_STATE.agentName ? 'var(--accent-glow)' : 'var(--bg-card)'};border:${key === ACR_STATE.agentName ? '2px solid var(--accent)' : '1px solid var(--border)'};border-radius:var(--radius);cursor:pointer;transition:var(--transition)"
                  onmouseover="this.style.borderColor='var(--accent)'" 
                  onmouseout="this.style.borderColor='${key === ACR_STATE.agentName ? 'var(--accent)' : 'var(--border)'}'">
            <span style="font-size:28px">${meta.icon}</span>
            <span style="font-weight:600;font-size:13px">${meta.name}</span>
            <span style="font-size:10px;color:var(--text-muted)">${meta.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  modal.dataset.modal = 'true';
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function acrSwitchAgent(agentName) {
  if (!ACR_AGENT_META[agentName]) { console.error('Unknown agent:', agentName); return; }
  window.location.hash = `agent-control-room/${agentName}`;
  window.location.reload();
}

// ─── PANEL: CHAT ────────────────────────────────────────────────────────────
async function acrRenderChat(container) {
  container.innerHTML = `
    <div class="acr-chat-wrap" style="display:flex;flex-direction:column;height:100%;min-height:0">
      <div class="acr-messages" id="acrMessages" style="flex:1;overflow:auto;padding:24px;display:flex;flex-direction:column;gap:16px"></div>
      <div class="acr-chat-input-area" style="padding:16px 24px;border-top:1px solid var(--border);background:var(--bg-secondary)">
        <div style="display:flex;gap:12px;align-items:flex-end">
          <textarea id="acrChatInput" class="form-input" rows="1" placeholder="Message ${ACR_AGENT_META[ACR_STATE.agentName].name}… (Enter to send, Shift+Enter for newline)" style="flex:1;min-height:44px;max-height:180px;resize:none;font-family:inherit" onkeydown="acrHandleChatKey(event)" oninput="acrAutoResize(this)"></textarea>
          <button class="btn btn-primary acr-send-btn" onclick="acrSendMessage()" style="height:44px;flex-shrink:0">➤</button>
        </div>
      </div>
    </div>
  `;
  await acrLoadChatHistory();
}

async function acrLoadChatHistory() {
  try {
    const data = await api.getChatHistory();
    ACR_STATE.chatHistory = data.messages || [];
    acrRenderMessages();
  } catch (e) { console.warn('Failed to load chat history:', e); }
}

function acrRenderMessages() {
  const el = document.getElementById('acrMessages');
  if (!el) return;
  if (ACR_STATE.chatHistory.length === 0) {
    el.innerHTML = `
      <div class="acr-chat-welcome" style="text-align:center;padding:40px 20px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:48px;margin-bottom:16px">${ACR_AGENT_META[ACR_STATE.agentName].icon}</div>
        <div style="font-weight:700;font-size:20px;margin-bottom:8px">${ACR_AGENT_META[ACR_STATE.agentName].name} is ready</div>
        <div style="color:var(--text-secondary);font-size:13px;margin-bottom:24px">${ACR_AGENT_META[ACR_STATE.agentName].desc}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
          ${['Hello!', 'What can you do?', 'Show status', 'Run heartbeat'].map(t => `<button class="btn btn-sm" onclick="acrQuickPrompt('${t}')">${t}</button>`).join('')}
        </div>
      </div>
    `;
    return;
  }
  el.innerHTML = ACR_STATE.chatHistory.map(m => `
    <div class="acr-message ${m.role}" style="display:flex;flex-direction:column;gap:4px;max-width:85%;${m.role === 'assistant' ? 'align-self:flex-start' : 'align-self:flex-end'}">
      <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-muted)">${m.role === 'user' ? 'You' : ACR_AGENT_META[m.agent]?.icon + ' ' + ACR_AGENT_META[m.agent]?.name} • ${formatTime(m.timestamp)}</div>
      <div class="acr-message-content" style="padding:10px 14px;border-radius:12px;${m.role === 'user' ? 'background:var(--accent-glow);border-bottom-right-radius:2px' : 'background:var(--bg-card);border:1px solid var(--border);border-bottom-left-radius:2px'}">${escapeHtml(m.content).substring(0, 5000)}</div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function acrHandleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); acrSendMessage(); }
}

function acrAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

async function acrSendMessage() {
  const input = document.getElementById('acrChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';

  const userMsg = { role: 'user', agent: ACR_STATE.agentName, content: msg, timestamp: new Date().toISOString() };
  ACR_STATE.chatHistory.push(userMsg);
  acrRenderMessages();

  // Show typing indicator
  const typingId = 'typing-' + Date.now();
  document.getElementById('acrMessages').innerHTML += `
    <div id="${typingId}" class="acr-message assistant" style="align-self:flex-start;opacity:.6">
      <div style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;border-bottom-left-radius:2px"><span class="loading-spinner" style="width:16px;height:16px"></span> Thinking…</div>
    </div>
  `;
  document.getElementById('acrMessages').scrollTop = document.getElementById('acrMessages').scrollHeight;

  try {
    // Auto-inject context
    let enhancedMessage = msg;
    try {
      const inj = await api.auto_inject_context({ task: msg, agent: ACR_STATE.agentName });
      if (inj.context) enhancedMessage = `${inj.context}\n\n---\n\n${msg}`;
    } catch {}

    const res = await api.chat(ACR_STATE.agentName, enhancedMessage);
    document.getElementById(typingId)?.remove();
    if (res.response) {
      ACR_STATE.chatHistory.push(res.response);
      acrRenderMessages();
    }
  } catch (err) {
    document.getElementById(typingId)?.remove();
    showToast('Chat error: ' + err.message, 'error');
  }
}

function acrQuickPrompt(prompt) {
  const input = document.getElementById('acrChatInput');
  if (input) { input.value = prompt; acrSendMessage(); }
}

function acrExportChat() {
  const text = ACR_STATE.chatHistory.map(m => `**[${m.role}]** ${m.agent}: ${m.content}`).join('\n\n');
  navigator.clipboard.writeText(text).then(() => showToast('Chat exported to clipboard', 'success'));
}

function acrClearChat() {
  ACR_STATE.chatHistory = [];
  acrRenderMessages();
}

// ─── PANEL: HISTORY ───────────────────────────────────────────────────────────
async function acrRenderHistory(container) {
  container.innerHTML = `
    <div style="padding:16px 24px">
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="acrHistSearch" class="form-input" placeholder="Search messages…" style="flex:1;min-width:200px" oninput="acrFilterHistory()">
        <select id="acrHistAgent" class="form-select" onchange="acrFilterHistory()" style="width:auto"><option value="all">All Agents</option>${Object.keys(ACR_AGENT_META).map(k => `<option value="${k}">${ACR_AGENT_META[k].icon} ${ACR_AGENT_META[k].name}</option>`).join('')}</select>
        <select id="acrHistRole" class="form-select" onchange="acrFilterHistory()" style="width:auto"><option value="all">All Roles</option><option value="user">User</option><option value="assistant">Assistant</option></select>
      </div>
      <div id="acrHistList" style="max-height:calc(100vh - 200px);overflow:auto"></div>
    </div>
  `;
  await acrLoadFullHistory();
}

async function acrLoadFullHistory() {
  try {
    const data = await api.getChatHistory();
    ACR_STATE.sessionHistory = data.messages || [];
    acrRenderHistoryList();
  } catch (e) { console.warn(e); }
}

function acrFilterHistory() {
  const q = document.getElementById('acrHistSearch')?.value.toLowerCase() || '';
  const agent = document.getElementById('acrHistAgent')?.value || 'all';
  const role = document.getElementById('acrHistRole')?.value || 'all';
  let msgs = ACR_STATE.sessionHistory || [];
  if (agent !== 'all') msgs = msgs.filter(m => m.agent === agent);
  if (role !== 'all') msgs = msgs.filter(m => m.role === role);
  if (q) msgs = msgs.filter(m => m.content.toLowerCase().includes(q));
  acrRenderHistoryList(msgs);
}

function acrRenderHistoryList(list = ACR_STATE.sessionHistory || []) {
  const el = document.getElementById('acrHistList');
  if (!el) return;
  el.innerHTML = list.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">📜</div><div class="empty-state-title">No messages</div></div>' : list.map(m => `
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:12px 16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <span class="badge" style="background:${m.role === 'user' ? 'var(--blue-dim)' : 'var(--green-dim)'};color:${m.role === 'user' ? 'var(--blue)' : 'var(--green)'}">${m.role}</span>
          ${ACR_AGENT_META[m.agent]?.icon} <strong>${ACR_AGENT_META[m.agent]?.name}</strong>
          <span style="color:var(--text-muted);font-size:11px;margin-left:auto">${formatTime(m.timestamp)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-secondary);font-family:var(--font-mono);max-height:80px;overflow:auto">${escapeHtml(m.content.substring(0, 200))}</div>
      </div>
    </div>
  `).join('');
}

function acrReloadHistory() { acrLoadFullHistory(); }

// ─── PANEL: CONFIG ────────────────────────────────────────────────────────────
async function acrRenderConfig(container) {
  const meta = ACR_AGENT_META[ACR_STATE.agentName];
  try {
    const res = await fetch(`/${meta.configFile}`);
    ACR_STATE.config = res.ok ? await res.json() : { name: meta.name, enabled: true };
    container.innerHTML = `
      <div style="padding:16px 24px;max-width:700px">
        <div class="form-group"><label class="form-label">Agent Name</label><input class="form-input" value="${escapeHtml(ACR_STATE.config.name || meta.name)}" disabled></div>
        <div class="form-group"><label class="form-label">Binary / Command</label><input id="cfgBinary" class="form-input" value="${escapeHtml(ACR_STATE.config.binary || meta.name)}"></div>
        <div class="form-group"><label class="form-label">Max Turns</label><input id="cfgMaxTurns" class="form-input" type="number" value="${ACR_STATE.config.max_turns || 50}" min="1" max="200"></div>
        <div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cfgAutoApprove" ${ACR_STATE.config.auto_approve ? 'checked' : ''}><span>Auto-approve tool calls</span></label></div>
        <div class="form-group"><label class="form-label">Allowed Tools (comma-separated)</label><input id="cfgTools" class="form-input" value="${(ACR_STATE.config.allowed_tools || []).join(', ')}"></div>
        <div class="form-group"><label class="form-label">System Prompt</label><textarea id="cfgPrompt" class="form-input" rows="8" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(ACR_STATE.config.system_prompt || '')}</textarea></div>
        <div class="flex" style="gap:12px;margin-top:24px">
          <button class="btn btn-primary" onclick="acrSaveConfig('${meta.configFile}')">💾 Save Config</button>
          <button class="btn btn-ghost" onclick="acrReloadConfig()">↺ Reload</button>
        </div>
      </div>
    `;
  } catch (e) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load config</div></div>`; }
}

async function acrSaveConfig(configFile) {
  const config = {
    name: ACR_STATE.agentName,
    binary: document.getElementById('cfgBinary')?.value || ACR_STATE.agentName,
    max_turns: parseInt(document.getElementById('cfgMaxTurns')?.value || '50'),
    auto_approve: document.getElementById('cfgAutoApprove')?.checked || false,
    allowed_tools: document.getElementById('cfgTools')?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
    system_prompt: document.getElementById('cfgPrompt')?.value || '',
  };
  try {
    await fetch(`/${configFile}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    showToast('Config saved', 'success');
  } catch (e) { showToast('Save failed: ' + e.message, 'error'); }
}

function acrReloadConfig() { acrRenderConfig(document.getElementById('acrMain')); }

// ─── PANEL: MODELS ────────────────────────────────────────────────────────────
async function acrRenderModels(container) {
  const models = getAvailableModels(ACR_STATE.agentName);
  const currentModel = ACR_STATE.config.model || models[0]?.value || '';
  const temps = { opencode: 0.7, hermes: 0.7, gemini: 0.7, claude: 0.7, codex: 0.7, antigravity: 0.8, openclaw: 0.5, odysseus: 0.7, jarvis: 0.7 };
  const currTemp = ACR_STATE.config.temperature || temps[ACR_STATE.agentName] || 0.7;
  const currTokens = ACR_STATE.config.max_tokens || 8192;

  container.innerHTML = `
    <div style="padding:16px 24px;max-width:600px">
      <div class="form-group"><label class="form-label">Model</label><select id="cfgModel" class="form-select">${models.map(m => `<option value="${m.value}" ${m.value === currentModel ? 'selected' : ''}>${m.label}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Temperature</label><input id="cfgTemp" class="form-input" type="number" step="0.1" min="0" max="2" value="${currTemp}"></div>
      <div class="form-group"><label class="form-label">Max Tokens</label><input id="cfgTokens" class="form-input" type="number" value="${currTokens}"></div>
      <div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cfgStream" ${ACR_STATE.config.stream !== false ? 'checked' : ''}><span>Stream responses</span></label></div>
      <div class="flex" style="gap:12px;margin-top:24px"><button class="btn btn-primary" onclick="acrSaveModelConfig()">💾 Save Model Config</button></div>
    </div>
  `;
}

async function acrSaveModelConfig() {
  const meta = ACR_AGENT_META[ACR_STATE.agentName];
  const config = { model: document.getElementById('cfgModel')?.value, temperature: parseFloat(document.getElementById('cfgTemp')?.value || '0.7'), max_tokens: parseInt(document.getElementById('cfgTokens')?.value || '8192'), stream: document.getElementById('cfgStream')?.checked };
  try { await fetch(`/${meta.configFile}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }); showToast('Model config saved', 'success'); } catch (e) { showToast('Save failed: ' + e.message, 'error'); }
}

// ─── PANEL: SKILLS ────────────────────────────────────────────────────────────
async function acrRenderSkills(container) {
  container.innerHTML = `<div style="padding:16px 24px"><div id="acrSkillsList"><div class="loading"><div class="loading-spinner"></div></div></div></div>`;
  try {
    const data = await api.getSkills();
    ACR_STATE.skills = (data.skills || []).filter(s => (s.primary_agent || 'opencode').toLowerCase() === ACR_STATE.agentName.toLowerCase());
    if (ACR_STATE.skills.length === 0) { container.innerHTML = `<div class="empty-state" style="padding:40px 24px"><div class="empty-state-icon">⚡</div><div class="empty-state-title">No skills for ${ACR_AGENT_META[ACR_STATE.agentName].name}</div><div class="empty-state-desc">Skills are assigned via SKILL.md Primary: field</div></div>`; return; }
    const cats = {};
    for (const s of ACR_STATE.skills) { const cat = s.category || 'general'; if (!cats[cat]) cats[cat] = []; cats[cat].push(s); }
    let html = '';
    for (const [cat, catSkills] of Object.entries(cats)) {
      html += `<h5 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin:20px 0 8px;padding:0 24px">${cat}</h5>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 24px">`;
      for (const s of catSkills) {
        const avg = s.avg_score ? (s.avg_score * 100).toFixed(0) + '%' : '—';
        const runs = s.total_runs || 0;
        html += `<button class="skill-badge" onclick="acrRunSkill('${s.name}')" style="display:inline-flex;align-items:center;gap:6px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;cursor:pointer;transition:var(--transition)" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"><span style="font-weight:600">${s.name}</span><span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:10px">${runs} runs</span>${avg !== '—' ? `<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:10px">${avg}</span>` : ''}</button>`;
      }
      html += `</div>`;
    }
    container.innerHTML = `<div style="padding:16px 24px">${html}</div>`;
  } catch (e) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load skills</div></div>`; }
}

async function acrRunSkill(skillName) {
  showToast(`Running ${skillName}…`, 'info');
  try { const res = await api.runSkill(skillName, '', ACR_STATE.agentName); showToast(`${skillName}: ${res.output?.substring(0, 100) || 'done'}`, 'success'); } catch (e) { showToast(e.message, 'error'); }
}

function acrReloadSkills() { acrRenderSkills(document.getElementById('acrMain')); }

// ─── PANEL: KANBAN ────────────────────────────────────────────────────────────
async function acrRenderKanban(container) {
  container.innerHTML = `<div style="padding:16px 24px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0">📌 Kanban Board</h3><button class="btn btn-primary" onclick="acrAddKanbanTask()">+ Add Task</button></div><div id="acrKanbanBoard" class="flex" style="gap:16px;overflow:auto;height:calc(100vh - 200px)"></div></div>`;
  await acrLoadKanban();
}

async function acrLoadKanban() {
  try {
    const data = await api.getKanbanBoard();
    const columns = { triage: '📥 Triage', todo: '📋 Todo', ready: '✅ Ready', in_progress: '🔄 In Progress', blocked: '🚫 Blocked', done: '✅ Done' };
    const board = document.getElementById('acrKanbanBoard');
    if (!board) return;
    board.innerHTML = Object.entries(columns).map(([key, label]) => `
      <div class="acr-kanban-col" style="min-width:280px;max-width:320px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-secondary);font-weight:600">${label} <span class="badge" id="acrKanbanCount_${key}">0</span></div>
        <div class="acr-kanban-drop" id="acrKanbanCol_${key}" style="flex:1;overflow:auto;padding:8px;min-height:200px" ondragover="acrDragOver(event)" ondrop="acrDrop(event, '${key}')" ondragleave="acrDragLeave(event,this)"></div>
      </div>
    `).join('');
    for (const [key, tasks] of Object.entries(data.columns || {})) {
      const col = document.getElementById(`acrKanbanCol_${key}`);
      const count = document.getElementById(`acrKanbanCount_${key}`);
      if (col && count) { count.textContent = tasks.length; col.innerHTML = tasks.map(t => acrKanbanCard(t)).join(''); }
    }
  } catch (e) { console.warn(e); }
}

function acrKanbanCard(t) {
  const priColor = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };
  return `<div class="acr-kanban-card" draggable="true" data-id="${t.id}" ondragstart="acrDragStart(event)" style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;cursor:grab" ondragend="this.style.opacity='1'">
    <div style="font-weight:600;font-size:13px;margin-bottom:4px">${escapeHtml(t.title)}</div>
    ${t.body ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${escapeHtml(t.body.substring(0, 100))}</div>` : ''}
    <div style="display:flex;gap:8px;font-size:10px">
      ${t.priority ? `<span class="badge" style="border:none;background:${priColor[t.priority] || 'var(--border)'};color:var(--text-primary)">${t.priority}</span>` : ''}
      ${t.assignee ? `<span class="badge" style="border:none;background:var(--blue-dim);color:var(--blue)">${t.assignee}</span>` : ''}
    </div>
  </div>`;
}

function acrAddKanbanTask() {
  const title = prompt('Task title:'); if (!title) return;
  const body = prompt('Description (optional):') || '';
  api.createKanbanTask({ title, body, status: 'triage', priority: 'medium', assignee: '' }).then(() => { acrLoadKanban(); showToast('Task created', 'success'); }).catch(e => showToast(e.message, 'error'));
}

function acrDragStart(e) { e.dataTransfer.setData('text/plain', e.target.dataset.id); e.target.style.opacity = '0.5'; }
function acrDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function acrDragLeave(e, el) { e.preventDefault(); el.classList.remove('drag-over'); }
function acrDrop(e, targetStatus) { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const id = e.dataTransfer.getData('text/plain'); if (id) { api.updateKanbanTask(id, { status: targetStatus }).then(() => acrLoadKanban()).catch(e => showToast(e.message, 'error')); } }

// ─── PANEL: ACTIVITY ──────────────────────────────────────────────────────────
async function acrRenderActivity(container) {
  container.innerHTML = `<div style="padding:16px 24px"><div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"><input type="text" id="acrActSearch" class="form-input" placeholder="Search audit log…" style="flex:1;min-width:200px" oninput="acrFilterActivity()"><select id="acrActLimit" class="form-select" onchange="acrLoadActivity()" style="width:auto"><option value="100">100</option><option value="500" selected>500</option><option value="1000">1000</option></select></div><div id="acrActList" style="max-height:calc(100vh - 200px);overflow:auto"></div></div>`;
  await acrLoadActivity();
}

async function acrLoadActivity() {
  try {
    const limit = document.getElementById('acrActLimit')?.value || '100';
    const data = await api.getAudit(limit);
    ACR_STATE.activityLog = data.audit || [];
    acrRenderActivityList();
  } catch (e) { console.warn(e); }
}

function acrFilterActivity() {
  const q = document.getElementById('acrActSearch')?.value.toLowerCase() || '';
  const filtered = ACR_STATE.activityLog.filter(a => JSON.stringify(a).toLowerCase().includes(q));
  acrRenderActivityList(filtered);
}

function acrRenderActivityList(list = ACR_STATE.activityLog) {
  const el = document.getElementById('acrActList');
  if (!el) return;
  el.innerHTML = list.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">📋</div><div class="empty-state-title">No activity</div></div>' : list.slice().reverse().map(a => `
    <div class="card" style="margin-bottom:6px"><div class="card-body" style="padding:10px 14px"><div style="display:flex;gap:10px;align-items:center"><span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:10px">${a.action}</span><span style="color:var(--text-muted);font-size:11px">${a.timestamp}</span><span style="margin-left:auto;color:var(--text-secondary);font-size:11px">${escapeHtml(a.skill || a.agent || a.message || '')}</span></div></div></div>
  `).join('');
}

// ─── PANEL: PERFORMANCE ───────────────────────────────────────────────────────
async function acrRenderPerformance(container) {
  container.innerHTML = `<div style="padding:16px 24px"><div style="display:flex;gap:12px;margin-bottom:16px"><button class="btn btn-sm" onclick="acrReloadPerformance()">🔄 Refresh</button></div><div id="acrPerfStats" class="grid grid-4" style="margin-bottom:24px"></div><canvas id="acrPerfChart" style="max-height:300px"></div></div>`;
  await acrLoadPerformance();
}

async function acrLoadPerformance() {
  try {
    const data = await api.getAgentPerformanceSummary();
    const agents = data.agents || [];
    const acrAgent = agents.find(a => a.name === ACR_STATE.agentName) || { total_runs: 0, success_rate: 0, avg_response_time: 0, total_cost: 0, total_tokens: 0 };
    const statsEl = document.getElementById('acrPerfStats');
    if (statsEl) statsEl.innerHTML = `
      <div class="card stat-card"><div class="stat-icon blue">🔄</div><div class="stat-value">${acrAgent.total_runs}</div><div class="stat-label">Total Runs</div></div>
      <div class="card stat-card"><div class="stat-icon ${acrAgent.success_rate >= 0.8 ? 'green' : 'yellow'}">${acrAgent.success_rate >= 0.8 ? '✓' : '⚠'}</div><div class="stat-value">${(acrAgent.success_rate * 100).toFixed(1)}%</div><div class="stat-label">Success Rate</div></div>
      <div class="card stat-card"><div class="stat-icon purple">⏱</div><div class="stat-value">${acrAgent.avg_response_time.toFixed(0)}ms</div><div class="stat-label">Avg Response</div></div>
      <div class="card stat-card"><div class="stat-icon pink">💰</div><div class="stat-value">$${acrAgent.total_cost.toFixed(4)}</div><div class="stat-label">Total Cost</div></div>
    `;
    const trends = await api.getAgentTrends(ACR_STATE.agentName);
    acrRenderPerfChart(trends.trends);
  } catch (e) { console.warn(e); }
}

function acrRenderPerfChart(trends) {
  const ctx = document.getElementById('acrPerfChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;
  if (window._acrPerfChart) window._acrPerfChart.destroy();
  const labels = trends.response_time?.labels || [];
  window._acrPerfChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Response Time (ms)', data: trends.response_time?.values || [], borderColor: 'var(--blue)', backgroundColor: 'var(--blue-dim)', yAxisID: 'y', tension: 0.3, fill: true },
        { label: 'Success Rate %', data: trends.success_rate?.values || [], borderColor: 'var(--green)', backgroundColor: 'var(--green-dim)', yAxisID: 'y1', tension: 0.3, fill: true },
        { label: 'Cost $', data: trends.cost?.values || [], borderColor: 'var(--pink)', backgroundColor: 'rgba(253,121,168,0.1)', yAxisID: 'y2', tension: 0.3, fill: true },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-muted)' } }, y: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-muted)' } }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100, ticks: { color: 'var(--text-muted)' } }, y2: { type: 'linear', position: 'right', offset: true, grid: { drawOnChartArea: false }, ticks: { color: 'var(--text-muted)' } } }, plugins: { legend: { labels: { color: 'var(--text-secondary)' } } } }
  });
}

function acrReloadPerformance() { acrLoadPerformance(); }

// ─── PANEL: RESEARCH ───────────────────────────────────────────────────────────
async function acrRenderResearch(container) {
  container.innerHTML = `
    <div style="padding:16px 24px;max-width:900px">
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <h3 style="margin:0;align-self:center">🔬 Research & Discovery</h3>
        <button class="btn btn-primary" onclick="acrNewResearch()">+ New Research</button>
        <button class="btn btn-secondary" onclick="acrLoadResearchHistory()">📜 History</button>
      </div>
      <div id="acrResearchContent"></div>
    </div>
  `;
  await acrLoadResearchHistory();
}

async function acrNewResearch() {
  const topic = prompt('Research topic/question:');
  if (!topic) return;
  showToast('Starting research via Antigravity…', 'info');
  try {
    const res = await api.chat('antigravity', topic);
    const content = res.response?.content || 'No response';
    const researchId = 'research_' + Date.now();
    localStorage.setItem(researchId, JSON.stringify({ topic, content, timestamp: new Date().toISOString() }));
    showToast('Research complete', 'success');
    acrRenderResearchResult(content);
  } catch (e) { showToast(e.message, 'error'); }
}

function acrRenderResearchResult(content) {
  const container = document.getElementById('acrResearchContent');
  if (!container) return;
  container.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">Research Result</span></div>
      <div class="card-body" style="padding:16px;white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;line-height:1.7">${escapeHtml(content)}</div>
      <div class="card-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px">
        <button class="btn btn-sm btn-secondary" onclick="acrSaveResearch()">💾 Save</button>
        <button class="btn btn-sm" onclick="acrNewResearch()">🔁 New Research</button>
      </div>
    </div>
  `;
}

async function acrLoadResearchHistory() {
  const container = document.getElementById('acrResearchContent');
  if (!container) return;
  try {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('research_')) {
        items.push({ key, ...JSON.parse(localStorage.getItem(key)) });
      }
    }
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:60px 24px;text-align:center"><div class="empty-state-icon">🔬</div><div class="empty-state-title">No research yet</div><div class="empty-state-desc">Click "New Research" to start</div></div>`;
      return;
    }
    container.innerHTML = `<div style="display:grid;gap:12px">${items.map(item => `
      <div class="card" style="cursor:pointer" onclick="acrViewResearch('${item.key}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div class="card-body" style="padding:16px">
          <div style="font-weight:600;margin-bottom:4px">${escapeHtml(item.topic)}</div>
          <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono">${escapeHtml(item.timestamp)}</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-secondary);font-family:var(--font-mono)">${escapeHtml(item.content?.substring(0, 150) || '')}...</div>
        </div>
      </div>
    `).join('')}</div>`;
  } catch (e) { console.warn(e); }
}

function acrViewResearch(key) {
  const data = JSON.parse(localStorage.getItem(key));
  acrRenderResearchResult(data.content);
}

function acrSaveResearch() {
  // Research is auto-saved on creation; this is a placeholder for future enhancements
  showToast('Research already saved', 'info');
}

// Stub panels (to be implemented)
const stubPanels = ['memory','tasks','routing','handoffs','review','planning','goals','voice','schedule','ci'];
stubPanels.forEach(p => { window['acrRender' + p.charAt(0).toUpperCase() + p.slice(1)] = (container) => { container.innerHTML = `<div class="empty-state" style="padding:60px 24px;text-align:center"><div class="empty-state-icon">🔧</div><div class="empty-state-title">${PANEL_DEFS[p]?.label || p} Panel</div><div class="empty-state-desc">Coming soon for ${ACR_AGENT_META[ACR_STATE.agentName]?.name}</div></div>`; }; });

// Register
window.renderAgentControlRoom = renderAgentControlRoom;
window.acrSwitchPanel = acrSwitchPanel;
window.acrOpenAgentSwitcher = acrOpenAgentSwitcher;
window.acrSwitchAgent = acrSwitchAgent;
window.acrRenderChat = acrRenderChat;
window.acrRenderHistory = acrRenderHistory;
window.acrRenderConfig = acrRenderConfig;
window.acrRenderModels = acrRenderModels;
window.acrRenderSkills = acrRenderSkills;
window.acrRenderKanban = acrRenderKanban;
window.acrRenderActivity = acrRenderActivity;
window.acrRenderPerformance = acrRenderPerformance;
window.acrSwitchPanel = acrSwitchPanel;
window.acrOpenAgentSwitcher = acrOpenAgentSwitcher;
window.acrSwitchAgent = acrSwitchAgent;
window.acrRunSkill = acrRunSkill;
window.acrReloadSkills = acrReloadSkills;
window.acrLoadKanban = acrLoadKanban;
window.acrAddKanbanTask = acrAddKanbanTask;
window.acrDragStart = acrDragStart;
window.acrDragOver = acrDragOver;
window.acrDragLeave = acrDragLeave;
window.acrDrop = acrDrop;
window.acrLoadActivity = acrLoadActivity;
window.acrFilterActivity = acrFilterActivity;
window.acrLoadPerformance = acrLoadPerformance;
window.acrReloadPerformance = acrReloadPerformance;
window.acrSaveConfig = acrSaveConfig;
window.acrReloadConfig = acrReloadConfig;
window.acrSaveModelConfig = acrSaveModelConfig;
window.acrRunSkill = acrRunSkill;
window.acrQuickPrompt = acrQuickPrompt;
window.acrExportChat = acrExportChat;
window.acrClearChat = acrClearChat;
window.acrReloadHistory = acrReloadHistory;
window.acrFilterHistory = acrFilterHistory;
window.acrRenderActivityList = acrRenderActivityList;
window.acrRenderPerfChart = acrRenderPerfChart;
window.acrReloadPerformance = acrReloadPerformance;
window.getPanelDescription = getPanelDescription;
window.getPanelActions = getPanelActions;
window.acrOpenAgentSwitcher = acrOpenAgentSwitcher;
window.acrSwitchAgent = acrSwitchAgent;