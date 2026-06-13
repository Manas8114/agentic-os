// ─── Hermes Workspace V2 ──────────────────────────────────────────────────────
// Full control room with 8-panel left-sidebar nav:
// Chat | Memory | Skills | Files | Terminal | Inspector | Tasks | Settings
// ──────────────────────────────────────────────────────────────────────────────

const HW = {
  activePanel: 'chat',
  profile: null,
  chatHistory: [],
  inspectorLog: [],
  swarmRunning: false,
  swarmAgents: [],
  swarmAbortController: null, // cancel in-flight swarm requests on nav
};

// Cleanup on navigation away — cancel swarm, no persistent intervals to clear
(function _hwSetupCleanup() {
  const prev = window._hwHashHandler;
  if (prev) window.removeEventListener('hashchange', prev);
  window._hwHashHandler = function() {
    if (HW.swarmAbortController) {
      HW.swarmAbortController.abort();
      HW.swarmAbortController = null;
    }
    HW.swarmRunning = false;
  };
  window.addEventListener('hashchange', window._hwHashHandler);
})();

const HW_PANELS = [
  { id: 'chat',       icon: '💬', label: 'Chat'       },
  { id: 'memory',     icon: '🧠', label: 'Memory'     },
  { id: 'skills',     icon: '⚡', label: 'Skills'     },
  { id: 'files',      icon: '📁', label: 'Files'      },
  { id: 'terminal',   icon: '⌨',  label: 'Terminal'   },
  { id: 'inspector',  icon: '🔬', label: 'Inspector'  },
  { id: 'tasks',      icon: '📌', label: 'Tasks'      },
  { id: 'swarm',      icon: '🐝', label: 'Swarm'      },
  { id: 'hwsettings', icon: '⚙',  label: 'Settings'   },
];

async function renderHermesWorkspace() {
  const content = document.getElementById('pageContent');

  // Load current profile
  HW.profile = loadActiveProfile();

  content.innerHTML = `
    <div class="hw-root">
      <!-- Left Panel Nav -->
      <nav class="hw-sidebar">
        <div class="hw-sidebar-header">
          <div class="hw-agent-badge">
            <span class="hw-agent-icon">⚡</span>
            <div>
              <div class="hw-agent-name">Hermes</div>
              <div class="hw-agent-model" id="hwAgentModel">${HW.profile?.model || 'owl-alpha'}</div>
            </div>
            <span class="agent-dot online hw-status-dot" id="hwStatusDot"></span>
          </div>
        </div>
        <div class="hw-nav">
          ${HW_PANELS.map(p => `
            <button class="hw-nav-item ${p.id === HW.activePanel ? 'active' : ''}"
                    onclick="hwSwitchPanel('${p.id}')" id="hwnav_${p.id}">
              <span class="hw-nav-icon">${p.icon}</span>
              <span class="hw-nav-label">${p.label}</span>
            </button>
          `).join('')}
        </div>
        <div class="hw-sidebar-footer">
          <div class="hw-profile-chip" onclick="openProfileSwitcher()" title="Switch profile">
            <span>👤</span>
            <span id="hwProfileName">${HW.profile?.name || 'Default'}</span>
            <span style="margin-left:auto;opacity:.5">▼</span>
          </div>
        </div>
      </nav>

      <!-- Main Panel Area -->
      <div class="hw-main" id="hwMain">
        <div class="loading"><div class="loading-spinner"></div><span>Loading Hermes workspace...</span></div>
      </div>
    </div>
  `;

  await hwSwitchPanel(HW.activePanel);
}

async function hwSwitchPanel(panelId) {
  HW.activePanel = panelId;
  // Update nav highlights
  document.querySelectorAll('.hw-nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`hwnav_${panelId}`);
  if (navEl) navEl.classList.add('active');

  const main = document.getElementById('hwMain');
  if (!main) return;
  main.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

  switch (panelId) {
    case 'chat':       await hwRenderChat(main); break;
    case 'memory':     await hwRenderMemory(main); break;
    case 'skills':     await hwRenderSkills(main); break;
    case 'files':      await hwRenderFiles(main); break;
    case 'terminal':   hwRenderTerminal(main); break;
    case 'inspector':  hwRenderInspector(main); break;
    case 'tasks':      await hwRenderTasks(main); break;
    case 'swarm':      hwRenderSwarm(main); break;
    case 'hwsettings': await hwRenderSettings(main); break;
    default:           main.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Panel not found</div></div>`;
  }
}

// ─── PANEL 1: CHAT ────────────────────────────────────────────────────────────

async function hwRenderChat(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div>
        <div class="hw-panel-title">💬 Hermes Chat</div>
        <div class="hw-panel-sub">Markdown · Syntax highlighting · Persistent history</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-sm" onclick="hwExportChat()">⬇ Export</button>
        <button class="btn btn-sm" onclick="hwClearChat()">🗑 Clear</button>
      </div>
    </div>
    <div class="hw-chat-wrap">
      <div class="hw-messages" id="hwMessages">
        <div class="hw-chat-welcome">
          <div style="font-size:40px">⚡</div>
          <div style="font-weight:700;font-size:18px;margin:8px 0">Hermes is ready</div>
          <div style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">
            Memory · Scheduling · Channels · Skills · Multi-agent coordination
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
            <button class="btn btn-sm" onclick="hwQuickPrompt('What did I work on recently?')">🧠 Recent work</button>
            <button class="btn btn-sm" onclick="hwQuickPrompt('Show me all scheduled tasks')">⏱ Scheduled tasks</button>
            <button class="btn btn-sm" onclick="hwQuickPrompt('Summarize my brain files')">📋 Brain summary</button>
            <button class="btn btn-sm" onclick="hwQuickPrompt('Run the heartbeat skill')">💓 Heartbeat</button>
          </div>
        </div>
      </div>
      <div class="hw-chat-input-area">
        <textarea id="hwChatInput" class="hw-chat-input" rows="1"
          placeholder="Message Hermes… (Enter to send, Shift+Enter for newline)"
          onkeydown="hwHandleChatKey(event)" oninput="hwAutoResize(this)"></textarea>
        <button class="btn btn-primary hw-send-btn" onclick="hwSendMessage()" id="hwSendBtn">➤</button>
      </div>
    </div>
  `;

  // Load persisted history for this profile
  HW.chatHistory = loadProfileChatHistory();
  hwRenderChatHistory();
}

function hwHandleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); hwSendMessage(); }
  hwAutoResize(e.target);
}

function hwAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

async function hwSendMessage() {
  const input = document.getElementById('hwChatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';

  hwAppendMessage('user', msg);
  const typingId = hwShowTyping();

  // Log to inspector
  hwInspectorLog({ step: 'user_message', content: msg, ts: Date.now() });

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 200000);

  try {
    const t0 = Date.now();
    const r = await api.post('/api/chat', { agent: 'hermes', message: msg }, ctrl);
    clearTimeout(timeout);
    const elapsed = Date.now() - t0;
    hwRemoveTyping(typingId);

    const response = r.response?.content || r.content || r.response || 'No response';
    hwAppendMessage('assistant', response, elapsed, r.response?.tokens_used);

    // Store to profile history
    const entry = { role: 'user', content: msg, ts: Date.now() };
    const res   = { role: 'assistant', content: response, ts: Date.now(), ms: elapsed };
    HW.chatHistory.push(entry, res);
    saveProfileChatHistory(HW.chatHistory);

    hwInspectorLog({
      step: 'hermes_response',
      content: response.slice(0, 200),
      elapsed_ms: elapsed,
      tokens: r.response?.tokens_used,
      ts: Date.now(),
    });
  } catch (err) {
    clearTimeout(timeout);
    hwRemoveTyping(typingId);
    const msg2 = err.name === 'AbortError' ? 'Request timed out (200s)' : err.message;
    hwAppendMessage('assistant', `⚠ ${msg2}`);
    hwInspectorLog({ step: 'error', content: msg2, ts: Date.now() });
  }
}

function hwAppendMessage(role, content, ms, tokens) {
  const container = document.getElementById('hwMessages');
  if (!container) return;
  container.querySelector('.hw-chat-welcome')?.remove();

  const div = document.createElement('div');
  div.className = `hw-msg hw-msg-${role}`;

  const meta = [];
  if (ms) meta.push(`${ms}ms`);
  if (tokens) meta.push(`${tokens} tokens`);

  div.innerHTML = `
    <div class="hw-msg-avatar">${role === 'user' ? '👤' : '⚡'}</div>
    <div class="hw-msg-body">
      <div class="hw-msg-header">
        <span class="hw-msg-from">${role === 'user' ? 'You' : 'Hermes'}</span>
        <span class="hw-msg-time">${new Date().toLocaleTimeString()}</span>
        ${meta.length ? `<span class="hw-msg-meta">${meta.join(' · ')}</span>` : ''}
      </div>
      <div class="hw-msg-content">${hwFormatContent(content)}</div>
      ${role === 'assistant' ? `<div class="hw-inspector-toggle" onclick="hwToggleInspectorDrawer(this)">
        🔬 Inspector <span class="hw-inspector-caret">▶</span>
      </div>
      <div class="hw-inspector-drawer" style="display:none">
        <div style="font-size:11px;color:var(--text-muted)">
          ${ms ? `⏱ ${ms}ms response time` : ''} ${tokens ? `· 🔢 ${tokens} tokens` : ''}
          <br>Agent: Hermes · Model: ${HW.profile?.model || 'owl-alpha'}
        </div>
      </div>` : ''}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hwToggleInspectorDrawer(btn) {
  const drawer = btn.nextElementSibling;
  const caret  = btn.querySelector('.hw-inspector-caret');
  if (!drawer) return;
  const open = drawer.style.display !== 'none';
  drawer.style.display = open ? 'none' : 'block';
  caret.textContent = open ? '▶' : '▼';
}

function hwFormatContent(text) {
  // Basic markdown: code blocks, bold, inline code
  return escapeHtml(text)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="hw-code-block"><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="hw-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function hwShowTyping() {
  const container = document.getElementById('hwMessages');
  const id = 'typing_' + Date.now();
  const div = document.createElement('div');
  div.className = 'hw-msg hw-msg-assistant';
  div.id = id;
  div.innerHTML = `<div class="hw-msg-avatar">⚡</div><div class="hw-msg-body"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  container?.appendChild(div);
  container && (container.scrollTop = container.scrollHeight);
  return id;
}

function hwRemoveTyping(id) {
  document.getElementById(id)?.remove();
}

function hwRenderChatHistory() {
  const container = document.getElementById('hwMessages');
  if (!container || !HW.chatHistory.length) return;
  container.querySelector('.hw-chat-welcome')?.remove();
  HW.chatHistory.slice(-40).forEach(m => {
    hwAppendMessage(m.role, m.content, m.ms, m.tokens);
  });
}

function hwClearChat() {
  HW.chatHistory = [];
  saveProfileChatHistory([]);
  const c = document.getElementById('hwMessages');
  if (c) c.innerHTML = `<div class="hw-chat-welcome" style="text-align:center;padding:60px 20px;color:var(--text-muted)">Chat cleared</div>`;
}

function hwExportChat() {
  const text = HW.chatHistory.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hermes-chat-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
}

function hwQuickPrompt(text) {
  const input = document.getElementById('hwChatInput');
  if (input) { input.value = text; hwSendMessage(); }
}

// ─── PANEL 2: MEMORY ─────────────────────────────────────────────────────────

async function hwRenderMemory(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">🧠 Memory Vault</div><div class="hw-panel-sub">Brain files · Full-text search · Inline editing</div></div>
      <div class="btn-group">
        <input id="hwMemSearch" class="form-input" style="width:220px" placeholder="Search memory…" oninput="hwSearchMemory(this.value)">
      </div>
    </div>
    <div id="hwMemContent" class="hw-memory-grid">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;
  await hwLoadMemoryFiles();
}

