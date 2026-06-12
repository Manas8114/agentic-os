// Agent Control Rooms — Per-agent configuration UI
const agentConfigState = {
  agents: {},
  activeTab: 'opencode',
  apiKeys: {},
};

const agentMetaConfig = {
  opencode: { icon: '🔧', name: 'opencode', desc: 'Code & DevOps', color: 'blue', configFile: 'agents/opencode/opencode.json' },
  hermes: { icon: '⚡', name: 'Hermes', desc: 'Memory & Scheduling', color: 'purple', configFile: 'agents/hermes/hermes.json' },
  gemini: { icon: '🧠', name: 'Gemini CLI', desc: 'Research & Analysis', color: 'green', configFile: 'agents/gemini/gemini-extension.json' },
  claude: { icon: '🤖', name: 'Claude', desc: 'Strategy & Architecture', color: 'orange', configFile: 'agents/claude/claude.json' },
  codex: { icon: '🐙', name: 'Codex', desc: 'Code & CI/CD', color: 'teal', configFile: 'agents/codex/codex.json' },
  antigravity: { icon: '🔭', name: 'Antigravity', desc: 'Research & Discovery', color: 'indigo', configFile: 'agents/antigravity/antigravity.json' },
  openclaw: { icon: '🕸', name: 'OpenClaw', desc: 'Routing & Orchestration', color: 'violet', configFile: 'agents/openclaw/openclaw.json' },
  odysseus: { icon: '🧭', name: 'Odysseus', desc: 'Planning & Execution', color: 'amber', configFile: 'agents/odysseus/odysseus.json' },
  jarvis: { icon: '🎙', name: 'Jarvis', desc: 'Voice Assistant', color: 'pink', configFile: 'agents/jarvis/jarvis.json' },
};

