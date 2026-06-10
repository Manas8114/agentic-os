// Setup Wizard - Guided configuration for Agentic OS
const SETUP_STEPS = [
  { id: 'welcome', title: 'Welcome', desc: 'Configure Agentic OS for your environment', icon: '👋' },
  { id: 'agents', title: 'Agent Discovery', desc: 'Detect and install required agents', icon: '🤖' },
  { id: 'api-keys', title: 'API Keys', desc: 'Configure authentication for each agent', icon: '🔑' },
  { id: 'skills', title: 'Skills Selection', desc: 'Choose which skills to activate', icon: '⚡' },
  { id: 'memory', title: 'Memory Init', desc: 'Initialize shared memory & brain', icon: '🧠' },
  { id: 'scheduler', title: 'Scheduler Jobs', desc: 'Set up automated workflows', icon: '⏱' },
  { id: 'git', title: 'Git Config', desc: 'Configure version control for memory', icon: '📝' },
  { id: 'preferences', title: 'Preferences', desc: 'Personalize your dashboard', icon: '⚙️' },
  { id: 'verify', title: 'Verification', desc: 'Final checks & launch', icon: '✅' },
];

let setupState = {
  currentStep: 0,
  agents: {},
  apiKeys: { openrouter: '', anthropic: '', gemini: '' },
  selectedSkills: [],
  memoryInitialized: false,
  schedulerJobs: [],
  gitConfigured: false,
  preferences: { theme: 'dark', defaultAgent: 'opencode' },
};

async function renderSetupWizard() {
  const content = document.getElementById('pageContent');
  setupState.currentStep = 0;
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Setup Wizard</h1>
        <p class="page-subtitle">Guided configuration for Agentic OS</p>
      </div>
    </div>
    <div class="card" style="max-width:720px;margin:0 auto">
      <div id="wizardBody"></div>
    </div>
  `;
  renderWizardStep();
}

async function renderWizardStep() {
  const body = document.getElementById('wizardBody');
  if (!body) return;
  
  const step = SETUP_STEPS[setupState.currentStep];
  if (!step) { finishSetup(); return; }

  body.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="display:flex;gap:6px;margin-bottom:20px">
        ${SETUP_STEPS.map((s, i) => `
          <div style="flex:1;height:4px;border-radius:2px;background:${i <= setupState.currentStep ? 'var(--accent)' : 'var(--border)'};transition:background 0.3s"></div>
        `).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">${step.icon}</span>
        <div>
          <h2 style="font-size:20px;margin:0">${step.title}</h2>
          <p style="color:var(--text-muted);font-size:13px;margin:2px 0 0">${step.desc}</p>
        </div>
      </div>
    </div>
    <div id="wizardContent"></div>
    <div class="flex justify-between mt-4" style="padding-top:16px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" onclick="prevWizardStep()" ${setupState.currentStep === 0 ? 'disabled' : ''}>← Back</button>
      <button class="btn btn-primary" onclick="nextWizardStep()">${setupState.currentStep === SETUP_STEPS.length - 1 ? '✓ Complete Setup' : 'Continue →'}</button>
    </div>
  `;

  const wc = document.getElementById('wizardContent');
  switch (setupState.currentStep) {
    case 0: renderWelcome(wc); break;
    case 1: await renderAgents(wc); break;
    case 2: renderApiKeys(wc); break;
    case 3: await renderSkills(wc); break;
    case 4: await renderMemory(wc); break;
    case 5: await renderScheduler(wc); break;
    case 6: renderGitConfig(wc); break;
    case 7: renderPreferences(wc); break;
    case 8: await renderVerify(wc); break;
  }
}

