// Skill Library — Premium skill selection experience with collections, search, and management
let skillLibraryState = {
  allSkills: [],
  filteredSkills: [],
  categories: [],
  selectedCategory: 'all',
  searchQuery: '',
  viewMode: 'cards', // 'cards' | 'list' | 'collections'
  selectedCollection: null,
  activeSkill: null,
  sortBy: 'name', // 'name' | 'category' | 'usage' | 'last_used' | 'health'
  sortOrder: 'asc',
};

const SKILL_COLLECTIONS = {
  'seo-research': {
    name: '🔍 SEO Research',
    description: 'Web search, competitor analysis, keyword research, SERP tracking',
    skills: ['research-synthesis', 'web-search', 'content-analysis', 'competitor-analysis'],
    icon: '🔍',
    color: 'blue',
  },
  'content-creation': {
    name: '✍️ Content Creation',
    description: 'Blog writing, newsletter drafting, social media, copywriting',
    skills: ['content-draft', 'copywriting', 'blog-writing', 'newsletter', 'social-media'],
    icon: '✍️',
    color: 'green',
  },
  'software-engineering': {
    name: '💻 Software Engineering',
    description: 'Code generation, refactoring, testing, debugging, CI/CD',
    skills: ['code-generation', 'code-review', 'refactoring', 'testing', 'debugging', 'ci-cd'],
    icon: '💻',
    color: 'purple',
  },
  'operations': {
    name: '⚙️ Operations',
    description: 'Infrastructure, deployment, monitoring, backup, scheduling',
    skills: ['devops-audit', 'infrastructure', 'deployment', 'monitoring', 'backup', 'scheduling'],
    icon: '⚙️',
    color: 'orange',
  },
  'executive-assistant': {
    name: '📋 Executive Assistant',
    description: 'Scheduling, email, meeting notes, task management, reminders',
    skills: ['calendar', 'email-management', 'meeting-notes', 'task-management', 'reminders'],
    icon: '📋',
    color: 'blue',
  },
  'multi-agent-swarm': {
    name: '🤖 Multi-Agent Swarm',
    description: 'Agent coordination, handoffs, skill chains, parallel execution',
    skills: ['agent-coordination', 'handoff-protocol', 'skill-chains', 'parallel-execution', 'swarm-management'],
    icon: '🤖',
    color: 'purple',
  },
};