async function renderAgentConfig() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Control Rooms</h1>
        <p class="page-subtitle">Configure API keys, models, providers, and skills per agent</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="saveAllAgentConfigs()">💾 Save All</button>
      </div>
    </div>

    <!-- Agent Tabs -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:0;overflow-x:auto">
        <div class="agent-tabs" style="display:flex;border-bottom:1px solid var(--border)">
          ${Object.keys(agentMetaConfig).map(key => `
            <button class="agent-tab ${key === 'opencode' ? 'active' : ''}" 
                    onclick="switchAgentTab('${key}')"
                    style="padding:12px 20px;background:none;border:none;color:${key === 'opencode' ? 'var(--accent)' : 'var(--text-muted)'};font-weight:600;cursor:pointer;position:relative;white-space:nowrap;transition:var(--transition)">
              ${agentMetaConfig[key].icon} ${agentMetaConfig[key].name}
              <span class="agent-dot" id="tabDot_${key}" style="width:8px;height:8px;margin-left:6px;display:inline-block;vertical-align:middle"></span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div id="agentTabContent">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>
  `;

  // Load all agent configs
  await loadAgentConfig('opencode');
  await loadAgentConfig('hermes');
  await loadAgentConfig('gemini');
  await loadAgentConfig('claude');

  renderTab('opencode');
}

async function loadAgentConfig(agentName) {
  const meta = agentMetaConfig[agentName];
  try {
    // Load agent JSON config
    const response = await fetch(`/${meta.configFile}`);
    if (response.ok) {
      agentConfigState.agents[agentName] = await response.json();
    } else {
      agentConfigState.agents[agentName] = { name: agentName, enabled: true };
    }

    // Update tab dot based on status
    updateTabDot(agentName);
  } catch (err) {
    agentConfigState.agents[agentName] = { name: agentName, enabled: true };
    console.warn('Failed to load config for', agentName, err);
  }
}

function updateTabDot(agentName) {
  const dot = document.getElementById(`tabDot_${agentName}`);
  if (!dot) return;

  const config = agentConfigState.agents[agentName];
  const isEnabled = config?.enabled !== false;
  const hasApiKey = checkApiKey(agentName);

  if (hasApiKey && isEnabled) {
    dot.className = 'agent-dot online';
  } else if (isEnabled) {
    dot.className = 'agent-dot warning';
  } else {
    dot.className = 'agent-dot offline';
  }
}

function checkApiKey(agentName) {
  const keys = agentConfigState.apiKeys;
  switch (agentName) {
    case 'opencode':
    case 'hermes':
    case 'codex':
    case 'jarvis':
    case 'odysseus':
    case 'openclaw':
    case 'antigravity':
      return keys.openrouter_key && keys.openrouter_key.length > 10;
    case 'gemini':
      return keys.gemini_key && keys.gemini_key.length > 10;
    case 'claude':
      return keys.anthropic_key && keys.anthropic_key.length > 10;
  }
  return false;
}

function switchAgentTab(agentName) {
  // Update tab buttons
  document.querySelectorAll('.agent-tab').forEach(btn => {
    btn.classList.remove('active');
    btn.style.color = 'var(--text-muted)';
  });
  const activeBtn = document.querySelector(`.agent-tab[onclick*="${agentName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.color = 'var(--accent)';
  }
  agentConfigState.activeTab = agentName;
  renderTab(agentName);
}

function renderTab(agentName) {
  const container = document.getElementById('agentTabContent');
  const config = agentConfigState.agents[agentName] || {};
  const meta = agentMetaConfig[agentName];

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:24px">
      <!-- Agent Config -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">${meta.icon}</span>
          <div>
            <h3 class="card-title">${meta.name}</h3>
            <div style="font-size:12px;color:var(--text-muted)">${meta.desc}</div>
          </div>
          <label class="switch" style="margin-left:auto">
            <input type="checkbox" id="agentEnabled_${agentName}" ${config.enabled !== false ? 'checked' : ''} onchange="toggleAgentEnabled('${agentName}')">
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="card-body">
          ${renderAgentConfigForm(agentName, config)}
        </div>
      </div>

      <!-- API Keys (Shared) -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">🔑 API Keys</h3></div>
        <div class="card-body">
          ${renderApiKeyForm(agentName)}
        </div>
      </div>

      <!-- Model Selection -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">🤖 Model Selection</h3></div>
        <div class="card-body">
          ${renderModelSelection(agentName, config)}
        </div>
      </div>

      <!-- Skills Registry -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">⚡ Skills Registry</h3>
          <button class="btn btn-sm btn-primary" onclick="refreshAgentSkills('${agentName}')">🔄 Refresh</button>
        </div>
        <div class="card-body" id="agentSkills_${agentName}">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  // Load skills for this agent
  loadAgentSkills(agentName);
}

function renderAgentConfigForm(agentName, config) {
  const binary = config.binary || agentName;
  const maxTurns = config.max_turns || 50;
  const autoApprove = config.auto_approve || false;
  const systemPrompt = config.system_prompt || '';

  return `
    <div class="form-group">
      <label class="form-label">Binary / Command</label>
      <input id="config_${agentName}_binary" class="form-input" value="${escapeHtml(binary)}" placeholder="${agentName}">
    </div>
    <div class="form-group">
      <label class="form-label">Max Turns</label>
      <input id="config_${agentName}_maxTurns" class="form-input" type="number" value="${maxTurns}" min="1" max="200">
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="config_${agentName}_autoApprove" ${autoApprove ? 'checked' : ''}>
        <span>Auto-approve tool calls</span>
      </label>
    </div>
    <div class="form-group">
      <label class="form-label">System Prompt</label>
      <textarea id="config_${agentName}_systemPrompt" class="form-input" rows="4" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(systemPrompt)}</textarea>
    </div>
  `;
}

function renderApiKeyForm(agentName) {
  // Different keys for different agents
  let fields = '';

  if (['opencode', 'hermes', 'codex', 'jarvis', 'odysseus', 'openclaw', 'antigravity'].includes(agentName)) {
    const key = agentConfigState.apiKeys.openrouter_key || '';
    fields += `
      <div class="form-group">
        <label class="form-label">OpenRouter API Key</label>
        <input id="api_openrouter" class="form-input" type="password" value="${escapeHtml(key)}" placeholder="sk-or-v1-...">
        <div class="form-hint">Used by ${agentName} for OpenRouter models</div>
      </div>
    `;
  }

  if (agentName === 'gemini') {
    const key = agentConfigState.apiKeys.gemini_key || '';
    fields += `
      <div class="form-group">
        <label class="form-label">Gemini API Key</label>
        <input id="api_gemini" class="form-input" type="password" value="${escapeHtml(key)}" placeholder="AIza...">
        <div class="form-hint">Or use \`gemini auth login\` for OAuth</div>
      </div>
    `;
  }

  if (agentName === 'claude') {
    const key = agentConfigState.apiKeys.anthropic_key || '';
    fields += `
      <div class="form-group">
        <label class="form-label">Anthropic API Key</label>
        <input id="api_anthropic" class="form-input" type="password" value="${escapeHtml(key)}" placeholder="sk-ant-...">
      </div>
    `;
  }

  if (!fields) {
    fields = '<p style="font-size:13px;color:var(--text-muted)">No specific API keys for this agent</p>';
  }

  return fields;
}