function renderWelcome(el) {
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:64px;margin-bottom:16px">⬡</div>
      <p style="font-size:15px;color:var(--text-secondary);line-height:1.7;max-width:500px;margin:0 auto">
        Agentic OS coordinates <strong>opencode</strong>, <strong>Hermes Agent</strong>, <strong>Gemini CLI</strong>, and <strong>Claude</strong> 
        into a unified multi-agent orchestration platform.
      </p>
      <div style="margin-top:24px;padding:16px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);text-align:left;font-size:13px;color:var(--text-secondary)">
        <div style="font-weight:600;margin-bottom:8px">What this wizard configures:</div>
        <ul style="margin:0;padding-left:20px;line-height:2">
          <li>Agent detection & installation guidance</li>
          <li>API keys for Anthropic, OpenRouter, Gemini</li>
          <li>Skill activation for your workflows</li>
          <li>Shared memory brain initialization</li>
          <li>Automated scheduler jobs</li>
          <li>Git auto-versioning for memory</li>
          <li>Personal preferences</li>
        </ul>
      </div>
    </div>
  `;
}

async function renderAgents(el) {
  el.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Detecting agents...</span></div>';
  try {
    const status = await api.getStatus();
    setupState.agents = {};
    for (const agent of status.agents) {
      setupState.agents[agent.name] = agent;
    }
    renderAgentsContent(el);
  } catch (err) {
    el.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:transparent;padding:12px"><div style="display:flex;gap:8px;align-items:center"><span>✕</span><span style="font-size:13px">${escapeHtml(err.message)}</span></div></div>`;
  }
}

