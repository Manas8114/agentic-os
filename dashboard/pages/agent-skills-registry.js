// Agent Skills Registry — Per-agent skills management with filtering and execution
let skillsRegistryState = {
  allSkills: [],
  filteredSkills: [],
  activeAgent: 'opencode',
  searchQuery: '',
  categoryFilter: 'all',
  showOnlyWithEval: false,
};

const agentMetaSkillsRegistry = {
  opencode: { icon: '🔧', name: 'opencode', color: 'blue', desc: 'Code & DevOps' },
  hermes: { icon: '⚡', name: 'Hermes', color: 'purple', desc: 'Memory & Scheduling' },
  gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green', desc: 'Research & Analysis' },
  claude: { icon: '🤖', name: 'Claude', color: 'orange', desc: 'Strategy & Architecture' },
};

async function renderAgentSkillsRegistry() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Skills Registry</h1>
        <p class="page-subtitle">Browse, filter, and execute skills per agent</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="refreshSkills()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Agent Switcher -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <strong style="font-size:14px">Agent:</strong>
          <div class="agent-switcher" style="display:flex;gap:8px">
            ${Object.keys(agentMetaSkillsRegistry).map(key => `
              <button class="agent-switch-btn ${key === 'opencode' ? 'active' : ''}"
                      onclick="switchAgent('${key}')"
                      style="padding:8px 16px;border-radius:var(--radius);border:1px solid var(--border);background:${key === 'opencode' ? 'var(--accent-glow)' : 'var(--bg-card)'};color:${key === 'opencode' ? 'var(--accent)' : 'var(--text-primary)'};font-weight:600;cursor:pointer;transition:var(--transition)"
                      data-agent="${key}">
                ${agentMetaSkillsRegistry[key].icon} ${agentMetaSkillsRegistry[key].name}
              </button>
            `).join('')}
          </div>
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
            <label class="switch" style="margin:0" title="Show only skills with eval">
              <input type="checkbox" id="filterEval" onchange="toggleEvalFilter()">
              <span class="switch-slider"></span>
            </label>
            <span style="font-size:12px;color:var(--text-muted)">Eval Only</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:200px">
            <input type="text" id="skillsSearch" class="form-input" placeholder="Search skills by name or description..." oninput="debounceFilter()">
          </div>
          <select id="categoryFilter" class="form-select" onchange="applyFilters()" style="width:auto;min-width:180px">
            <option value="all">All Categories</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="card" style="margin-bottom:16px" id="skillsStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <!-- Skills Grid -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Skills</h3>
        <div style="font-size:12px;color:var(--text-muted)">
          <span id="skillsVisible">0</span> / <span id="skillsTotal">0</span> skills
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div id="skillsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;padding:16px">
          <div class="loading" style="grid-column:1/-1;text-align:center;padding:40px"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  await loadSkills();
}

async function loadSkills() {
  try {
    const data = await api.getSkills();
    skillsRegistryState.allSkills = data.skills || [];
    buildCategoryFilter();
    applyFilters();
  } catch (err) {
    showToast('Failed to load skills: ' + err.message, 'error');
    document.getElementById('skillsGrid').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red)">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

function buildCategoryFilter() {
  const categories = [...new Set(skillsRegistryState.allSkills.map(s => s.category || 'general'))].sort();
  const select = document.getElementById('categoryFilter');
  if (select) {
    const current = select.value;
    select.innerHTML = '<option value="all">All Categories</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = current;
  }
}

function switchAgent(agentName) {
  skillsRegistryState.activeAgent = agentName;
  
  // Update buttons
  document.querySelectorAll('.agent-switch-btn').forEach(btn => {
    const isActive = btn.dataset.agent === agentName;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--accent-glow)' : 'var(--bg-card)';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--text-primary)';
  });
  
  applyFilters();
}

function toggleEvalFilter() {
  skillsRegistryState.showOnlyWithEval = document.getElementById('filterEval')?.checked || false;
  applyFilters();
}

let filterTimer = null;
function debounceFilter() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(applyFilters, 300);
}