async function renderSkillLibrary() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Skill Library</h1>
        <p class="page-subtitle">Discover, organize, and manage skills with collections and presets</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="refreshSkills()">🔄 Refresh</button>
        <button class="btn btn-secondary" onclick="showCreateSkillModal()">➕ Create Skill</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <!-- Search -->
          <div style="flex:1;min-width:280px;position:relative">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)">🔍</span>
            <input type="text" id="skillSearchInput" class="form-input" placeholder="Search skills..." style="padding-left:40px;font-size:14px" oninput="debounceSkillSearch(this.value)">
          </div>
          
          <!-- Category Filter -->
          <select id="skillCategoryFilter" class="form-select" onchange="filterSkills()" style="width:auto;min-width:160px">
            <option value="all">All Categories</option>
          </select>
          
          <!-- Sort -->
          <select id="skillSortBy" class="form-select" onchange="sortSkills()" style="width:auto;min-width:140px">
            <option value="name">Sort: Name</option>
            <option value="category">Sort: Category</option>
            <option value="usage">Sort: Usage</option>
            <option value="last_used">Sort: Last Used</option>
            <option value="health">Sort: Health Score</option>
          </select>
          
          <!-- View Mode -->
          <div style="display:flex;gap:4px;background:var(--bg-secondary);padding:4px;border-radius:var(--radius)">
            <button class="view-btn" id="viewCards" onclick="setViewMode('cards')" title="Cards View">📋</button>
            <button class="view-btn" id="viewList" onclick="setViewMode('list')" title="List View">📝</button>
            <button class="view-btn" id="viewCollections" onclick="setViewMode('collections')" title="Collections View">📦</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="card" style="margin-bottom:16px" id="skillStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <!-- Main Content Area -->
    <div id="skillsContent">
      <!-- Cards View -->
      <div id="viewCardsContainer" style="display:none">
        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <h3 class="card-title">All Skills</h3>
            <div style="font-size:12px;color:var(--text-muted)">
              <span id="skillsVisibleCount">0</span> / <span id="skillsTotalCount">0</span> skills
            </div>
          </div>
          <div class="card-body" style="padding:0" id="skillsGrid"></div>
        </div>
      </div>

      <!-- List View -->
      <div id="viewListContainer" style="display:none">
        <div class="card" id="skillsListContainer"></div>
      </div>

      <!-- Collections View -->
      <div id="viewCollectionsContainer" style="display:none">
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><h3 class="card-title">Skill Collections</h3></div>
          <div class="card-body" style="padding:0" id="collectionsGrid"></div>
        </div>
        <div class="card" id="collectionSkillsContainer" style="display:none">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <h3 class="card-title" id="collectionTitle">Collection Skills</h3>
            <button class="btn btn-ghost btn-sm" onclick="showAllCollections()">← Back to Collections</button>
          </div>
          <div class="card-body" style="padding:0" id="collectionSkillsGrid"></div>
        </div>
      </div>
    </div>

    <!-- Skill Detail Modal -->
    <div id="skillDetailModal" style="display:none"></div>

    <!-- Create Skill Modal -->
    <div id="createSkillModal" style="display:none"></div>
  `;

  await loadAllSkills();
}

async function loadAllSkills() {
  try {
    const data = await api.getSkills();
    const skills = data.skills || [];
    
    // Enhance skills with additional metadata
    for (const skill of skills) {
      // Load learnings to get usage info
      const learnings = await api.getSkillContext(skill.name).catch(() => ({ context_files: [] }));
      skill.usage_count = learnings.context_files?.length || 0;
      skill.last_used = learnings.context_files?.[0]?.modified || '—';
      
      // Get eval score
      const evalData = await api.getSkillEval(skill.name).catch(() => ({ scores: [] }));
      skill.latest_score = evalData.scores?.[evalData.scores.length - 1]?.score || null;
      skill.health_score = skill.latest_score ? Math.round(skill.latest_score * 100) : 0;
    }
    
    skillLibraryState.allSkills = skills;
    
    // Build categories
    const cats = [...new Set(skills.map(s => s.category || 'general'))].sort();
    skillLibraryState.categories = cats;
    
    const catSelect = document.getElementById('skillCategoryFilter');
    if (catSelect) {
      catSelect.innerHTML = '<option value="all">All Categories</option>' + 
        cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    // Set default view
    setViewMode('cards');
  } catch (err) {
    showToast('Failed to load skills: ' + err.message, 'error');
  }
}

function setViewMode(mode) {
  skillLibraryState.viewMode = mode;
  
  const cardsContainer = document.getElementById('viewCardsContainer');
  const listContainer = document.getElementById('viewListContainer');
  const collectionsContainer = document.getElementById('viewCollectionsContainer');
  
  if (cardsContainer) cardsContainer.style.display = mode === 'cards' ? 'block' : 'none';
  if (listContainer) listContainer.style.display = mode === 'list' ? 'block' : 'none';
  if (collectionsContainer) collectionsContainer.style.display = mode === 'collections' ? 'block' : 'none';
  
  // Update active view button
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`view${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  renderSkills();
}

function debounceSkillSearch(value) {
  clearTimeout(skillLibraryState.searchTimer);
  skillLibraryState.searchTimer = setTimeout(() => {
    skillLibraryState.searchQuery = value.toLowerCase();
    filterSkills();
  }, 300);
}

function filterSkills() {
  const category = document.getElementById('skillCategoryFilter')?.value || 'all';
  skillLibraryState.selectedCategory = category;
  
  let filtered = skillLibraryState.allSkills.filter(skill => {
    if (category !== 'all' && (skill.category || 'general') !== category) return false;
    if (skillLibraryState.searchQuery) {
      const haystack = `${skill.name} ${skill.description || ''} ${skill.category || ''} ${skill.tags?.join(' ') || ''}`.toLowerCase();
      if (!haystack.includes(skillLibraryState.searchQuery)) return false;
    }
    return true;
  });
  
  skillLibraryState.filteredSkills = filtered;
  sortSkills();
}