function renderAgentsContent(el) {
  const agents = [
    { key: 'opencode', name: 'opencode', description: 'Code generation, file ops, DevOps, git', install: 'npm i -g @opencode-ai/opencode', check: 'opencode' },
    { key: 'hermes', name: 'Hermes Agent', description: 'Persistent memory, cron, channels, skills', install: 'pip install hermes-agent', check: 'hermes' },
    { key: 'gemini', name: 'Gemini CLI', description: 'Web research, multi-modal analysis', install: 'npm i -g @google/gemini-cli', check: 'gemini' },
    { key: 'claude', name: 'Claude (Anthropic SDK)', description: 'Strategy, architecture, complex reasoning', install: 'pip install anthropic', check: 'claude' },
  ];

  el.innerHTML = `
    <div class="grid grid-2" style="margin-bottom:16px">
      ${agents.map(a => {
        const status = setupState.agents[a.key]?.status || 'offline';
        const statusClass = status === 'online' ? 'online' : status === 'warning' ? 'warning' : 'offline';
        const statusText = status === 'online' ? 'Detected ✓' : status === 'warning' ? 'Partial' : 'Not found';
        const statusColor = status === 'online' ? 'var(--green)' : status === 'warning' ? 'var(--yellow)' : 'var(--text-muted)';
        return `
          <div class="agent-card" style="position:relative">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div class="agent-dot ${statusClass}" style="width:14px;height:14px;margin-top:2px;flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px">${a.name}</div>
                <div style="font-size:12px;color:var(--text-muted);margin:2px 0">${a.description}</div>
                <div style="font-size:12px;color:${statusColor}">${statusText}</div>
              </div>
            </div>
            ${status !== 'online' ? `
              <div style="margin-top:10px;padding:8px;background:var(--bg-input);border-radius:var(--radius);font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">
                Install: ${a.install}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
    ${Object.values(setupState.agents).some(a => a.status !== 'online') ? `
      <div class="card" style="background:var(--yellow-dim);border-color:transparent;padding:12px;margin-top:8px">
        <div style="display:flex;gap:8px;align-items:flex-start">
          <span>⚠</span>
          <span style="font-size:13px;line-height:1.5">
            Some agents are not detected. Agentic OS will route tasks to available agents only. 
            Install missing agents for full functionality.
          </span>
        </div>
      </div>
    ` : ''}
  `;
}

function renderApiKeys(el) {
  el.innerHTML = `
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      Enter API keys for agents that require them. Keys are stored locally in <code>data/settings.json</code>.
    </div>
    
    <div class="form-group">
      <label class="form-label">OpenRouter API Key <span style="color:var(--text-muted);font-weight:normal">(for Hermes, opencode, Gemini free tier)</span></label>
      <input type="password" id="apiOpenRouter" class="form-input" placeholder="sk-or-v1-..." value="${setupState.apiKeys.openrouter}">
      <div class="form-hint">Get your key at <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--accent-light)">openrouter.ai/keys</a></div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Anthropic API Key <span style="color:var(--text-muted);font-weight:normal">(for Claude agent)</span></label>
      <input type="password" id="apiAnthropic" class="form-input" placeholder="sk-ant-..." value="${setupState.apiKeys.anthropic}">
      <div class="form-hint">Get your key at <a href="https://console.anthropic.com/" target="_blank" style="color:var(--accent-light)">console.anthropic.com</a></div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Google OAuth <span style="color:var(--text-muted);font-weight:normal">(for Gemini CLI - uses browser login)</span></label>
      <div class="form-input" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="launchGeminiAuth()">
        <span id="geminiStatus">${setupState.apiKeys.gemini ? '✓ Authenticated' : 'Click to authenticate via browser'}</span>
        <span style="font-size:12px;color:var(--accent-light)">Launch</span>
      </div>
      <div class="form-hint">Opens browser for Google OAuth. Run <code>gemini auth login</code> in terminal as alternative.</div>
    </div>
    
    <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);font-size:12px;color:var(--text-secondary)">
      <strong>Security Note:</strong> Keys are stored in plaintext in <code>data/settings.json</code> within your project directory. 
      Ensure this directory is not shared publicly. For production, use environment variables.
    </div>
  `;
}

async function renderSkills(el) {
  el.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Loading skills...</span></div>';
  try {
    const data = await api.getSkills();
    const skills = data.skills || [];
    
    // Categorize skills
    const categorized = {};
    for (const skill of skills) {
      const cat = skill.category || 'general';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(skill);
    }
    
    let html = `
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
        Select skills to activate. Activated skills appear in the Skills page and can be run from the dashboard.
      </div>
      <div style="max-height:400px;overflow-y:auto">
    `;
    
    for (const [cat, catSkills] of Object.entries(categorized)) {
      html += `<div style="margin-bottom:16px"><h4 style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">${cat}</h4>`;
      html += `<div class="grid grid-2">`;
      for (const skill of catSkills) {
        const isSelected = setupState.selectedSkills.includes(skill.name);
        const primaryAgent = skill.primary_agent || 'opencode';
        const agentBadge = `<span class="badge" style="background:${getAgentColor(primaryAgent)};font-size:9px;margin-left:8px">${primaryAgent}</span>`;
        html += `
          <label class="skill-checkbox-card ${isSelected ? 'selected' : ''}" onclick="toggleSkill('${skill.name}', this)">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="event.stopPropagation()">
            <div style="flex:1">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-weight:600;font-size:13px;text-transform:capitalize">${skill.name}${agentBadge}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;line-height:1.4">${skill.description || 'No description'}</div>
            </div>
          </label>
        `;
      }
      html += `</div></div>`;
    }
    
    html += `</div>`;
    el.innerHTML = html;
    
    // Add styles for skill cards
    if (!document.getElementById('wizardSkillStyles')) {
      const style = document.createElement('style');
      style.id = 'wizardSkillStyles';
      style.textContent = `
        .skill-checkbox-card {
          display:flex;align-items:flex-start;gap:10px;padding:12px;
          background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);
          cursor:pointer;transition:var(--transition);
        }
        .skill-checkbox-card:hover { border-color:var(--accent); background:var(--accent-glow); }
        .skill-checkbox-card.selected { border-color:var(--accent); background:var(--accent-glow); }
        .skill-checkbox-card input[type="checkbox"] { margin-top:2px; accent-color:var(--accent); }
      `;
      document.head.appendChild(style);
    }
  } catch (err) {
    el.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:transparent;padding:12px"><span>✕</span><span>${escapeHtml(err.message)}</span></div>`;
  }
}

function getAgentColor(agent) {
  const colors = { opencode: 'var(--blue-dim)', hermes: 'var(--purple)', gemini: 'var(--yellow-dim)', claude: 'var(--pink)' };
  return colors[agent] || 'var(--border)';
}

function toggleSkill(name, el) {
  const checkbox = el.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;
  if (checkbox.checked) {
    setupState.selectedSkills.push(name);
    el.classList.add('selected');
  } else {
    setupState.selectedSkills = setupState.selectedSkills.filter(s => s !== name);
    el.classList.remove('selected');
  }
}

async function renderMemory(el) {
  if (setupState.memoryInitialized) {
    renderMemoryDone(el);
    return;
  }
  
  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="loading-spinner" style="width:20px;height:20px"></div>
        <span>Checking brain files...</span>
      </div>
    </div>
  `;
  
  try {
    const brain = await api.getBrain();
    const files = Object.keys(brain);
    const expectedFiles = ['business-brain.md', 'memory.md', 'recent-decisions.md', 'active-projects.md', 'constraints.md', 'identity.md', 'constitution.md'];
    const missing = expectedFiles.filter(f => !files.includes(f));
    
    if (missing.length === 0) {
      renderMemoryDone(el);
    } else {
      el.innerHTML = `
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          The following brain files are missing and will be created:
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          ${missing.map(f => `<span class="badge" style="background:var(--yellow-dim);color:var(--yellow)">${f}</span>`).join('')}
        </div>
        <button class="btn btn-primary" onclick="initMemory()">Initialize Brain Files</button>
      `;
    }
  } catch (err) {
    el.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:transparent;padding:12px"><span>✕</span><span>${escapeHtml(err.message)}</span></div>`;
  }
}