function applyFilters() {
  const search = document.getElementById('skillsSearch')?.value.toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || 'all';
  const showEval = skillsRegistryState.showOnlyWithEval;
  const agent = skillsRegistryState.activeAgent;

  skillsRegistryState.searchQuery = search;
  skillsRegistryState.categoryFilter = category;

  let filtered = skillsRegistryState.allSkills.filter(s => {
    const primary = (s.primary_agent || 'opencode').toLowerCase();
    if (primary !== agent.toLowerCase()) return false;
    if (category !== 'all' && (s.category || 'general') !== category) return false;
    if (showEval && (!s.has_learnings || !s.eval_criteria?.length)) return false;
    if (search) {
      const haystack = `${s.name} ${s.description || ''} ${s.tags?.join(' ') || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  skillsRegistryState.filteredSkills = filtered;
  renderStats();
  renderSkillsGrid();
}

function renderStats() {
  const container = document.getElementById('skillsStatsBar');
  const total = skillsRegistryState.allSkills.length;
  const agentTotal = skillsRegistryState.allSkills.filter(s => (s.primary_agent || 'opencode').toLowerCase() === skillsRegistryState.activeAgent).length;
  const filtered = skillsRegistryState.filteredSkills.length;
  const withEval = skillsRegistryState.filteredSkills.filter(s => s.has_learnings && s.eval_criteria?.length > 0).length;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
      <div style="display:flex;gap:24px">
        <div><strong>${total}</strong> <span style="color:var(--text-muted);font-size:12px">total skills</span></div>
        <div><strong>${agentTotal}</strong> <span style="color:var(--text-muted);font-size:12px">${skillsRegistryState.activeAgent} skills</span></div>
        <div><strong>${filtered}</strong> <span style="color:var(--text-muted);font-size:12px">filtered</span></div>
        <div><strong>${withEval}</strong> <span style="color:var(--text-muted);font-size:12px">with eval</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:11px">
        ${Object.entries(agentMeta).map(([key, meta]) => {
          const count = skillsRegistryState.allSkills.filter(s => (s.primary_agent || 'opencode').toLowerCase() === key).length;
          return `<span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color})" title="${meta.name}">${meta.icon} ${count}</span>`;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('skillsVisible').textContent = filtered;
  document.getElementById('skillsTotal').textContent = total;
}

function renderSkillsGrid() {
  const container = document.getElementById('skillsGrid');
  if (!container) return;

  if (skillsRegistryState.filteredSkills.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:60px 20px"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No skills found</div><div class="empty-state-desc">Try adjusting your filters or search</div></div>';
    return;
  }

  container.innerHTML = skillsRegistryState.filteredSkills.map(skill => {
    const primary = skill.primary_agent || 'opencode';
    const meta = agentMeta[primary] || { icon: '🤖', name: primary, color: 'accent' };
    const latestScore = skill.scores?.[skill.scores.length - 1]?.score;
    const hasEval = skill.has_learnings && skill.eval_criteria?.length > 0;
    const evalCount = skill.eval_criteria?.length || 0;

    return `
      <div class="skill-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:var(--transition)" 
           onmouseover="this.style.borderColor='var(--accent)';this.style.boxShadow='var(--shadow-lg)'"
           onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''">
        <div style="padding:16px;border-bottom:1px solid var(--border);background:var(--bg-secondary)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:700;font-size:14px">${escapeHtml(skill.name)}</span>
                <span class="badge" style="background:var(--${meta.color}-dim);color:var(--${meta.color});font-size:10px">${meta.icon} ${meta.name}</span>
                ${hasEval ? `<span class="badge badge-success" style="font-size:9px">Eval (${evalCount})</span>` : ''}
                ${latestScore !== undefined ? `<span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:9px">${(latestScore * 100).toFixed(0)}%</span>` : ''}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(skill.category || 'general')}</div>
            </div>
          </div>
        </div>
        <div style="padding:16px">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">${escapeHtml(skill.description || 'No description')}</div>
          
          ${skill.tags?.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
              ${skill.tags.slice(0, 5).map(t => `<span class="badge" style="background:var(--bg-input);color:var(--text-muted);font-size:9px">${escapeHtml(t)}</span>`).join('')}
              ${skill.tags.length > 5 ? `<span class="badge" style="background:var(--bg-input);color:var(--text-muted);font-size:9px">+${skill.tags.length - 5}</span>` : ''}
            </div>
          ` : ''}

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="runSkill('${skill.name}')" style="flex:1;min-width:120px">
              <span style="font-size:11px">▶</span> Run
            </button>
            <button class="btn btn-ghost btn-sm" onclick="viewSkillDetails('${skill.name}')" style="flex:1;min-width:120px">
              <span style="font-size:11px">🔍</span> Details
            </button>
            ${hasEval ? `<button class="btn btn-ghost btn-sm" onclick="viewEval('${skill.name}')" style="flex:1;min-width:100px">
              <span style="font-size:11px">📊</span> Eval
            </button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="viewLearnings('${skill.name}')" style="flex:1;min-width:100px">
              <span style="font-size:11px">📝</span> Learn
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function runSkill(skillName) {
  showToast(`Running ${skillName}...`, 'info');
  try {
    const result = await api.runSkill(skillName, '', 'auto');
    showToast(`✓ ${skillName} completed via ${result.agent}`, 'success');
    
    // Show result in modal
    showModal(`Skill Result: ${skillName}`, `
      <div style="max-height:400px;overflow-y:auto;font-family:var(--font-mono);font-size:12px;line-height:1.6;white-space:pre-wrap">${escapeHtml(result.output)}</div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal(); navigate('skill-chain'); showToast('Add to chain from Skill Chains page', 'info')">Add to Chain</button>
    `);
  } catch (err) {
    showToast(`✗ ${skillName} failed: ${err.message}`, 'error');
  }
}

async function viewSkillDetails(skillName) {
  try {
    const data = await api.getSkill(skillName);
    const skill = data.skill || data;
    
    showModal(`Skill: ${skillName}`, `
      <div style="max-height:500px;overflow-y:auto">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div><strong>Category</strong><br>${escapeHtml(skill.category || 'general')}</div>
          <div><strong>Primary Agent</strong><br>${escapeHtml(skill.primary_agent || 'opencode')}</div>
          <div><strong>Version</strong><br>${escapeHtml(skill.version || '1.0.0')}</div>
          <div><strong>Author</strong><br>${escapeHtml(skill.author || 'Agentic OS')}</div>
        </div>
        <div style="margin-bottom:16px"><strong>Description</strong><br><div style="white-space:pre-wrap;margin-top:8px">${escapeHtml(skill.description || 'No description')}</div></div>
        ${skill.tags?.length ? `<div style="margin-bottom:16px"><strong>Tags</strong><br>${skill.tags.map(t => `<span class="badge" style="margin:2px">${escapeHtml(t)}</span>`).join(' ')}</div>` : ''}
        <div style="margin-bottom:16px"><strong>Eval Criteria</strong> (${skill.eval_criteria?.length || 0})<br>${skill.eval_criteria?.map(c => `<div style="margin:4px 0"><strong>${escapeHtml(c.name)}</strong> (weight: ${c.weight})</div>`).join('') || 'None'}</div>
        <div><strong>Score History</strong> (${skill.scores?.length || 0})<br>${skill.scores?.map(s => `<div style="margin:2px 0;font-family:var(--font-mono)">${escapeHtml(s.date)}: ${(s.score * 100).toFixed(0)}%</div>`).join('') || 'None'}</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal(); runSkill('${skillName}')">▶ Run</button>
    `);
  } catch (err) {
    showToast('Failed to load details: ' + err.message, 'error');
  }
}

async function viewEval(skillName) {
  try {
    const data = await api.getSkillEval(skillName);
    const scores = data.scores || [];
    
    showModal(`Eval History: ${skillName}`, `
      <div style="max-height:400px;overflow-y:auto">
        ${scores.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No eval scores yet</div></div>' : `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border);text-align:left"><th style="padding:8px">Date</th><th style="padding:8px">Score</th></tr></thead>
          <tbody>
            ${scores.map(s => `<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-family:var(--font-mono)">${escapeHtml(s.date)}</td><td style="padding:8px;font-weight:600">${(s.score * 100).toFixed(1)}%</td></tr>`).join('')}
          </tbody>
        </table>
        `}
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    `);
  } catch (err) {
    showToast('Failed to load eval: ' + err.message, 'error');
  }
}

async function viewLearnings(skillName) {
  try {
    const skillsDir = window.location.origin + '/dashboard'; // Can't easily read learnings.md from frontend
    showModal(`Learnings: ${skillName}`, `
      <div style="color:var(--text-secondary);font-size:13px">
        <p>Learnings are stored in the skill's <code>learnings.md</code> file.</p>
        <p>View the full learnings log by opening the file in the skills directory, or run the skill to add a new entry.</p>
        <hr style="margin:16px 0;border-color:var(--border)">
        <strong>Recent entries would appear here from:</strong>
        <code style="display:block;margin:8px 0;padding:8px;background:var(--bg-input);border-radius:var(--radius)">${await getLearningsPreview(skillName)}</code>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    `);
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function getLearningsPreview(skillName) {
  // This would be loaded from the backend in a real implementation
  return 'skills/' + skillName + '/learnings.md';
}

function refreshSkills() {
  loadSkills();
}

window.renderAgentSkillsRegistry = renderAgentSkillsRegistry;
window.switchAgent = switchAgent;
window.toggleEvalFilter = toggleEvalFilter;
window.runSkill = runSkill;
window.viewSkillDetails = viewSkillDetails;
window.viewEval = viewEval;
window.viewLearnings = viewLearnings;
window.refreshSkills = refreshSkills;