async function hwLoadMemoryFiles() {
  try {
    const data = await api.getBrain();
    window._hwBrainFiles = data;
    hwRenderMemoryGrid(data);
  } catch (err) {
    (document.getElementById('hwMemContent') || {}).innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function hwRenderMemoryGrid(files) {
  const el = document.getElementById('hwMemContent');
  if (!el) return;
  const fileNames = Object.keys(files || {});
  if (!fileNames.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧠</div><div class="empty-state-title">No brain files found</div></div>';
    return;
  }
  el.innerHTML = `<div class="grid grid-2">${fileNames.map(name => `
    <div class="card hw-memory-card" onclick="hwEditMemoryFile('${escapeHtml(name)}')">
      <div class="hw-memory-card-header">
        <span>📄</span>
        <span class="hw-memory-fname">${escapeHtml(name)}</span>
        <button class="btn btn-sm" style="margin-left:auto" onclick="event.stopPropagation();hwEditMemoryFile('${escapeHtml(name)}')">✏️ Edit</button>
      </div>
      <div class="hw-memory-preview">${escapeHtml((files[name] || '').slice(0, 180))}${(files[name]||'').length > 180 ? '…' : ''}</div>
    </div>
  `).join('')}</div>`;
}

async function hwEditMemoryFile(name) {
  try {
    const d = await api.getBrainFile(name);
    showModal(`Edit: ${name}`, `
      <textarea id="hwEditContent" class="form-textarea" rows="16" style="font-family:var(--font-mono);font-size:12px">${escapeHtml(d.content || '')}</textarea>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="hwSaveMemoryFile('${escapeHtml(name)}')">💾 Save</button>
    `);
  } catch (err) {
    showToast('Failed to load file: ' + err.message, 'error');
  }
}

async function hwSaveMemoryFile(name) {
  const content = document.getElementById('hwEditContent')?.value || '';
  try {
    await api.updateBrainFile(name, content);
    closeModal();
    showToast(`${name} saved`, 'success');
    await hwLoadMemoryFiles();
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

function hwSearchMemory(q) {
  if (!window._hwBrainFiles) return;
  if (!q.trim()) { hwRenderMemoryGrid(window._hwBrainFiles); return; }
  const ql = q.toLowerCase();
  const filtered = {};
  for (const [k, v] of Object.entries(window._hwBrainFiles)) {
    if (k.toLowerCase().includes(ql) || (v || '').toLowerCase().includes(ql)) {
      filtered[k] = v;
    }
  }
  hwRenderMemoryGrid(filtered);
}

// ─── PANEL 3: SKILLS ─────────────────────────────────────────────────────────

async function hwRenderSkills(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">⚡ Skills Registry</div><div class="hw-panel-sub">Toggle · Edit · Run · 2000+ skills</div></div>
      <div class="btn-group">
        <input id="hwSkillSearch" class="form-input" style="width:200px" placeholder="Search skills…" oninput="hwFilterSkills(this.value)">
        <select id="hwSkillCategory" class="form-select" style="width:150px" onchange="hwFilterSkills(document.getElementById('hwSkillSearch').value)">
          <option value="">All categories</option>
        </select>
      </div>
    </div>
    <div id="hwSkillsGrid" class="hw-skills-grid">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;
  await hwLoadSkills();
}

async function hwLoadSkills() {
  try {
    const skills = await api.getSkills();
    window._hwSkills = skills;
    // Populate category filter
    const cats = [...new Set(skills.map(s => s.category || 'general').filter(Boolean))].sort();
    const sel = document.getElementById('hwSkillCategory');
    if (sel) cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    hwRenderSkillsGrid(skills);
  } catch (err) {
    (document.getElementById('hwSkillsGrid') || {}).innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function hwRenderSkillsGrid(skills) {
  const el = document.getElementById('hwSkillsGrid');
  if (!el) return;
  if (!skills.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-title">No skills found</div></div>';
    return;
  }
  el.innerHTML = `<div class="grid grid-3">${skills.map(s => `
    <div class="card hw-skill-card">
      <div class="hw-skill-card-header">
        <span class="hw-skill-name">${escapeHtml(s.name.replace(/-/g, ' '))}</span>
        <label class="switch hw-skill-toggle">
          <input type="checkbox" checked onchange="hwToggleSkill('${escapeHtml(s.name)}', this.checked)">
          <span class="switch-slider"></span>
        </label>
      </div>
      <div class="hw-skill-desc">${escapeHtml((s.description || '').slice(0, 100))}${(s.description||'').length > 100 ? '…' : ''}</div>
      <div class="hw-skill-card-footer">
        <span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:10px">${escapeHtml(s.category || 'general')}</span>
        ${s.scores?.length ? `<span class="badge badge-success" style="font-size:10px">Score</span>` : ''}
        <div class="btn-group" style="margin-left:auto">
          <button class="btn btn-sm" onclick="hwEditSkill('${escapeHtml(s.name)}')">✏️</button>
          <button class="btn btn-sm btn-primary" onclick="hwRunSkill('${escapeHtml(s.name)}')">▶</button>
        </div>
      </div>
    </div>
  `).join('')}</div>`;
}

function hwFilterSkills(q) {
  const skills = window._hwSkills || [];
  const ql = (q || '').toLowerCase();
  const cat = document.getElementById('hwSkillCategory')?.value || '';
  const filtered = skills.filter(s =>
    (s.name.toLowerCase().includes(ql) || (s.description || '').toLowerCase().includes(ql)) &&
    (!cat || (s.category || 'general') === cat)
  );
  hwRenderSkillsGrid(filtered);
}

function hwToggleSkill(name, enabled) {
  showToast(`${name} ${enabled ? 'enabled' : 'disabled'}`, 'info');
}

async function hwEditSkill(name) {
  try {
    const data = await api.getSkill(name);
    showModal(`Edit Skill: ${name}`, `
      <div class="form-group">
        <label class="form-label">Skill Prompt (SKILL.md)</label>
        <textarea id="hwSkillPrompt" class="form-textarea" rows="12" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(data.skill || '')}</textarea>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="showToast('Skill editing coming soon','info');closeModal()">Save</button>
    `);
  } catch (err) { showToast('Failed to load skill: ' + err.message, 'error'); }
}

async function hwRunSkill(name) {
  showModal(`Run Skill: ${name}`, `
    <div class="form-group">
      <label class="form-label">Input (optional)</label>
      <textarea id="hwRunInput" class="form-textarea" rows="3" placeholder="Enter input for this skill…"></textarea>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="hwConfirmRunSkill('${escapeHtml(name)}')">▶ Run</button>
  `);
}

async function hwConfirmRunSkill(name) {
  const input = document.getElementById('hwRunInput')?.value || '';
  closeModal();
  try {
    const r = await api.runSkill(name, input, 'hermes');
    showToast(`${name} dispatched to Hermes #${r.run_id}`, 'success');
    hwInspectorLog({ step: 'skill_run', skill: name, agent: 'hermes', run_id: r.run_id, ts: Date.now() });
  } catch (err) { showToast('Skill run failed: ' + err.message, 'error'); }
}

// ─── PANEL 4: FILES ──────────────────────────────────────────────────────────

async function hwRenderFiles(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">📁 Context Files</div><div class="hw-panel-sub">Files in Hermes context · Include / Exclude toggles</div></div>
    </div>
    <div id="hwFilesContent">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;

  // Show key agent files with include/exclude toggles
  const contextFiles = [
    { path: 'agents/hermes/SOUL.md',   label: 'SOUL.md',      always: true  },
    { path: 'agents/hermes/MEMORY.md', label: 'MEMORY.md',    always: true  },
    { path: 'agents/hermes/USER.md',   label: 'USER.md',      always: true  },
    { path: 'brain/business-brain.md', label: 'business-brain.md', always: true },
    { path: 'brain/memory.md',         label: 'memory.md',    always: true  },
    { path: 'brain/constitution.md',   label: 'constitution.md', always: false },
    { path: 'brain/active-projects.md',label: 'active-projects.md', always: false },
    { path: 'AGENTS.md',               label: 'AGENTS.md',    always: false },
  ];

  const excluded = JSON.parse(localStorage.getItem('hw_excluded_files') || '[]');

  (document.getElementById('hwFilesContent') || {}).innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Hermes Context Files</span></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>File</th><th>Path</th><th>Include</th><th>Actions</th></tr></thead>
          <tbody>
            ${contextFiles.map(f => {
              const inc = !excluded.includes(f.path);
              return `<tr>
                <td><strong style="font-size:12px">${f.label}</strong></td>
                <td><code style="font-size:10px;color:var(--text-muted)">${f.path}</code></td>
                <td>
                  <label class="switch" style="transform:scale(.85)">
                    <input type="checkbox" ${inc ? 'checked' : ''} ${f.always ? 'disabled' : ''}
                      onchange="hwToggleFileContext('${f.path}', this.checked)">
                    <span class="switch-slider"></span>
                  </label>
                </td>
                <td><button class="btn btn-sm" onclick="hwPreviewFile('${f.path}')">👁 View</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">Add Custom File to Context</span>
      </div>
      <div style="padding:16px;display:flex;gap:8px">
        <input id="hwCustomFilePath" class="form-input" placeholder="Relative path, e.g. data/settings.json" style="flex:1">
        <button class="btn btn-primary" onclick="hwAddContextFile()">+ Add</button>
      </div>
    </div>
  `;
}

function hwToggleFileContext(path, include) {
  let excluded = JSON.parse(localStorage.getItem('hw_excluded_files') || '[]');
  if (!include) { if (!excluded.includes(path)) excluded.push(path); }
  else { excluded = excluded.filter(p => p !== path); }
  localStorage.setItem('hw_excluded_files', JSON.stringify(excluded));
  showToast(`${path.split('/').pop()} ${include ? 'included' : 'excluded'} from context`, 'info');
}

async function hwPreviewFile(path) {
  try {
    const parts = path.split('/');
    const fileName = parts.pop();
    const d = await api.getBrainFile(fileName);
    showModal(`Preview: ${fileName}`, `
      <pre style="font-size:11px;max-height:400px;overflow-y:auto;white-space:pre-wrap">${escapeHtml(d.content || 'Empty file')}</pre>
    `, `<button class="btn btn-primary" onclick="closeModal()">Close</button>`);
  } catch {
    showToast('Preview not available for this file', 'info');
  }
}

function hwAddContextFile() {
  const path = document.getElementById('hwCustomFilePath')?.value?.trim();
  if (!path) { showToast('Enter a file path', 'warning'); return; }
  showToast(`${path} added to context tracking`, 'success');
  document.getElementById('hwCustomFilePath').value = '';
}

// ─── PANEL 5: TERMINAL ───────────────────────────────────────────────────────

function hwRenderTerminal(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">⌨ Embedded Terminal</div><div class="hw-panel-sub">Send commands through Hermes · Output shown inline</div></div>
      <button class="btn btn-sm" onclick="hwClearTerminal()">🗑 Clear</button>
    </div>
    <div class="hw-terminal" id="hwTerminal">
      <div class="hw-term-line hw-term-system">Hermes terminal ready. Commands are sent as prompts to the Hermes agent.</div>
      <div class="hw-term-line hw-term-system">Type a command and press Enter.</div>
    </div>
    <div class="hw-term-input-row">
      <span class="hw-term-prompt">hermes $</span>
      <input id="hwTermInput" class="hw-term-input" placeholder="ls brain/ | run heartbeat | check status…" onkeydown="hwTermKey(event)">
    </div>
  `;
  document.getElementById('hwTermInput')?.focus();
}

async function hwTermKey(e) {
  if (e.key !== 'Enter') return;
  const input = e.target;
  const cmd = input.value.trim();
  if (!cmd) return;
  input.value = '';

  hwTermAppend('user', `$ ${cmd}`);
  hwTermAppend('system', '⏳ Executing…');

  try {
    const r = await api.post('/api/chat', { agent: 'hermes', message: `Execute this command or task: ${cmd}` });
    const out = r.response?.content || r.content || r.response || 'No output';
    hwTermAppend('output', out);
    hwInspectorLog({ step: 'terminal_cmd', cmd, output: out.slice(0, 200), ts: Date.now() });
  } catch (err) {
    hwTermAppend('error', `Error: ${err.message}`);
  }
}

function hwTermAppend(type, text) {
  const term = document.getElementById('hwTerminal');
  if (!term) return;
  const div = document.createElement('div');
  div.className = `hw-term-line hw-term-${type}`;
  div.textContent = text;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

function hwClearTerminal() {
  const term = document.getElementById('hwTerminal');
  if (term) term.innerHTML = '<div class="hw-term-line hw-term-system">Terminal cleared.</div>';
}

// ─── PANEL 6: INSPECTOR ──────────────────────────────────────────────────────

function hwRenderInspector(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">🔬 Live Inspector</div><div class="hw-panel-sub">Every step · every tool call · timing · token count</div></div>
      <button class="btn btn-sm" onclick="hwClearInspector()">🗑 Clear</button>
    </div>
    <div id="hwInspectorLog" class="hw-inspector-log">
      ${HW.inspectorLog.length ? '' : '<div class="hw-term-line hw-term-system" style="margin:20px">No activity yet. Send a message in Chat or run a Skill to see inspector output.</div>'}
    </div>
  `;
  hwRenderInspectorEntries();
}

function hwInspectorLog(entry) {
  HW.inspectorLog.push(entry);
  // Live update if inspector panel is active
  if (HW.activePanel === 'inspector') hwRenderInspectorEntries();
}

function hwRenderInspectorEntries() {
  const el = document.getElementById('hwInspectorLog');
  if (!el) return;
  if (!HW.inspectorLog.length) {
    el.innerHTML = '<div class="hw-term-line hw-term-system" style="margin:20px">No activity yet.</div>';
    return;
  }
  el.innerHTML = HW.inspectorLog.slice(-100).reverse().map(e => `
    <div class="hw-inspector-entry">
      <div class="hw-inspector-step">
        <span class="hw-inspector-step-type">${escapeHtml(e.step || 'event')}</span>
        <span class="hw-inspector-ts">${new Date(e.ts || Date.now()).toLocaleTimeString()}</span>
        ${e.elapsed_ms ? `<span class="hw-inspector-timing">${e.elapsed_ms}ms</span>` : ''}
        ${e.tokens ? `<span class="hw-inspector-tokens">${e.tokens} tokens</span>` : ''}
      </div>
      ${e.content ? `<div class="hw-inspector-content">${escapeHtml(e.content.slice(0, 300))}</div>` : ''}
      ${e.skill ? `<div class="hw-inspector-content">Skill: ${escapeHtml(e.skill)} · Agent: ${escapeHtml(e.agent || 'hermes')} · #${escapeHtml(e.run_id || '')}</div>` : ''}
      ${e.cmd ? `<div class="hw-inspector-content">$ ${escapeHtml(e.cmd)}</div>` : ''}
    </div>
  `).join('');
}

function hwClearInspector() {
  HW.inspectorLog = [];
  hwRenderInspectorEntries();
}

// ─── PANEL 7: TASKS (Kanban) ─────────────────────────────────────────────────

async function hwRenderTasks(container) {
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">📌 Task Board</div><div class="hw-panel-sub">Hermes task queue · Drag-and-drop Kanban</div></div>
      <div class="btn-group">
        <button class="btn btn-sm btn-primary" onclick="hwCreateTask()">+ New Task</button>
        <button class="btn btn-sm" onclick="hwRenderTasks(document.getElementById('hwMain'))">🔄 Refresh</button>
      </div>
    </div>
    <div id="hwTasksBoard" class="hw-kanban">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;
  await hwLoadTasks();
}

async function hwLoadTasks() {
  try {
    const data = await api.getKanbanBoard();
    const cols = data.columns || {};
    const COLS = [
      { id: 'triage',      label: '📥 Triage',      color: 'var(--text-muted)' },
      { id: 'todo',        label: '📋 To Do',        color: 'var(--blue)' },
      { id: 'in_progress', label: '⚙ In Progress',  color: 'var(--accent)' },
      { id: 'blocked',     label: '🚫 Blocked',      color: 'var(--red)' },
      { id: 'done',        label: '✅ Done',          color: 'var(--green)' },
    ];
    (document.getElementById('hwTasksBoard') || {}).innerHTML = `
      <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
        ${COLS.map(col => {
          const tasks = (cols[col.id] || []).filter(t => !t.assignee || t.assignee.toLowerCase().includes('hermes') || col.id === 'triage');
          return `
          <div class="hw-kanban-col" ondragover="event.preventDefault()" ondrop="hwDropTask(event,'${col.id}')">
            <div class="hw-kanban-col-header" style="color:${col.color}">
              ${col.label} <span class="badge" style="margin-left:4px">${tasks.length}</span>
            </div>
            ${tasks.map(t => `
              <div class="hw-kanban-card" draggable="true" ondragstart="hwDragTask(event,'${t.id}')">
                <div class="hw-kanban-card-title">${escapeHtml(t.title || '')}</div>
                ${t.priority ? `<span class="badge" style="font-size:9px;background:${t.priority==='high'?'var(--red-dim)':t.priority==='medium'?'var(--yellow-dim)':'var(--bg-card)'}">${t.priority}</span>` : ''}
                ${t.block_reason ? `<div style="font-size:10px;color:var(--red);margin-top:4px">🚫 ${escapeHtml(t.block_reason)}</div>` : ''}
                <div style="display:flex;gap:4px;margin-top:6px">
                  <button class="btn btn-sm" style="padding:2px 6px;font-size:9px" onclick="hwCompleteTask('${t.id}')">✓</button>
                  <button class="btn btn-sm" style="padding:2px 6px;font-size:9px" onclick="hwBlockTask('${t.id}')">🚫</button>
                </div>
              </div>
            `).join('')}
          </div>`;
        }).join('')}
      </div>
    `;
  } catch (err) {
    (document.getElementById('hwTasksBoard') || {}).innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function hwDragTask(e, id) { e.dataTransfer.setData('taskId', id); }

async function hwDropTask(e, status) {
  const id = e.dataTransfer.getData('taskId');
  if (!id) return;
  try {
    await api.updateKanbanTask(id, { status });
    await hwLoadTasks();
    showToast(`Task moved to ${status}`, 'success');
  } catch (err) { showToast('Move failed: ' + err.message, 'error'); }
}

function hwCreateTask() {
  showModal('New Hermes Task', `
    <div class="form-group"><label class="form-label">Title</label>
      <input id="hwTaskTitle" class="form-input" placeholder="Task title…">
    </div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="hwTaskBody" class="form-textarea" rows="3" placeholder="Details…"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Priority</label>
        <select id="hwTaskPri" class="form-select">
          <option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="hwConfirmCreateTask()">Create</button>
  `);
}

async function hwConfirmCreateTask() {
  const title = document.getElementById('hwTaskTitle')?.value?.trim();
  if (!title) { showToast('Title required', 'warning'); return; }
  try {
    await api.createKanbanTask({
      title, body: document.getElementById('hwTaskBody')?.value || '',
      priority: document.getElementById('hwTaskPri')?.value || 'medium',
      status: 'triage', assignee: 'hermes',
    });
    closeModal();
    showToast('Task created', 'success');
    await hwLoadTasks();
  } catch (err) { showToast('Create failed: ' + err.message, 'error'); }
}

async function hwCompleteTask(id) {
  try {
    await api.completeKanbanTask(id, 'Completed via Hermes Workspace');
    await hwLoadTasks();
    showToast('Task marked complete', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

function hwBlockTask(id) {
  showModal('Block Task', `
    <div class="form-group"><label class="form-label">Reason</label>
      <input id="hwBlockReason" class="form-input" placeholder="Why is this blocked?">
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" onclick="hwConfirmBlock('${id}')">Block</button>
  `);
}

async function hwConfirmBlock(id) {
  const reason = document.getElementById('hwBlockReason')?.value?.trim() || 'Blocked';
  try {
    await api.blockKanbanTask(id, reason);
    closeModal();
    await hwLoadTasks();
    showToast('Task blocked', 'warning');
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── PANEL 8: SWARM ──────────────────────────────────────────────────────────

function hwRenderSwarm(container) {
  const ROLES = ['Researcher', 'Writer', 'Fact-checker', 'Editor', 'Publisher'];
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">🐝 Multi-Agent Swarm</div><div class="hw-panel-sub">Spin up 2–8 sub-agents · Autonomous task passing · Results feed Kanban</div></div>
      <span class="badge ${HW.swarmRunning ? 'badge-success' : ''}" id="hwSwarmStatus">${HW.swarmRunning ? '🟢 Running' : '⚫ Idle'}</span>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Swarm Configuration</span></div>
      <div style="padding:16px">
        <div class="form-group">
          <label class="form-label">Topic / Task</label>
          <textarea id="hwSwarmTopic" class="form-textarea" rows="2" placeholder="e.g. Research and summarize the top 5 agentic OS platforms in 2026"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Active Roles</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${ROLES.map(r => `
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                <input type="checkbox" checked class="hw-swarm-role" value="${r}"> ${r}
              </label>
            `).join('')}
          </div>
        </div>
        <button class="btn btn-primary" onclick="hwLaunchSwarm()" id="hwSwarmBtn">🐝 Launch Swarm</button>
        <button class="btn btn-danger" onclick="hwCancelSwarm()" id="hwSwarmCancelBtn" style="display:none">✕ Cancel</button>
      </div>
    </div>
    <div id="hwSwarmActivity" class="hw-swarm-log">
      <div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px">Swarm activity will appear here after launch</div>
    </div>
  `;
}

async function hwLaunchSwarm() {
  const topic = document.getElementById('hwSwarmTopic')?.value?.trim();
  if (!topic) { showToast('Enter a topic for the swarm', 'warning'); return; }

  const roles = [...document.querySelectorAll('.hw-swarm-role:checked')].map(cb => cb.value);
  if (roles.length < 2) { showToast('Select at least 2 roles', 'warning'); return; }

  HW.swarmRunning = true;
  HW.swarmAgents = roles;
  HW.swarmAbortController = new AbortController();
  document.getElementById('hwSwarmStatus').textContent = '🟢 Running';
  document.getElementById('hwSwarmStatus').classList.add('badge-success');
  document.getElementById('hwSwarmBtn').disabled = true;
  document.getElementById('hwSwarmBtn').textContent = '⏳ Running…';
  let cancelBtn = document.getElementById('hwSwarmCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  const log = document.getElementById('hwSwarmActivity');
  log.innerHTML = '';

  // Sequential swarm execution: each role passes to the next
  let context = `Topic: ${topic}`;
  for (let i = 0; i < roles.length; i++) {
    if (!HW.swarmRunning) break; // navigation cancelled swarm

    const role = roles[i];
    swarmLog(log, role, `Starting task as ${role}…`, 'active');
    hwInspectorLog({ step: 'swarm_agent_start', role, topic: topic.slice(0, 60), ts: Date.now() });

    try {
      const prompt = `You are the ${role} in a multi-agent swarm. Your job:
${getSwarmRolePrompt(role)}

Current context:
${context}

Complete your role's task and pass a clear summary to the next agent.`;

      const r = await api.post('/api/chat', { agent: 'hermes', message: prompt }, HW.swarmAbortController);
      const output = r.response?.content || r.content || r.response || 'No output';
      context += `\n\n[${role}]: ${output}`;

      swarmLog(log, role, output.slice(0, 400) + (output.length > 400 ? '…' : ''), 'done');
      hwInspectorLog({ step: 'swarm_agent_done', role, output: output.slice(0, 100), ts: Date.now() });
    } catch (err) {
      swarmLog(log, role, `Error: ${err.message}`, 'error');
    }
  }

  // Create Kanban task with final result
  try {
    await api.createKanbanTask({
      title: `Swarm result: ${topic.slice(0, 60)}`,
      body: context.slice(0, 2000),
      status: 'done', priority: 'medium', assignee: 'hermes',
    });
    swarmLog(log, 'System', '✅ Results saved to Kanban board', 'system');
  } catch {}

  HW.swarmRunning = false;
  HW.swarmAbortController = null;
  const btn = document.getElementById('hwSwarmBtn');
  if (btn) { btn.disabled = false; btn.textContent = '🐝 Launch Swarm'; }
  cancelBtn = document.getElementById('hwSwarmCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const status = document.getElementById('hwSwarmStatus');
  if (status) { status.textContent = '✅ Completed'; status.classList.remove('badge-success'); }
}

function hwCancelSwarm() {
  if (HW.swarmAbortController) {
    HW.swarmAbortController.abort();
    HW.swarmAbortController = null;
  }
  HW.swarmRunning = false;
  const btn = document.getElementById('hwSwarmBtn');
  if (btn) { btn.disabled = false; btn.textContent = '🐝 Launch Swarm'; }
  cancelBtn = document.getElementById('hwSwarmCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const status = document.getElementById('hwSwarmStatus');
  if (status) { status.textContent = '⚫ Cancelled'; status.classList.remove('badge-success'); }
  const log = document.getElementById('hwSwarmActivity');
  if (log) swarmLog(log, 'System', '🛑 Swarm cancelled by user', 'error');
}

function getSwarmRolePrompt(role) {
  const prompts = {
    'Researcher':   'Gather and organize key facts, sources, and data points.',
    'Writer':       'Transform the research into clear, well-structured prose.',
    'Fact-checker': 'Verify claims, flag unsupported statements, and ensure accuracy.',
    'Editor':       'Improve clarity, fix grammar, tighten prose, maintain consistency.',
    'Publisher':    'Create the final polished output with structure: title, summary, body, conclusion.',
  };
  return prompts[role] || 'Complete your assigned task.';
}

function swarmLog(container, role, text, state) {
  const colors = { active: 'var(--accent)', done: 'var(--green)', error: 'var(--red)', system: 'var(--text-muted)' };
  const div = document.createElement('div');
  div.className = 'hw-swarm-entry';
  div.innerHTML = `
    <div class="hw-swarm-role-badge" style="color:${colors[state] || 'var(--text-primary)'}">
      ${state === 'active' ? '⏳' : state === 'done' ? '✅' : state === 'error' ? '❌' : '💬'} ${escapeHtml(role)}
    </div>
    <div class="hw-swarm-output">${escapeHtml(text)}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ─── PANEL 9: SETTINGS (per-profile) ─────────────────────────────────────────

async function hwRenderSettings(container) {
  const p = HW.profile || {};
  container.innerHTML = `
    <div class="hw-panel-header">
      <div><div class="hw-panel-title">⚙ Hermes Profile Settings</div><div class="hw-panel-sub">Model · System prompt · Context budget · Skill loadout</div></div>
      <button class="btn btn-primary" onclick="hwSaveSettings()">💾 Save</button>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Profile</span></div>
        <div style="padding:16px">
          <div class="form-group">
            <label class="form-label">Profile Name</label>
            <input id="hwSetName" class="form-input" value="${escapeHtml(p.name || 'Default')}">
          </div>
          <div class="form-group">
            <label class="form-label">Model</label>
            <select id="hwSetModel" class="form-select">
              ${['openrouter/owl-alpha','anthropic/claude-3.5-sonnet','google/gemini-2.5-flash','openrouter/auto'].map(m =>
                `<option value="${m}" ${p.model===m?'selected':''}>${m}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Context Budget (max tokens)</label>
            <input id="hwSetBudget" class="form-input" type="number" value="${p.context_budget || 32000}" step="1000">
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">System Prompt</span></div>
        <div style="padding:16px">
          <textarea id="hwSetSysPrompt" class="form-textarea" rows="8" style="font-family:var(--font-mono);font-size:11px"
            placeholder="Custom system prompt for this profile…">${escapeHtml(p.system_prompt || '')}</textarea>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">All Profiles</span></div>
      <div id="hwProfileList" style="padding:16px">
        ${renderProfileList()}
      </div>
      <div style="padding:0 16px 16px">
        <button class="btn btn-primary" onclick="hwCreateProfile()">+ New Profile</button>
      </div>
    </div>
  `;
}

function hwSaveSettings() {
  const p = {
    name:           document.getElementById('hwSetName')?.value?.trim() || 'Default',
    model:          document.getElementById('hwSetModel')?.value || 'openrouter/owl-alpha',
    context_budget: parseInt(document.getElementById('hwSetBudget')?.value) || 32000,
    system_prompt:  document.getElementById('hwSetSysPrompt')?.value || '',
  };
  saveActiveProfile(p);
  HW.profile = p;
  document.getElementById('hwProfileName').textContent = p.name;
  document.getElementById('hwAgentModel').textContent  = p.model.split('/').pop();
  showToast('Profile saved', 'success');
}

function renderProfileList() {
  const profiles = getAllProfiles();
  const active   = loadActiveProfile()?.name;
  if (!profiles.length) return '<div style="color:var(--text-muted);font-size:13px">No profiles saved yet</div>';
  return profiles.map(p => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border)">
      <span class="agent-dot ${p.name===active?'online':'offline'}" style="width:8px;height:8px"></span>
      <span style="font-size:13px;flex:1">${escapeHtml(p.name)}</span>
      <span style="font-size:11px;color:var(--text-muted)">${escapeHtml(p.model?.split('/')?.pop() || '')}</span>
      <button class="btn btn-sm" onclick="hwLoadProfile('${escapeHtml(p.name)}')">Load</button>
      ${p.name !== 'Default' ? `<button class="btn btn-sm btn-danger" onclick="hwDeleteProfile('${escapeHtml(p.name)}')">✕</button>` : ''}
    </div>
  `).join('');
}

function hwCreateProfile() {
  showModal('New Profile', `
    <div class="form-group"><label class="form-label">Profile Name</label>
      <input id="hwNewProfileName" class="form-input" placeholder="e.g. SEO Research">
    </div>
    <div class="form-group"><label class="form-label">Based on preset</label>
      <select id="hwNewProfilePreset" class="form-select">
        <option value="seo">SEO Research</option>
        <option value="content">Content Writing</option>
        <option value="code">Code Review</option>
        <option value="admin">Personal Admin</option>
        <option value="swarm">Multi-Agent Swarm</option>
        <option value="blank">Blank</option>
      </select>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="hwConfirmCreateProfile()">Create</button>
  `);
}

const HW_PRESETS = {
  seo:     { model: 'google/gemini-2.5-flash', system_prompt: 'You are an SEO research specialist. Focus on keyword research, content strategy, and competitive analysis.', context_budget: 32000 },
  content: { model: 'openrouter/owl-alpha',    system_prompt: 'You are a content writing assistant. Focus on drafting, editing, and publishing high-quality content.', context_budget: 64000 },
  code:    { model: 'anthropic/claude-3.5-sonnet', system_prompt: 'You are a code review specialist. Focus on code quality, security, and best practices.', context_budget: 32000 },
  admin:   { model: 'openrouter/owl-alpha',    system_prompt: 'You are a personal admin assistant. Help with scheduling, tasks, emails, and organization.', context_budget: 16000 },
  swarm:   { model: 'openrouter/auto',         system_prompt: 'You are orchestrating a multi-agent swarm. Coordinate agents and synthesize results.', context_budget: 128000 },
  blank:   { model: 'openrouter/owl-alpha',    system_prompt: '', context_budget: 32000 },
};

function hwConfirmCreateProfile() {
  const name   = document.getElementById('hwNewProfileName')?.value?.trim();
  const preset = document.getElementById('hwNewProfilePreset')?.value || 'blank';
  if (!name) { showToast('Profile name required', 'warning'); return; }
  const prof = { name, ...HW_PRESETS[preset] };
  const all = getAllProfiles();
  all.push(prof);
  localStorage.setItem('hw_profiles', JSON.stringify(all));
  closeModal();
  hwLoadProfile(name);
  showToast(`Profile "${name}" created`, 'success');
}

function hwLoadProfile(name) {
  const all = getAllProfiles();
  const p   = all.find(x => x.name === name);
  if (!p) return;
  saveActiveProfile(p);
  HW.profile = p;
  document.getElementById('hwProfileName').textContent = p.name;
  document.getElementById('hwAgentModel').textContent  = (p.model || '').split('/').pop();
  showToast(`Switched to profile "${name}"`, 'success');
  hwRenderSettings(document.getElementById('hwMain'));
}

function hwDeleteProfile(name) {
  let all = getAllProfiles().filter(p => p.name !== name);
  localStorage.setItem('hw_profiles', JSON.stringify(all));
  showToast(`Profile "${name}" deleted`, 'info');
  hwRenderSettings(document.getElementById('hwMain'));
}

// ─── Profile Storage Helpers ──────────────────────────────────────────────────

function getAllProfiles() {
  try { return JSON.parse(localStorage.getItem('hw_profiles') || '[]'); }
  catch { return []; }
}

function loadActiveProfile() {
  try {
    const all = getAllProfiles();
    const active = localStorage.getItem('hw_active_profile') || 'Default';
    return all.find(p => p.name === active) || {
      name: 'Default', model: 'openrouter/owl-alpha',
      context_budget: 32000, system_prompt: '',
    };
  } catch {
    return { name: 'Default', model: 'openrouter/owl-alpha', context_budget: 32000, system_prompt: '' };
  }
}

function saveActiveProfile(profile) {
  const all = getAllProfiles();
  const idx = all.findIndex(p => p.name === profile.name);
  if (idx >= 0) all[idx] = profile; else all.push(profile);
  localStorage.setItem('hw_profiles', JSON.stringify(all));
  localStorage.setItem('hw_active_profile', profile.name);
}

function loadProfileChatHistory() {
  try {
    const key = `hw_chat_${HW.profile?.name || 'Default'}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function saveProfileChatHistory(history) {
  const key = `hw_chat_${HW.profile?.name || 'Default'}`;
  localStorage.setItem(key, JSON.stringify(history.slice(-200)));
}

// ─── Global Profile Switcher (triggered from topbar) ─────────────────────────

function openProfileSwitcher() {
  const profiles = getAllProfiles();
  const active   = loadActiveProfile()?.name;

  // Seed default profiles if empty
  if (!profiles.length) {
    const defaults = ['Default','SEO Research','Content Writing','Code Review','Personal Admin','Multi-Agent Swarm'];
    defaults.forEach((name, i) => {
      const presetKey = ['blank','seo','content','code','admin','swarm'][i];
      profiles.push({ name, ...HW_PRESETS[presetKey] });
    });
    localStorage.setItem('hw_profiles', JSON.stringify(profiles));
  }

  showModal('Switch Profile', `
    <div style="display:flex;flex-direction:column;gap:6px">
      ${profiles.map(p => `
        <button class="btn ${p.name===active?'btn-primary':''}" style="text-align:left;padding:10px 14px"
                onclick="hwLoadProfileAndClose('${escapeHtml(p.name)}')">
          <span>${escapeHtml(p.name)}</span>
          <span style="float:right;font-size:11px;opacity:.6">${escapeHtml((p.model||'').split('/').pop())}</span>
        </button>
      `).join('')}
    </div>
    <div style="margin-top:12px">
      <button class="btn btn-ghost" style="width:100%" onclick="closeModal();hwCreateProfile()">+ New Profile</button>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function hwLoadProfileAndClose(name) {
  closeModal();
  hwLoadProfile(name);
}

// ─── Expose globals ───────────────────────────────────────────────────────────
window.renderHermesWorkspace = renderHermesWorkspace;
window.hwSwitchPanel         = hwSwitchPanel;
window.hwSendMessage         = hwSendMessage;
window.hwHandleChatKey       = hwHandleChatKey;
window.hwAutoResize          = hwAutoResize;
window.hwClearChat           = hwClearChat;
window.hwExportChat          = hwExportChat;
window.hwQuickPrompt         = hwQuickPrompt;
window.hwSearchMemory        = hwSearchMemory;
window.hwEditMemoryFile      = hwEditMemoryFile;
window.hwSaveMemoryFile      = hwSaveMemoryFile;
window.hwFilterSkills        = hwFilterSkills;
window.hwToggleSkill         = hwToggleSkill;
window.hwEditSkill           = hwEditSkill;
window.hwRunSkill            = hwRunSkill;
window.hwConfirmRunSkill     = hwConfirmRunSkill;
window.hwToggleFileContext   = hwToggleFileContext;
window.hwPreviewFile         = hwPreviewFile;
window.hwAddContextFile      = hwAddContextFile;
window.hwTermKey             = hwTermKey;
window.hwClearTerminal       = hwClearTerminal;
window.hwToggleInspectorDrawer = hwToggleInspectorDrawer;
window.hwClearInspector      = hwClearInspector;
window.hwCreateTask          = hwCreateTask;
window.hwConfirmCreateTask   = hwConfirmCreateTask;
window.hwCompleteTask        = hwCompleteTask;
window.hwBlockTask           = hwBlockTask;
window.hwConfirmBlock        = hwConfirmBlock;
window.hwDropTask            = hwDropTask;
window.hwDragTask            = hwDragTask;
window.hwLaunchSwarm         = hwLaunchSwarm;
window.hwCancelSwarm         = hwCancelSwarm;
window.hwSaveSettings        = hwSaveSettings;
window.hwCreateProfile       = hwCreateProfile;
window.hwConfirmCreateProfile= hwConfirmCreateProfile;
window.hwLoadProfile         = hwLoadProfile;
window.hwDeleteProfile       = hwDeleteProfile;
window.hwLoadProfileAndClose = hwLoadProfileAndClose;
window.openProfileSwitcher   = openProfileSwitcher;