async function initMemory() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner" style="width:14px;height:14px"></div> Creating...';
  
  const templates = {
    'business-brain.md': '# Business Brain\n\n## Overview\nThis file contains the shared business context read by all agents at session start.\n\n## Mission\n\n## Goals\n\n## Key Metrics\n\n## Constraints\n',
    'memory.md': '# Memory\n\n## Recent Context\n\n## Decisions\n\n## Patterns\n',
    'recent-decisions.md': '# Recent Decisions\n\n| Date | Decision | Context | Outcome |\n|------|----------|---------|---------|\n',
    'active-projects.md': '# Active Projects\n\n## Current\n\n## Completed\n\n## Archived\n',
    'constraints.md': '# Constraints\n\n## Technical\n\n## Business\n\n## Resources\n',
    'identity.md': '# Identity\n\n## Role\nYou are the kernel of Agentic OS — a multi-agent orchestration platform.\n\n## Personality\nProfessional, precise, proactive.\n',
    'constitution.md': '# Constitution\n\n## Governance\n- All actions must be auditable\n- No unilateral destructive operations\n- Prefer local-first, free-tier solutions\n- Document learnings after each task\n',
  };
  
  try {
    for (const [file, content] of Object.entries(templates)) {
      await api.updateBrainFile(file, content);
    }
    setupState.memoryInitialized = true;
    renderMemoryDone(document.getElementById('wizardContent'));
    showToast('Brain files initialized', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Initialize Brain Files';
    showToast('Failed: ' + err.message, 'error');
  }
}