function sortSkills() {
  const sortBy = document.getElementById('skillSortBy')?.value || 'name';
  skillLibraryState.sortBy = sortBy;
  
  skillLibraryState.filteredSkills.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'name':
        valA = a.name; valB = b.name; break;
      case 'category':
        valA = a.category || 'general'; valB = b.category || 'general'; break;
      case 'usage':
        valA = a.usage_count || 0; valB = b.usage_count || 0; break;
      case 'last_used':
        valA = new Date(a.last_used || 0).getTime(); valB = new Date(b.last_used || 0).getTime(); break;
      case 'health':
        valA = a.health_score || 0; valB = b.health_score || 0; break;
      default:
        valA = a.name; valB = b.name;
    }
    
    if (skillLibraryState.sortOrder === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });
  
  renderSkills();
}

function renderSkills() {
  // Update stats
  renderSkillStats();
  
  // Render based on view mode
  if (skillLibraryState.viewMode === 'cards') {
    renderSkillsGrid();
  } else if (skillLibraryState.viewMode === 'list') {
    renderSkillsList();
  } else if (skillLibraryState.viewMode === 'collections') {
    renderCollections();
  }
}

function renderSkillStats() {
  const container = document.getElementById('skillStatsBar');
  if (!container) return;
  
  const total = skillLibraryState.allSkills.length;
  const filtered = skillLibraryState.filteredSkills.length;
  const categories = skillLibraryState.categories.length;
  const withEval = skillLibraryState.allSkills.filter(s => s.latest_score !== null).length;
  const avgHealth = skillLibraryState.allSkills.length > 0 
    ? Math.round(skillLibraryState.allSkills.reduce((sum, s) => sum + (s.health_score || 0), 0) / skillLibraryState.allSkills.length) 
    : 0;
  
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
      <div style="display:flex;gap:24px">
        <div><strong>${total}</strong> <span style="color:var(--text-muted);font-size:12px">total</span></div>
        <div><strong>${filtered}</strong> <span style="color:var(--text-muted);font-size:12px">filtered</span></div>
        <div><strong>${categories}</strong> <span style="color:var(--text-muted);font-size:12px">categories</span></div>
        <div><strong>${withEval}</strong> <span style="color:var(--text-muted);font-size:12px">with eval</span></div>
        <div><strong>${avgHealth}%</strong> <span style="color:var(--text-muted);font-size:12px">avg health</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        ${skillLibraryState.categories.map(c => {
          const count = skillLibraryState.allSkills.filter(s => (s.category || 'general') === c).length;
          return `<span class="badge" style="background:var(--accent-dim);color:var(--accent)">${c} (${count})</span>`;
        }).join('')}
      </div>
    </div>
  `;
  
  document.getElementById('skillsVisibleCount').textContent = filtered;
  document.getElementById('skillsTotalCount').textContent = total;
}

function renderSkillsGrid() {
  const container = document.getElementById('skillsGrid');
  if (!container) return;
  
  if (skillLibraryState.filteredSkills.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:60px 20px;text-align:center"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No skills found</div><div class="empty-state-desc">Try adjusting your filters or search</div></div>';
    return;
  }
  
  container.innerHTML = skillLibraryState.filteredSkills.map(skill => {
    const healthColor = skill.health_score >= 80 ? 'green' : skill.health_score >= 50 ? 'yellow' : 'red';
    const enabled = skill.enabled !== false;
    
    return `
      <div class="skill-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:var(--transition);${enabled ? '' : 'opacity:0.7'}"
           onmouseover="this.style.borderColor='var(--accent)';this.style.boxShadow='var(--shadow-lg)'"
           onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''">
        <div style="padding:16px;border-bottom:1px solid var(--border);background:var(--bg-secondary);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:14px">${escapeHtml(skill.name)}</span>
              ${skill.health_score !== null ? `<span class="badge" style="background:var(--${healthColor}-dim);color:var(--${healthColor});font-size:10px">${skill.health_score}%</span>` : ''}
              <span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:10px">${skill.category || 'general'}</span>
              ${enabled ? '<span class="badge badge-success" style="font-size:9px">Enabled</span>' : '<span class="badge" style="font-size:9px">Disabled</span>'}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(skill.description || 'No description')}</div>
          </div>
        </div>
        <div style="padding:16px">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="toggleSkill('${skill.name}')" style="flex:1;min-width:100px">
              ${enabled ? '⏸️ Disable' : '▶️ Enable'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="viewSkillDetails('${skill.name}')" style="flex:1;min-width:100px">🔍 Details</button>
            <button class="btn btn-ghost btn-sm" onclick="editSkill('${skill.name}')" style="flex:1;min-width:100px">✏️ Edit</button>
            ${skill.has_learnings ? `<button class="btn btn-ghost btn-sm" onclick="viewSkillLearnings('${skill.name}')" style="flex:1;min-width:100px">📚 Learnings</button>` : ''}
            ${skill.eval_criteria?.length ? `<button class="btn btn-ghost btn-sm" onclick="viewSkillEval('${skill.name}')" style="flex:1;min-width:100px">📊 Eval</button>` : ''}
            <button class="btn btn-primary btn-sm" onclick="runSkill('${skill.name}')" style="flex:1;min-width:100px">▶️ Run</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSkillsList() {
  const container = document.getElementById('skillsListContainer');
  if (!container) return;
  
  if (skillLibraryState.filteredSkills.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No skills found</div></div>';
    return;
  }
  
  container.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border);text-align:left">
            <th style="padding:12px 16px;font-weight:600">Skill</th>
            <th style="padding:12px 16px;font-weight:600">Category</th>
            <th style="padding:12px 16px;font-weight:600">Health</th>
            <th style="padding:12px 16px;font-weight:600">Usage</th>
            <th style="padding:12px 16px;font-weight:600">Last Used</th>
            <th style="padding:12px 16px;font-weight:600">Status</th>
            <th style="padding:12px 16px;font-weight:600">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${skillLibraryState.filteredSkills.map(skill => {
            const healthColor = skill.health_score >= 80 ? 'green' : skill.health_score >= 50 ? 'yellow' : 'red';
            const enabled = skill.enabled !== false;
            return `
              <tr style="border-bottom:1px solid var(--border);${enabled ? '' : 'opacity:0.6'}">
                <td style="padding:12px 16px;font-weight:600">${escapeHtml(skill.name)}</td>
                <td style="padding:12px 16px"><span class="badge" style="background:var(--blue-dim);color:var(--blue)">${skill.category || 'general'}</span></td>
                <td style="padding:12px 16px">${skill.health_score !== null ? `
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                      <div style="width:${skill.health_score}%;height:100%;background:var(--${healthColor})"></div>
                    </div>
                    <span style="font-size:12px;font-family:var(--font-mono);color:var(--${healthColor})">${skill.health_score}%</span>
                  </div>
                ` : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="padding:12px 16px;font-family:var(--font-mono);font-size:12px">${skill.usage_count || 0}</td>
                <td style="padding:12px 16px;font-size:12px;color:var(--text-muted)">${skill.last_used}</td>
                <td style="padding:12px 16px">${enabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge">Disabled</span>'}</td>
                <td style="padding:12px 16px;display:flex;gap:8px">
                  <button class="btn btn-ghost btn-sm" onclick="viewSkillDetails('${skill.name}')">Details</button>
                  <button class="btn btn-${enabled ? 'danger' : 'success'} btn-sm" onclick="toggleSkill('${skill.name}')">${enabled ? 'Disable' : 'Enable'}</button>
                  <button class="btn btn-primary btn-sm" onclick="runSkill('${skill.name}')">Run</button>
                </td>
              </tr>
            `}).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCollections() {
  const container = document.getElementById('collectionsGrid');
  if (!container) return;
  
  container.innerHTML = Object.entries(SKILL_COLLECTIONS).map(([key, coll]) => {
    // Count how many skills in this collection exist
    const existingSkills = coll.skills.filter(s => skillLibraryState.allSkills.some(sk => sk.name === s)).length;
    const totalSkills = coll.skills.length;
    
    return `
      <div class="skill-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;transition:var(--transition);cursor:pointer"
           onmouseover="this.style.borderColor='var(--accent)';this.style.boxShadow='var(--shadow-lg)'"
           onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''"
           onclick="showCollection('${key}')">
        <div style="padding:20px;display:flex;gap:16px;align-items:center">
          <div style="width:60px;height:60px;border-radius:var(--radius);background:var(--${coll.color}-dim);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${coll.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:16px;color:var(--${coll.color})">${coll.name}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${escapeHtml(coll.description)}</div>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--text-muted)">
              <span>${existingSkills}/${totalSkills} skills available</span>
              <span style="font-family:var(--font-mono)">← Click to explore</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showCollection(key) {
  const coll = SKILL_COLLECTIONS[key];
  if (!coll) return;
  
  skillLibraryState.selectedCollection = key;
  
  document.getElementById('collectionsGrid').style.display = 'none';
  document.getElementById('collectionSkillsContainer').style.display = 'block';
  
  document.getElementById('collectionTitle').textContent = `${coll.icon} ${coll.name} — Skills`;
  
  const container = document.getElementById('collectionSkillsGrid');
  if (!container) return;
  
  const skills = coll.skills.map(sname => skillLibraryState.allSkills.find(s => s.name === sname)).filter(Boolean);
  
  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-title">No skills from this collection installed</div><div class="empty-state-desc">Install skills from the Skills Registry to use this collection</div></div>';
    return;
  }
  
  container.innerHTML = skills.map(skill => {
    const healthColor = skill.health_score >= 80 ? 'green' : skill.health_score >= 50 ? 'yellow' : 'red';
    const enabled = skill.enabled !== false;
    
    return `
      <div class="skill-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;transition:var(--transition)"
           onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="padding:16px;display:flex;gap:12px;align-items:flex-start">
          <div style="width:48px;height:48px;border-radius:var(--radius);background:var(--${coll.color}-dim);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${coll.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:600;font-size:14px">${escapeHtml(skill.name)}</span>
              ${skill.health_score !== null ? `<span class="badge" style="background:var(--${healthColor}-dim);color:var(--${healthColor});font-size:10px">${skill.health_score}%</span>` : ''}
              <span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:10px">${skill.category || 'general'}</span>
              ${enabled ? '<span class="badge badge-success" style="font-size:9px">Enabled</span>' : '<span class="badge" style="font-size:9px">Disabled</span>'}
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${escapeHtml(skill.description || 'No description')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="toggleSkill('${skill.name}')" style="flex:1;min-width:100px">${enabled ? '⏸️ Disable' : '▶️ Enable'}</button>
              <button class="btn btn-ghost btn-sm" onclick="viewSkillDetails('${skill.name}')" style="flex:1;min-width:100px">🔍 Details</button>
              <button class="btn btn-primary btn-sm" onclick="runSkill('${skill.name}')" style="flex:1;min-width:100px">▶️ Run</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showAllCollections() {
  skillLibraryState.selectedCollection = null;
  document.getElementById('collectionsGrid').style.display = 'block';
  document.getElementById('collectionSkillsContainer').style.display = 'none';
}

async function toggleSkill(skillName) {
  const skill = skillLibraryState.allSkills.find(s => s.name === skillName);
  if (!skill) return;
  
  const newStatus = skill.enabled === false;
  try {
    // This would need a backend endpoint - for now just toggle locally
    skill.enabled = newStatus;
    renderSkills();
    showToast(`${skillName} ${newStatus ? 'enabled' : 'disabled'}`, 'success');
  } catch (err) {
    showToast('Failed to toggle skill: ' + err.message, 'error');
  }
}

async function viewSkillDetails(skillName) {
  const skill = skillLibraryState.allSkills.find(s => s.name === skillName);
  if (!skill) return;
  
  try {
    const [learnings, evalData] = await Promise.all([
      api.getSkillContext(skillName).catch(() => ({ context_files: [] })),
      api.getSkillEval(skillName).catch(() => ({ scores: [], criteria: [] })),
    ]);
    
    const scores = evalData.scores || [];
    const criteria = evalData.criteria || [];
    
    showModal(`Skill: ${skill.name}`, `
      <div style="max-height:600px;overflow-y:auto">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div><strong>Category</strong><br>${skill.category || 'general'}</div>
          <div><strong>Version</strong><br>${skill.version || '1.0.0'}</div>
          <div><strong>Author</strong><br>${skill.author || 'Unknown'}</div>
          <div><strong>Status</strong><br><span class="badge ${skill.enabled !== false ? 'badge-success' : ''}">${skill.enabled !== false ? 'Enabled' : 'Disabled'}</span></div>
          <div><strong>Health Score</strong><br>${skill.health_score !== null ? skill.health_score + '%' : 'N/A'}</div>
          <div><strong>Usage Count</strong><br>${skill.usage_count || 0}</div>
          <div><strong>Last Used</strong><br>${skill.last_used || 'Never'}</div>
          <div><strong>Eval Criteria</strong><br>${criteria.length} criteria</div>
        </div>
        
        <div style="margin-bottom:16px"><strong>Description</strong><br><div style="white-space:pre-wrap;margin-top:8px">${escapeHtml(skill.description || 'No description')}</div></div>
        
        <div style="margin-bottom:16px"><strong>Tags</strong><br>${(skill.tags || []).map(t => '<code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;margin:2px;display:inline-block">' + escapeHtml(t) + '</code>').join(' ') || 'None'}</div>
        
        <div style="margin-bottom:16px"><strong>Eval Criteria</strong> (${criteria.length})<br>${criteria.map(c => `<div style="margin:4px 0"><strong>${escapeHtml(c.name)}</strong> (weight: ${c.weight}) - ${escapeHtml(c.description || '')}</div>`).join('') || 'None'}</div>
        
        <div style="margin-bottom:16px"><strong>Score History</strong> (${scores.length})<br>${scores.slice(-10).map(s => `<div style="margin:2px 0;font-family:var(--font-mono)">${escapeHtml(s.date)}: ${(s.score * 100).toFixed(0)}%</div>`).join('') || 'No scores yet'}</div>
        
        <div><strong>Recent Learnings</strong> (${learnings.context_files?.length || 0})<br>${learnings.context_files?.slice(0, 5).map(f => `<div style="margin:4px 0;font-size:12px"><strong>${f.name}</strong> - ${new Date(f.modified).toLocaleString()}</div>`).join('') || 'None'}</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal(); runSkill('${skill.name}')">▶️ Run</button>
      <button class="btn btn-${skill.enabled !== false ? 'danger' : 'success'}" onclick="closeModal(); toggleSkill('${skill.name}')">${skill.enabled !== false ? '⏸️ Disable' : '▶️ Enable'}</button>
      <button class="btn btn-ghost" onclick="closeModal(); editSkill('${skill.name}')">✏️ Edit</button>
      <button class="btn btn-ghost" onclick="closeModal(); viewSkillEval('${skill.name}')">📊 Eval</button>
      <button class="btn btn-ghost" onclick="closeModal(); viewSkillLearnings('${skill.name}')">📚 Learnings</button>
    `);
  } catch (err) {
    showToast('Failed to load skill details: ' + err.message, 'error');
  }
}

async function editSkill(skillName) {
  const skill = skillLibraryState.allSkills.find(s => s.name === skillName);
  if (!skill) return;
  
  showModal(`Edit Skill: ${skillName}`, `
    <div style="max-height:500px;overflow-y:auto">
      <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="editSkillName" value="${escapeHtml(skill.name)}" disabled></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="editSkillDesc" rows="4">${escapeHtml(skill.description || '')}</textarea></div>
      <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="editSkillCategory" value="${escapeHtml(skill.category || 'general')}"></div>
      <div class="form-group"><label class="form-label">Version</label><input class="form-input" id="editSkillVersion" value="${escapeHtml(skill.version || '1.0.0')}"></div>
      <div class="form-group"><label class="form-label">Tags (comma-separated)</label><input class="form-input" id="editSkillTags" value="${(skill.tags || []).join(', ')}"></div>
      <div class="form-group"><label class="switch"><input type="checkbox" id="editSkillEnabled" ${skill.enabled !== false ? 'checked' : ''}><span class="switch-slider"></span><span style="margin-left:8px">Enabled</span></label></div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveSkillEdit('${skillName}')">Save</button>
  `);
}

async function saveSkillEdit(skillName) {
  // This would need a backend endpoint
  showToast('Skill editing requires backend endpoint', 'info');
  closeModal();
}

async function viewSkillEval(skillName) {
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

async function viewSkillLearnings(skillName) {
  try {
    const data = await api.getSkillContext(skillName);
    const files = data.context_files || [];
    
    showModal(`Learnings: ${skillName}`, `
      <div style="max-height:500px;overflow-y:auto">
        ${files.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No learnings yet</div></div>' : `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${files.map(f => `<div class="card" style="padding:12px;cursor:pointer" onclick="closeModal(); showToast('Open learning file: ${f.name}', 'info')"><strong>${f.name}</strong><br><span style="font-size:12px;color:var(--text-muted)">${new Date(f.modified).toLocaleString()}</span></div>`).join('')}
        </div>
        `}
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    `);
  } catch (err) {
    showToast('Failed to load learnings: ' + err.message, 'error');
  }
}

async function runSkill(skillName) {
  showToast(`Running ${skillName}...`, 'info');
  try {
    const result = await api.runSkill(skillName, '', 'auto');
    showToast(`✓ ${skillName} completed via ${result.agent}`, 'success');
    
    showModal(`Skill Result: ${skillName}`, `
      <div style="max-height:400px;overflow-y:auto;font-family:var(--font-mono);font-size:12px;line-height:1.6;white-space:pre-wrap">${escapeHtml(result.output)}</div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal(); showToast('Add to chain from Skill Chains page', 'info')">Add to Chain</button>
    `);
  } catch (err) {
    showToast(`✗ ${skillName} failed: ${err.message}`, 'error');
  }
}

function showCreateSkillModal() {
  showModal('Create New Skill', `
    <div style="max-height:500px;overflow-y:auto">
      <div class="form-group"><label class="form-label">Skill Name (kebab-case)</label><input class="form-input" id="newSkillName" placeholder="my-new-skill"></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="newSkillDesc" rows="3" placeholder="What does this skill do?"></textarea></div>
      <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="newSkillCategory" value="general"></div>
      <div class="form-group"><label class="form-label">Tags (comma-separated)</label><input class="form-input" id="newSkillTags" placeholder="tag1, tag2, tag3"></div>
      <div class="form-group"><label class="form-label">Primary Agent</label><select class="form-select" id="newSkillAgent"><option value="opencode">opencode</option><option value="hermes">hermes</option><option value="gemini">gemini</option><option value="claude">claude</option><option value="auto">auto</option></select></div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createSkill()">Create</button>
  `);
}

async function createSkill() {
  // This would need a backend endpoint to create skill template
  showToast('Skill creation requires backend endpoint', 'info');
  closeModal();
}

function refreshSkills() {
  loadAllSkills();
}

window.renderSkillLibrary = renderSkillLibrary;
window.setViewMode = setViewMode;
window.filterSkills = filterSkills;
window.sortSkills = sortSkills;
window.debounceSkillSearch = debounceSkillSearch;
window.toggleSkill = toggleSkill;
window.viewSkillDetails = viewSkillDetails;
window.editSkill = editSkill;
window.viewSkillEval = viewSkillEval;
window.viewSkillLearnings = viewSkillLearnings;
window.runSkill = runSkill;
window.showCreateSkillModal = showCreateSkillModal;
window.createSkill = createSkill;
window.refreshSkills = refreshSkills;
window.showCollection = showCollection;
window.showAllCollections = showAllCollections;