function renderModelSelection(agentName, config) {
  const models = getAvailableModels(agentName);
  const currentModel = config.model || models[0]?.value || '';

  let html = `
    <div class="form-group">
      <label class="form-label">Model</label>
      <select id="config_${agentName}_model" class="form-select">
        ${models.map(m => `<option value="${m.value}" ${m.value === currentModel ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </div>
  `;

  if (agentName === 'gemini') {
    html += `
      <div class="form-group">
        <label class="form-label">Temperature</label>
        <input id="config_${agentName}_temperature" class="form-input" type="number" step="0.1" min="0" max="2" value="${config.temperature || 0.7}">
      </div>
      <div class="form-group">
        <label class="form-label">Max Tokens</label>
        <input id="config_${agentName}_maxTokens" class="form-input" type="number" value="${config.max_tokens || 8192}">
      </div>
    `;
  }

  if (agentName === 'claude') {
    html += `
      <div class="form-group">
        <label class="form-label">Max Tokens</label>
        <input id="config_${agentName}_maxTokens" class="form-input" type="number" value="${config.max_tokens || 4096}">
      </div>
    `;
  }

  return html;
}

function getAvailableModels(agentName) {
  const modelLists = {
    opencode: [
      { value: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash (Free)' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'gpt-4o', label: 'GPT-4o' },
    ],
    hermes: [
      { value: 'openrouter/owl-alpha', label: 'Owl Alpha (OpenRouter)' },
      { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    gemini: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    claude: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    ],
    codex: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    ],
    antigravity: [
      { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
      { value: 'openrouter/owl-alpha', label: 'Owl Alpha' },
      { value: 'perplexity/sonar', label: 'Perplexity Sonar' },
    ],
    openclaw: [
      { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
      { value: 'openrouter/owl-alpha', label: 'Owl Alpha' },
    ],
    odysseus: [
      { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
      { value: 'openrouter/owl-alpha', label: 'Owl Alpha' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    ],
    jarvis: [
      { value: 'openrouter/owl-alpha', label: 'Owl Alpha' },
      { value: 'openrouter/auto', label: 'Auto (OpenRouter)' },
    ],
  };
  return modelLists[agentName] || [{ value: 'default', label: 'Default' }];
}

async function loadAgentSkills(agentName) {
  const container = document.getElementById(`agentSkills_${agentName}`);
  if (!container) return;

  try {
    const data = await api.getSkills();
    const skills = data.skills || [];

    // Filter skills by primary agent
    const agentSkills = skills.filter(s => {
      const primary = s.primary_agent || 'opencode';
      return primary.toLowerCase() === agentName.toLowerCase();
    });

    if (agentSkills.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">No skills assigned to this agent</p>';
      return;
    }

    // Categorize
    const categorized = {};
    for (const skill of agentSkills) {
      const cat = skill.category || 'general';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(skill);
    }

    let html = '';
    for (const [cat, catSkills] of Object.entries(categorized)) {
      html += `<h5 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin:16px 0 8px">${cat}</h5>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:8px">`;
      for (const skill of catSkills) {
        const hasEval = skill.has_learnings && skill.eval_criteria?.length > 0;
        html += `
          <div class="skill-badge" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;cursor:pointer">
            <span style="font-weight:600">${skill.name}</span>
            ${hasEval ? '<span class="badge badge-success" style="font-size:8px">Eval</span>' : ''}
            ${skill.scores?.length ? `<span class="badge" style="font-size:8px;background:var(--accent-dim);color:var(--accent)">${skill.scores[skill.scores.length-1].score.toFixed(0)}</span>` : ''}
          </div>
        `;
      }
      html += `</div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--red);font-size:13px;padding:20px;text-align:center">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

function refreshAgentSkills(agentName) {
  const container = document.getElementById(`agentSkills_${agentName}`);
  if (container) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
  }
  loadAgentSkills(agentName);
}

function toggleAgentEnabled(agentName) {
  const cb = document.getElementById(`agentEnabled_${agentName}`);
  if (!cb) return;
  
  if (!agentConfigState.agents[agentName]) {
    agentConfigState.agents[agentName] = {};
  }
  agentConfigState.agents[agentName].enabled = cb.checked;
  updateTabDot(agentName);
  showToast(`${agentName} ${cb.checked ? 'enabled' : 'disabled'}`, 'info');
}

async function saveAllAgentConfigs() {
  try {
    // Save each agent's config
    for (const [name, config] of Object.entries(agentConfigState.agents)) {
      if (name === 'opencode') continue; // Skip opencode for now
      
      const meta = agentMetaConfig[name];
      const configData = {
        ...config,
        binary: document.getElementById(`config_${name}_binary`)?.value || config.binary,
        max_turns: parseInt(document.getElementById(`config_${name}_maxTurns`)?.value) || config.max_turns,
        auto_approve: document.getElementById(`config_${name}_autoApprove`)?.checked || false,
        system_prompt: document.getElementById(`config_${name}_systemPrompt`)?.value || config.system_prompt,
        model: document.getElementById(`config_${name}_model`)?.value || config.model,
        temperature: parseFloat(document.getElementById(`config_${name}_temperature`)?.value) || config.temperature,
        max_tokens: parseInt(document.getElementById(`config_${name}_maxTokens`)?.value) || config.max_tokens,
      };

      // Write to file
      await fetch(`/${meta.configFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData, null, 2),
      });
    }

    // Save API keys to settings
    const apiKeys = {
      openrouter_key: document.getElementById('api_openrouter')?.value || '',
      gemini_key: document.getElementById('api_gemini')?.value || '',
      anthropic_key: document.getElementById('api_anthropic')?.value || '',
    };
    await api.updateSettings({ api_keys: apiKeys });

    showToast('All agent configurations saved', 'success');
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

// Expose globally
window.renderAgentConfig = renderAgentConfig;
window.switchAgentTab = switchAgentTab;
window.toggleAgentEnabled = toggleAgentEnabled;
window.saveAllAgentConfigs = saveAllAgentConfigs;
window.refreshAgentSkills = refreshAgentSkills;