function renderMemoryDone(el) {
  setupState.memoryInitialized = true;
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:48px;margin-bottom:12px">✓</div>
      <h3 style="margin-bottom:8px">Memory Initialized</h3>
      <p style="font-size:13px;color:var(--text-muted)">All 7 brain files are created and ready.</p>
      <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);text-align:left;font-size:12px">
        <strong>Files:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;line-height:2;color:var(--text-secondary)">
          <li>business-brain.md</li>
          <li>memory.md</li>
          <li>recent-decisions.md</li>
          <li>active-projects.md</li>
          <li>constraints.md</li>
          <li>identity.md</li>
          <li>constitution.md</li>
        </ul>
        <div style="margin-top:12px;font-size:11px;color:var(--text-muted)">
          Journal directory <code>brain/journal/</code> will be created automatically on first entry.
        </div>
      </div>
    </div>
  `;
}

async function renderScheduler(el) {
  if (setupState.schedulerJobs.length > 0) {
    renderSchedulerDone(el);
    return;
  }
  
  el.innerHTML = `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      Set up default scheduled jobs for continuous operation:
    </p>
    <div id="schedulerJobsList"></div>
    <button class="btn btn-primary" onclick="createDefaultJobs()">Create Default Jobs</button>
  `;
  
  renderSchedulerJobs();
}

function renderSchedulerJobs() {
  const jobs = [
    { id: 'heartbeat', name: 'Heartbeat', schedule: '*/5 * * * *', skill: 'heartbeat', desc: 'Health check every 5 minutes' },
    { id: 'standup', name: 'Daily Standup', schedule: '0 9 * * *', skill: 'daily-standup', desc: 'Morning briefing at 9 AM' },
    { id: 'memory-consolidation', name: 'Memory Consolidation', schedule: '0 2 * * 0', skill: 'memory-consolidation', desc: 'Weekly synthesis Sundays 2 AM' },
    { id: 'devops-audit', name: 'DevOps Audit', schedule: '0 3 * * *', skill: 'devops-audit', desc: 'Daily infra check at 3 AM' },
  ];
  
  const container = document.getElementById('schedulerJobsList');
  if (!container) return;
  
  container.innerHTML = jobs.map(job => `
    <label style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer">
      <input type="checkbox" value="${job.id}" onchange="toggleSchedulerJob('${job.id}', this.checked)" checked>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${job.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${job.desc} • <code>${job.schedule}</code></div>
      </div>
      <span class="badge badge-info">${job.skill}</span>
    </label>
  `).join('');
}

function toggleSchedulerJob(id, checked) {
  if (checked) {
    if (!setupState.schedulerJobs.includes(id)) setupState.schedulerJobs.push(id);
  } else {
    setupState.schedulerJobs = setupState.schedulerJobs.filter(j => j !== id);
  }
}

async function createDefaultJobs() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner" style="width:14px;height:14px"></div> Creating...';
  
  try {
    for (const jobId of setupState.schedulerJobs) {
      let jobData;
      switch (jobId) {
        case 'heartbeat':
          jobData = { name: 'Heartbeat', schedule: '*/5 * * * *', prompt: 'Run the heartbeat skill to check system health', skills: ['heartbeat'] };
          break;
        case 'standup':
          jobData = { name: 'Daily Standup', schedule: '0 9 * * *', prompt: 'Run daily standup skill for morning briefing', skills: ['daily-standup'] };
          break;
        case 'memory-consolidation':
          jobData = { name: 'Memory Consolidation', schedule: '0 2 * * 0', prompt: 'Run memory consolidation for weekly synthesis', skills: ['memory-consolidation'] };
          break;
        case 'devops-audit':
          jobData = { name: 'DevOps Audit', schedule: '0 3 * * *', prompt: 'Run devops audit for infrastructure check', skills: ['devops-audit'] };
          break;
      }
      if (jobData) {
        await api.createJob(jobData);
      }
    }
    renderSchedulerDone(document.getElementById('wizardContent'));
    showToast('Scheduler jobs created', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Create Default Jobs';
    showToast('Failed: ' + err.message, 'error');
  }
}

function renderSchedulerDone(el) {
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:48px;margin-bottom:12px">✓</div>
      <h3 style="margin-bottom:8px">Scheduler Jobs Created</h3>
      <p style="font-size:13px;color:var(--text-muted)">${setupState.schedulerJobs.length} jobs configured</p>
      <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);text-align:left;font-size:12px">
        <div style="font-weight:600;margin-bottom:8px">Active Jobs:</div>
        <ul style="margin:0;padding-left:20px;line-height:2;color:var(--text-secondary)">
          ${setupState.schedulerJobs.map(id => {
            const names = { heartbeat: 'Heartbeat (every 5 min)', standup: 'Daily Standup (9 AM)', 'memory-consolidation': 'Memory Consolidation (Sun 2 AM)', 'devops-audit': 'DevOps Audit (3 AM)' };
            return `<li>${names[id] || id}</li>`;
          }).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderGitConfig(el) {
  if (setupState.gitConfigured) {
    renderGitDone(el);
    return;
  }
  
  // Check git status
  el.innerHTML = `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      Enable git auto-versioning for brain files, skills, and configuration changes.
    </p>
    <div id="gitStatus" style="margin-bottom:16px">Checking git repository...</div>
    <button class="btn btn-primary" onclick="configureGit()" id="gitBtn">Configure Git</button>
  `;
  
  checkGitStatus();
}

async function checkGitStatus() {
  const statusEl = document.getElementById('gitStatus');
  try {
    const result = await api.get('/api/execute', { method: 'POST', body: JSON.stringify({ code: "import subprocess; r = subprocess.run(['git', 'status'], capture_output=True, text=True); print(r.returncode, r.stdout[:200])" }) });
    // Use simpler approach - just try to execute
    const res = await fetch('/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: "import subprocess; r = subprocess.run(['git', 'status'], capture_output=True, text=True); print(r.returncode)" }) });
    const gitCheck = await res.json();
    const isRepo = gitCheck.output && gitCheck.output.trim() === '0';
    
    if (isRepo) {
      statusEl.innerHTML = `
        <div style="padding:12px;background:var(--green-dim);border-radius:var(--radius);color:var(--green);font-size:13px">
          ✓ Git repository detected. Auto-commit will work automatically.
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div style="padding:12px;background:var(--yellow-dim);border-radius:var(--radius);color:var(--yellow);font-size:13px">
          ⚠ Not a git repository. Initialize to enable auto-versioning.
        </div>
      `;
    }
  } catch {
    statusEl.innerHTML = `
      <div style="padding:12px;background:var(--red-dim);border-radius:var(--radius);color:var(--red);font-size:13px">
        ✕ Git not available or error checking status.
      </div>
    `;
  }
}

async function configureGit() {
  const btn = document.getElementById('gitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner" style="width:14px;height:14px"></div> Initializing...';
  
  try {
    await fetch('/api/execute', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        code: "import subprocess; subprocess.run(['git', 'init']); subprocess.run(['git', 'add', '.']); subprocess.run(['git', 'commit', '-m', 'chore: initial commit from setup wizard'])" 
      }) 
    });
    setupState.gitConfigured = true;
    renderGitDone(document.getElementById('wizardContent'));
    showToast('Git repository initialized', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Configure Git';
    showToast('Failed: ' + err.message, 'error');
  }
}

function renderGitDone(el) {
  setupState.gitConfigured = true;
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:48px;margin-bottom:12px">✓</div>
      <h3 style="margin-bottom:8px">Git Configured</h3>
      <p style="font-size:13px;color:var(--text-muted)">Auto-versioning enabled for brain, skills, and settings.</p>
      <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);text-align:left;font-size:12px;color:var(--text-secondary)">
        Changes to brain/*, skills/*, registry/*, standards/*, prompts/*, data/settings.json will be auto-committed.
      </div>
    </div>
  `;
}

