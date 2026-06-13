// Agent Plugin Marketplace — Per-agent plugin discovery, installation, and management
let pluginMarketplaceState = {
  allPlugins: [],
  filteredPlugins: [],
  activeAgent: 'opencode',
  searchQuery: '',
  categoryFilter: 'all',
  typeFilter: 'all',
  installedOnly: false,
};

const agentMetaPluginMarketplace = {
  opencode: { icon: '🔧', name: 'opencode', color: 'blue', desc: 'Code & DevOps' },
  hermes: { icon: '⚡', name: 'Hermes', color: 'purple', desc: 'Memory & Scheduling' },
  gemini: { icon: '🧠', name: 'Gemini CLI', color: 'green', desc: 'Research & Analysis' },
  claude: { icon: '🤖', name: 'Claude', color: 'orange', desc: 'Strategy & Architecture' },
};

async function renderAgentPluginMarketplace() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Plugin Marketplace</h1>
        <p class="page-subtitle">Discover, install, and manage plugins per agent</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="refreshPlugins()">🔄 Refresh</button>
        <button class="btn btn-ghost" onclick="showInstallPlugin()">+ Install Plugin</button>
      </div>
    </div>

    <!-- Agent Switcher -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <strong style="font-size:14px">Agent:</strong>
          <div class="agent-switcher" style="display:flex;gap:8px">
            ${Object.keys(agentMetaPluginMarketplace).map(key => `
              <button class="agent-switch-btn ${key === 'opencode' ? 'active' : ''}"
                      onclick="switchMarketplaceAgent('${key}')"
                      style="padding:8px 16px;border-radius:var(--radius);border:1px solid var(--border);background:${key === 'opencode' ? 'var(--accent-glow)' : 'var(--bg-card)'};color:${key === 'opencode' ? 'var(--accent)' : 'var(--text-primary)'};font-weight:600;cursor:pointer;transition:var(--transition)"
                      data-agent="${key}">
                ${agentMetaPluginMarketplace[key].icon} ${agentMetaPluginMarketplace[key].name}
              </button>
            `).join('')}
          </div>
          <div style="margin-left:auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <input class="form-input" id="pluginSearch" placeholder="Search plugins..." oninput="debouncePluginFilter()" style="max-width:220px">
            <select class="form-select" id="categoryFilter" onchange="applyPluginFilters()" style="width:auto;min-width:160px">
              <option value="all">All Categories</option>
            </select>
            <select class="form-select" id="typeFilter" onchange="applyPluginFilters()" style="width:auto;min-width:140px">
              <option value="all">All Types</option>
              <option value="skill">Skill</option>
              <option value="integration">Integration</option>
              <option value="utility">Utility</option>
              <option value="automation">Automation</option>
            </select>
            <label class="switch" style="margin:0" title="Show only installed">
              <input type="checkbox" id="installedOnlyFilter" onchange="applyPluginFilters()">
              <span class="switch-slider"></span>
            </label>
            <span style="font-size:12px;color:var(--text-muted)">Installed</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="card" style="margin-bottom:16px" id="pluginStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <!-- Plugin Grid -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Available Plugins</h3>
        <div style="font-size:12px;color:var(--text-muted)">
          <span id="pluginsVisible">0</span> / <span id="pluginsTotal">0</span> plugins
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div id="pluginsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;padding:16px">
          <div class="loading" style="grid-column:1/-1;text-align:center;padding:40px"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- Installed Plugins Section -->
    <div class="card mt-4">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Installed for ${agentMetaPluginMarketplace[pluginMarketplaceState.activeAgent]?.name || 'opencode'}</h3>
        <span class="badge" id="installedCount">0</span>
      </div>
      <div class="card-body" style="padding:0">
        <div id="installedPluginsList" style="padding:16px"></div>
      </div>
    </div>
  `;

  await loadAllPlugins();
}

async function loadAllPlugins() {
  try {
    // Load from skills directory + existing plugins registry
    const [skillsData, pluginsData] = await Promise.all([
      api.getSkills(),
      api.getPlugins(),
    ]);

    const skills = skillsData.skills || [];
    const registryPlugins = pluginsData.plugins || [];

    // Build unified plugin list
    pluginMarketplaceState.allPlugins = [];

    // Add skills as plugins
    for (const skill of skills) {
      const primary = skill.primary_agent || 'opencode';
      pluginMarketplaceState.allPlugins.push({
        name: skill.name,
        displayName: skill.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: 'skill',
        category: skill.category || 'general',
        primaryAgent: primary,
        agents: [primary],
        description: skill.description || '',
        version: skill.version || '1.0.0',
        author: skill.author || 'Agentic OS',
        hasEval: skill.has_learnings && skill.eval_criteria?.length > 0,
        latestScore: skill.scores?.[skill.scores.length - 1]?.score,
        source: 'skill',
        installed: registryPlugins.some(p => p.name === skill.name),
      });
    }

    // Add registry plugins that aren't skills
    for (const plugin of registryPlugins) {
      if (!skills.some(s => s.name === plugin.name)) {
        pluginMarketplaceState.allPlugins.push({
          name: plugin.name,
          displayName: plugin.name,
          type: plugin.type || 'plugin',
          category: plugin.category || 'utility',
          primaryAgent: plugin.agent || 'all',
          agents: plugin.agents || ['all'],
          description: plugin.description || '',
          version: plugin.version || '1.0.0',
          author: plugin.author || 'Unknown',
          hasEval: false,
          source: 'registry',
          installed: true,
        });
      }
    }

    buildCategoryFilter();
    applyPluginFilters();
  } catch (err) {
    showToast('Failed to load plugins: ' + err.message, 'error');
  }
}

function buildCategoryFilter() {
  const categories = [...new Set(pluginMarketplaceState.allPlugins.map(p => p.category || 'general'))].sort();
  const select = document.getElementById('categoryFilter');
  if (select) {
    const current = select.value;
    select.innerHTML = '<option value="all">All Categories</option>' + categories.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    select.value = current;
  }
}

function switchMarketplaceAgent(agentName) {
  pluginMarketplaceState.activeAgent = agentName;

  document.querySelectorAll('.agent-switch-btn').forEach(btn => {
    const isActive = btn.dataset.agent === agentName;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--accent-glow)' : 'var(--bg-card)';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--text-primary)';
  });

  // Update installed section header
  const installedHeader = document.querySelector('#installedPluginsList')?.previousElementSibling?.querySelector('h3');
  if (installedHeader) {
    installedHeader.textContent = 'Installed for ' + (agentMeta[agentName]?.name || agentName);
  }

  // Reset filters
  const searchEl = document.getElementById('pluginSearch');
  if (searchEl) searchEl.value = '';
  const catEl = document.getElementById('categoryFilter');
  if (catEl) catEl.value = 'all';
  const typeEl = document.getElementById('typeFilter');
  if (typeEl) typeEl.value = 'all';
  const instEl = document.getElementById('installedOnlyFilter');
  if (instEl) instEl.checked = false;

  applyPluginFilters();
}

let pluginFilterTimer = null;
function debouncePluginFilter() {
  clearTimeout(pluginFilterTimer);
  pluginFilterTimer = setTimeout(applyPluginFilters, 300);
}

function applyPluginFilters() {
  const search = document.getElementById('pluginSearch')?.value.toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || 'all';
  const type = document.getElementById('typeFilter')?.value || 'all';
  const installedOnly = document.getElementById('installedOnlyFilter')?.checked || false;
  const agent = pluginMarketplaceState.activeAgent;

  pluginMarketplaceState.searchQuery = search;
  pluginMarketplaceState.categoryFilter = category;
  pluginMarketplaceState.typeFilter = type;
  pluginMarketplaceState.installedOnly = installedOnly;

  let filtered = pluginMarketplaceState.allPlugins.filter(p => {
    // Agent compatibility
    if (!p.agents.includes(agent) && !p.agents.includes('all')) return false;
    if (category !== 'all' && (p.category || 'general') !== category) return false;
    if (type !== 'all' && p.type !== type) return false;
    if (installedOnly && !p.installed) return false;
    if (search) {
      const haystack = (p.name + ' ' + p.displayName + ' ' + (p.description || '') + ' ' + (p.category || '') + ' ' + (p.tags?.join(' ') || '')).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  pluginMarketplaceState.filteredPlugins = filtered;
  renderPluginStats();
  renderPluginsGrid();
  renderInstalledPlugins();
}

function renderPluginStats() {
  const container = document.getElementById('pluginStatsBar');
  if (!container) return;

  const total = pluginMarketplaceState.allPlugins.length;
  const agentTotal = pluginMarketplaceState.allPlugins.filter(p => p.agents.includes(pluginMarketplaceState.activeAgent) || p.agents.includes('all')).length;
  const filtered = pluginMarketplaceState.filteredPlugins.length;
  const installed = pluginMarketplaceState.allPlugins.filter(p => p.installed).length;
  const withEval = pluginMarketplaceState.filteredPlugins.filter(p => p.hasEval).length;

  // Category breakdown
  const cats = {};
  for (const p of pluginMarketplaceState.allPlugins) {
    const cat = p.category || 'general';
    cats[cat] = (cats[cat] || 0) + 1;
  }

  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px"><div style="display:flex;gap:24px"><div><strong>' + total + '</strong> <span style="color:var(--text-muted);font-size:12px">total</span></div><div><strong>' + agentTotal + '</strong> <span style="color:var(--text-muted);font-size:12px">' + pluginMarketplaceState.activeAgent + ' compatible</span></div><div><strong>' + filtered + '</strong> <span style="color:var(--text-muted);font-size:12px">filtered</span></div><div><strong>' + installed + '</strong> <span style="color:var(--text-muted);font-size:12px">installed</span></div><div><strong>' + withEval + '</strong> <span style="color:var(--text-muted);font-size:12px">with eval</span></div></div><div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">' + Object.entries(cats).map(function(_ref) {
    var cat = _ref[0];
    var count = _ref[1];
    return '<span class="badge" style="background:var(--accent-dim);color:var(--accent)">' + cat + ' (' + count + ')</span>';
  }).join('') + '</div></div>';

  document.getElementById('pluginsVisible').textContent = filtered;
  document.getElementById('pluginsTotal').textContent = total;
}

function renderPluginsGrid() {
  var container = document.getElementById('pluginsGrid');
  if (!container) return;

  if (pluginMarketplaceState.filteredPlugins.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:60px 20px"><div class="empty-state-icon">\uD83D\uDD0D</div><div class="empty-state-title">No plugins found</div><div class="empty-state-desc">Try adjusting your filters or search</div></div>';
    return;
  }

  container.innerHTML = pluginMarketplaceState.filteredPlugins.map(function(plugin) {
    var primary = plugin.primaryAgent || 'opencode';
    var meta = agentMetaPluginMarketplace[primary] || { icon: '\\uD83E\\uDD16', name: primary, color: 'accent' };
    var latestScore = plugin.latestScore;
    var hasEval = plugin.hasEval;
    var evalCount = plugin.eval_criteria?.length || 0;

    return '<div class="skill-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:var(--transition);' + (plugin.installed ? 'border-color:var(--green);' : '') + '" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'var(--shadow-lg)\'" onmouseout="this.style.borderColor=\'' + (plugin.installed ? 'var(--green)' : 'var(--border)') + '\';this.style.boxShadow=\'\'"><div style="padding:16px;border-bottom:1px solid var(--border);background:var(--bg-secondary);display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-weight:700;font-size:14px">' + escapeHtml(plugin.displayName) + '</span><span class="badge" style="background:var(--' + meta.color + '-dim);color:var(--' + meta.color + ');font-size:10px">' + meta.icon + ' ' + meta.name + '</span>' + (plugin.installed ? '<span class="badge badge-success" style="font-size:9px">\u2713 Installed</span>' : '') + (hasEval ? '<span class="badge badge-success" style="font-size:9px">Eval (' + evalCount + ')</span>' : '') + (latestScore !== undefined ? '<span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:9px">' + (latestScore * 100).toFixed(0) + '%</span>' : '') + '</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(plugin.category || 'general') + '</div></div></div><div style="padding:16px"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">' + escapeHtml(plugin.description || 'No description') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="installPlugin(\'" + plugin.name + "\')" ' + (plugin.installed ? 'disabled' : '') + ' style="flex:1;min-width:120px">' + (plugin.installed ? '\u2713 Installed' : 'Install') + '</button><button class="btn btn-ghost btn-sm" onclick="viewPluginDetails(\'" + plugin.name + "\')" style="flex:1;min-width:100px">Details</button>' + (hasEval ? '<button class="btn btn-ghost btn-sm" onclick="viewPluginEval(\'" + plugin.name + "\')" style="flex:1;min-width:100px">Eval</button>' : '') + (plugin.type === 'skill' ? '<button class="btn btn-primary btn-sm" onclick="runPlugin(\'" + plugin.name + "\')" style="flex:1;min-width:100px">Run</button>' : '') + '</div></div>';
  }).join('');
}

function renderInstalledPlugins() {
  var container = document.getElementById('installedPluginsList');
  if (!container) return;

  var activeAgent = pluginMarketplaceState.activeAgent;
  var installedPlugins = pluginMarketplaceState.allPlugins.filter(function(p) {
    return p.installed && (p.agents.includes(activeAgent) || p.agents.includes('all'));
  });

  var countEl = document.getElementById('installedCount');
  if (countEl) countEl.textContent = installedPlugins.length;

  // Update header
  var header = container.previousElementSibling?.querySelector('h3');
  if (header) {
    var meta = agentMetaPluginMarketplace[activeAgent] || { name: activeAgent };
    header.textContent = 'Installed for ' + meta.name;
  }

  if (installedPlugins.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;text-align:center"><div class="empty-state-icon">\uD83D\uDD0D</div><div class="empty-state-title">No plugins installed</div><div class="empty-state-desc">Install plugins from the marketplace above</div></div>';
    return;
  }

  container.innerHTML = installedPlugins.map(function(plugin) {
    return '<div class="skill-card" style="background:var(--bg-card);border:1px solid var(--green);border-radius:var(--radius);margin-bottom:12px;transition:var(--transition)" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'var(--shadow-lg)\'" onmouseout="this.style.borderColor=\'var(--green)\';this.style.boxShadow=\'\'"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-weight:600;font-size:13px">' + escapeHtml(plugin.displayName) + '</span>' + (plugin.hasEval ? '<span class="badge badge-success" style="font-size:9px">Eval</span>' : '') + (plugin.latestScore !== undefined ? '<span class="badge" style="background:var(--accent-dim);color:var(--accent);font-size:9px">' + (plugin.latestScore * 100).toFixed(0) + '%</span>' : '') + '</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + escapeHtml(plugin.description || 'No description') + '</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">Type: ' + plugin.type + ' \u00B7 Category: ' + escapeHtml(plugin.category || 'general') + '</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-danger btn-sm" onclick="uninstallPlugin(\'' + plugin.name + '\')" style="flex:1;min-width:100px">\uD83D\uDDD1 Uninstall</button><button class="btn btn-ghost btn-sm" onclick="viewPluginDetails(\'' + plugin.name + '\')" style="flex:1;min-width:100px">\uD83D\uDD0D Details</button>' + (plugin.hasEval ? '<button class="btn btn-ghost btn-sm" onclick="viewPluginEval(\'' + plugin.name + '\')" style="flex:1;min-width:100px">\uD83D\uDCCA Eval</button>' : '') + (plugin.type === 'skill' ? '<button class="btn btn-primary btn-sm" onclick="runPlugin(\'' + plugin.name + '\')" style="flex:1;min-width:100px">\u25B6 Run</button>' : '') + '</div></div>';
  }).join('');
}

async function installPlugin(pluginName) {
  var plugin = pluginMarketplaceState.allPlugins.find(function(p) { return p.name === pluginName; });
  if (!plugin) return;

  showToast('Installing ' + pluginName + '...', 'info');
  try {
    await api.installPlugin(pluginName);
    plugin.installed = true;
    applyPluginFilters();
    showToast(plugin.displayName + ' installed', 'success');
  } catch (err) {
    showToast('Install failed: ' + err.message, 'error');
  }
}

async function uninstallPlugin(pluginName) {
  if (!confirm('Uninstall ' + pluginName + '?')) return;
  try {
    var result = await api.uninstallPlugin(pluginName);
    var plugin = pluginMarketplaceState.allPlugins.find(function(p) { return p.name === pluginName; });
    if (plugin) {
      plugin.installed = false;
      applyPluginFilters();
      showToast(plugin.displayName + ' uninstalled', 'success');
    }
  } catch (err) {
    showToast('Uninstall failed: ' + err.message, 'error');
  }
}

async function viewPluginDetails(pluginName) {
  var plugin = pluginMarketplaceState.allPlugins.find(function(p) { return p.name === pluginName; });
  if (!plugin) return;

  showModal('Plugin: ' + plugin.displayName, '<div style="max-height:500px;overflow-y:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px"><div><strong>Type</strong><br>' + plugin.type + '</div><div><strong>Category</strong><br>' + escapeHtml(plugin.category || 'general') + '</div><div><strong>Primary Agent</strong><br>' + (plugin.primaryAgent || 'all') + '</div><div><strong>Compatible Agents</strong><br>' + plugin.agents.join(', ') + '</div><div><strong>Version</strong><br>' + (plugin.version || '1.0.0') + '</div><div><strong>Author</strong><br>' + escapeHtml(plugin.author || 'Unknown') + '</div><div><strong>Source</strong><br>' + plugin.source + '</div></div><div style="margin-bottom:16px"><strong>Description</strong><br><div style="white-space:pre-wrap;margin-top:8px">' + escapeHtml(plugin.description || 'No description') + '</div></div><div style="margin-bottom:16px"><strong>Eval Criteria</strong> (' + (plugin.eval_criteria?.length || 0) + ')<br>' + (plugin.eval_criteria?.map(function(c) { return '<div style="margin:4px 0"><strong>' + escapeHtml(c.name) + '</strong> (weight: ' + c.weight + ')</div>'; }).join('') || 'None') + '</div><div><strong>Score History</strong> (' + (plugin.scores?.length || 0) + ')<br>' + (plugin.scores?.map(function(s) { return '<div style="margin:2px 0;font-family:var(--font-mono)">' + escapeHtml(s.date) + ': ' + (s.score * 100).toFixed(0) + '%</div>'; }).join('') || 'None') + '</div>', '<button class="btn btn-ghost" onclick="closeModal()">Close</button>' + (!plugin.installed ? '<button class="btn btn-primary" onclick="closeModal(); installPlugin(\'' + plugin.name + '\')">\u2B07 Install</button>' : '') + (plugin.type === 'skill' ? '<button class="btn btn-primary" onclick="closeModal(); runPlugin(\'' + plugin.name + '\')">\u25B6 Run</button>' : '') + (plugin.hasEval ? '<button class="btn btn-ghost" onclick="closeModal(); viewPluginEval(\'' + plugin.name + '\')">\uD83D\uDCCA Eval</button>' : ''));
}

async function viewPluginEval(pluginName) {
  var plugin = pluginMarketplaceState.allPlugins.find(function(p) { return p.name === pluginName; });
  if (!plugin || plugin.source !== 'skill') return showToast('Eval only available for skills', 'warning');

  try {
    var data = await api.getSkillEval(pluginName);
    var scores = data.scores || [];

    showModal('Eval History: ' + pluginName, '<div style="max-height:400px;overflow-y:auto">' + (scores.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No eval scores yet</div></div>' : '<table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--border);text-align:left"><th style="padding:8px">Date</th><th style="padding:8px">Score</th></tr></thead><tbody>' + scores.map(function(s) { return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-family:var(--font-mono)">' + escapeHtml(s.date) + '</td><td style="padding:8px;font-weight:600">' + (s.score * 100).toFixed(1) + '%</td></tr>'; }).join('') + '</tbody></table>') + '</div>', '<button class="btn btn-ghost" onclick="closeModal()">Close</button>');
  } catch (err) {
    showToast('Failed to load eval: ' + err.message, 'error');
  }
}

async function runPlugin(pluginName) {
  showToast('Running ' + pluginName + '...', 'info');
  try {
    var result = await api.runSkill(pluginName, '', 'auto');
    showToast('\u2713 ' + pluginName + ' completed via ' + result.agent, 'success');

    showModal('Skill Result: ' + pluginName, '<div style="max-height:400px;overflow-y:auto;font-family:var(--font-mono);font-size:12px;line-height:1.6;white-space:pre-wrap">' + escapeHtml(result.output) + '</div>', '<button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal(); showToast(\'Add to chain from Skill Chains page\', \'info\')">Add to Chain</button>');
  } catch (err) {
    showToast('\u2717 ' + pluginName + ' failed: ' + err.message, 'error');
  }
}

function refreshPlugins() {
  loadAllPlugins();
}

// Expose globally
window.renderAgentPluginMarketplace = renderAgentPluginMarketplace;
window.switchMarketplaceAgent = switchMarketplaceAgent;
window.applyPluginFilters = applyPluginFilters;
window.installPlugin = installPlugin;
window.uninstallPlugin = uninstallPlugin;
window.viewPluginDetails = viewPluginDetails;
window.viewPluginEval = viewPluginEval;
window.runPlugin = runPlugin;
window.refreshPlugins = refreshPlugins;