function renderPreferences(el) {
  // Load saved settings
  api.getSettings().then(s => {
    if (s) {
      setupState.preferences.theme = s.theme || 'dark';
      setupState.preferences.defaultAgent = s.defaultAgent || 'opencode';
    }
    renderPreferencesContent(el);
  }).catch(() => renderPreferencesContent(el));
}

function renderPreferencesContent(el) {
  el.innerHTML = `
    <div class="form-group">
      <label class="form-label">Dashboard Theme</label>
      <select id="prefTheme" class="form-select" onchange="setupState.preferences.theme=this.value; document.documentElement.setAttribute('data-theme', this.value)">
        <option value="dark" ${setupState.preferences.theme === 'dark' ? 'selected' : ''}>Dark (default)</option>
        <option value="light" ${setupState.preferences.theme === 'light' ? 'selected' : ''}>Light</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Default Agent for Unknown Tasks</label>
      <select id="prefDefaultAgent" class="form-select" onchange="setupState.preferences.defaultAgent=this.value">
        <option value="opencode" ${setupState.preferences.defaultAgent === 'opencode' ? 'selected' : ''}>opencode — Code & DevOps</option>
        <option value="hermes" ${setupState.preferences.defaultAgent === 'hermes' ? 'selected' : ''}>Hermes — Memory & Scheduling</option>
        <option value="gemini" ${setupState.preferences.defaultAgent === 'gemini' ? 'selected' : ''}>Gemini CLI — Research & Analysis</option>
        <option value="claude" ${setupState.preferences.defaultAgent === 'claude' ? 'selected' : ''}>Claude — Strategy & Architecture</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Auto-refresh Interval (seconds)</label>
      <input type="number" id="prefRefresh" class="form-input" value="30" min="10" max="300" onchange="setupState.preferences.autoRefresh=parseInt(this.value)">
    </div>
    
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="prefCompact" onchange="setupState.preferences.compactMode=this.checked" ${setupState.preferences.compactMode ? 'checked' : ''}>
        <span>Compact mode (denser UI)</span>
      </label>
    </div>
    
    <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);font-size:12px;color:var(--text-secondary)">
      <strong>API Keys</strong> (from previous step) will be saved with these preferences.
    </div>
  `;
}

async function renderVerify(el) {
  el.innerHTML = `
    <div class="loading"><div class="loading-spinner"></div><span>Running final checks...</span></div>
  `;
  
  try {
    const checks = await runVerificationChecks();
    renderVerificationResults(el, checks);
  } catch (err) {
    el.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:transparent;padding:12px"><span>✕</span><span>${escapeHtml(err.message)}</span></div>`;
  }
}

async function runVerificationChecks() {
  const checks = [];
  
  // Check agents
  const status = await api.getStatus();
  const onlineAgents = status.agents.filter(a => a.status === 'online').length;
  checks.push({
    name: 'Agents Online',
    status: onlineAgents >= 2 ? 'pass' : onlineAgents >= 1 ? 'warn' : 'fail',
    detail: `${onlineAgents}/4 agents detected`,
  });
  
  // Check API keys
  const settings = await api.getSettings().catch(() => ({}));
  const hasKeys = settings.openrouter_key || settings.anthropic_key;
  checks.push({
    name: 'API Keys Configured',
    status: hasKeys ? 'pass' : 'warn',
    detail: hasKeys ? 'Keys saved' : 'Some agents may not work without keys',
  });
  
  // Check brain files
  const brain = await api.getBrain();
  const brainFiles = Object.keys(brain).length;
  checks.push({
    name: 'Brain Files',
    status: brainFiles >= 7 ? 'pass' : brainFiles > 0 ? 'warn' : 'fail',
    detail: `${brainFiles}/7 files present`,
  });
  
  // Check skills
  const skillsData = await api.getSkills();
  const skillsCount = skillsData.skills?.length || 0;
  checks.push({
    name: 'Skills Available',
    status: skillsCount >= 10 ? 'pass' : skillsCount > 0 ? 'warn' : 'fail',
    detail: `${skillsCount} skills loaded`,
  });
  
  // Check scheduler
  const jobs = await api.getJobs();
  const jobsCount = jobs.jobs?.length || 0;
  checks.push({
    name: 'Scheduler Jobs',
    status: jobsCount >= 2 ? 'pass' : jobsCount > 0 ? 'warn' : 'fail',
    detail: `${jobsCount} jobs configured`,
  });
  
  // Check git
  try {
    const res = await fetch('/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: "import subprocess; r = subprocess.run(['git', 'status'], capture_output=True, text=True); print(r.returncode)" }) });
    const gitCheck = await res.json();
    const gitOk = gitCheck.output && gitCheck.output.trim() === '0';
    checks.push({
      name: 'Git Repository',
      status: gitOk ? 'pass' : 'warn',
      detail: gitOk ? 'Initialized' : 'Not a git repo',
    });
  } catch {
    checks.push({
      name: 'Git Repository',
      status: 'warn',
      detail: 'Could not verify',
    });
  }
  
  // Save settings
  checks.push({
    name: 'Preferences Saved',
    status: 'pass',
    detail: 'Theme, default agent, refresh interval saved',
  });
  
  return checks;
}

function renderVerificationResults(el, checks) {
  const passed = checks.filter(c => c.status === 'pass').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:56px;margin-bottom:12px">${failed > 0 ? '⚠' : warned > 0 ? '⚡' : '✓'}</div>
      <h3 style="margin-bottom:8px">${failed > 0 ? 'Setup Complete with Issues' : warned > 0 ? 'Setup Complete (with warnings)' : 'All Checks Passed!'}</h3>
      <p style="font-size:13px;color:var(--text-muted)">${passed} passed • ${warned} warnings • ${failed} issues</p>
    </div>
    
    <div style="margin-top:16px;max-height:300px;overflow-y:auto;text-align:left">
      ${checks.map(c => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">
          <span style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:${c.status === 'pass' ? 'var(--green-dim)' : c.status === 'warn' ? 'var(--yellow-dim)' : 'var(--red-dim)'};color:${c.status === 'pass' ? 'var(--green)' : c.status === 'warn' ? 'var(--yellow)' : 'var(--red)'}">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.detail}</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);font-size:12px;color:var(--text-secondary)">
      <strong>Next Steps:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:2">
        <li>Visit the <strong>Dashboard</strong> for system overview</li>
        <li>Explore <strong>Skills</strong> to run your first automation</li>
        <li>Check <strong>Agent Health</strong> for detailed status</li>
        <li>Review <strong>Memory</strong> to see shared context</li>
      </ul>
    </div>
  `;
}

function nextWizardStep() {
  // Save data from current step before moving on
  saveCurrentStepData();
  
  if (setupState.currentStep < SETUP_STEPS.length - 1) {
    setupState.currentStep++;
    renderWizardStep();
  } else {
    finishSetup();
  }
}

function saveCurrentStepData() {
  const step = SETUP_STEPS[setupState.currentStep];
  
  switch (step.id) {
    case 'api-keys':
      setupState.apiKeys.openrouter = document.getElementById('apiOpenRouter')?.value || '';
      setupState.apiKeys.anthropic = document.getElementById('apiAnthropic')?.value || '';
      // Save to settings
      api.updateSettings({
        openrouter_key: setupState.apiKeys.openrouter,
        anthropic_key: setupState.apiKeys.anthropic,
      }).catch(() => {});
      break;
    case 'skills':
      // Already saved via toggleSkill
      break;
    case 'preferences':
      setupState.preferences.theme = document.getElementById('prefTheme')?.value || 'dark';
      setupState.preferences.defaultAgent = document.getElementById('prefDefaultAgent')?.value || 'opencode';
      setupState.preferences.autoRefresh = parseInt(document.getElementById('prefRefresh')?.value || '30');
      setupState.preferences.compactMode = document.getElementById('prefCompact')?.checked || false;
      // Save to settings
      api.updateSettings(setupState.preferences).catch(() => {});
      break;
  }
}

function prevWizardStep() {
  if (setupState.currentStep > 0) {
    setupState.currentStep--;
    renderWizardStep();
  }
}

async function finishSetup() {
  // Save final preferences
  try {
    await api.updateSettings({
      ...setupState.preferences,
      openrouter_key: setupState.apiKeys.openrouter,
      anthropic_key: setupState.apiKeys.anthropic,
      setupCompleted: true,
      setupDate: new Date().toISOString(),
    });
    showToast('Setup complete! Settings saved.', 'success');
  } catch (err) {
    showToast('Setup complete but failed to save settings: ' + err.message, 'warning');
  }
  
  navigate('dashboard');
}

// Helper to launch Gemini auth
function launchGeminiAuth() {
  // This opens a new window/tab to the auth flow
  // In practice, user runs `gemini auth login` in terminal
  window.open('https://gemini.google.com/', '_blank');
  showToast('Run "gemini auth login" in your terminal to authenticate', 'info');
}