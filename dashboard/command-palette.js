// Command Palette - Global search and command interface
// Activated via ⌘K / Ctrl+K

const CommandPalette = (function() {
  let isOpen = false;
  let selectedIndex = 0;
  let filteredCommands = [];
  let commandList = [];

  // Define all available commands
  const COMMANDS = [
    // Navigation
    { id: 'nav-dashboard', title: 'Go to Dashboard', description: 'Mission Control overview', action: () => navigate('dashboard'), category: 'Navigation', icon: '📊', shortcut: '' },
    { id: 'nav-agents', title: 'Go to Agents', description: 'Agent roster and status', action: () => navigate('agents'), category: 'Navigation', icon: '🤖', shortcut: '' },
    { id: 'nav-skills', title: 'Go to Skills Hub', description: 'Browse and run skills', action: () => navigate('skills'), category: 'Navigation', icon: '⚡', shortcut: '' },
    { id: 'nav-kanban', title: 'Go to Kanban Board', description: 'Task management', action: () => navigate('kanban'), category: 'Navigation', icon: '📋', shortcut: '' },
    { id: 'nav-memory', title: 'Go to Memory', description: 'Shared brain context', action: () => navigate('memory'), category: 'Navigation', icon: '🧠', shortcut: '' },
    { id: 'nav-scheduler', title: 'Go to Scheduler', description: 'Automated workflows', action: () => navigate('scheduler'), category: 'Navigation', icon: '⏰', shortcut: '' },
    { id: 'nav-audit', title: 'Go to Audit Log', description: 'System activity trail', action: () => navigate('audit'), category: 'Navigation', icon: '📜', shortcut: '' },
    { id: 'nav-analytics', title: 'Go to Analytics', description: 'System telemetry', action: () => navigate('analytics'), category: 'Navigation', icon: '📈', shortcut: '' },
    { id: 'nav-workspace', title: 'Go to Workspace', description: 'AI outputs and artifacts', action: () => navigate('workspace'), category: 'Navigation', icon: '📁', shortcut: '' },
    { id: 'nav-plugins', title: 'Go to Plugins', description: 'Plugin marketplace', action: () => navigate('plugins'), category: 'Navigation', icon: '🔌', shortcut: '' },
    { id: 'nav-settings', title: 'Go to Settings', description: 'Configuration', action: () => navigate('settings'), category: 'Navigation', icon: '⚙️', shortcut: '' },
    { id: 'nav-goals', title: 'Go to Goals', description: 'Project targets', action: () => navigate('goals'), category: 'Navigation', icon: '🎯', shortcut: '' },
    { id: 'nav-journal', title: 'Go to Journal', description: 'Daily entries', action: () => navigate('journal'), category: 'Navigation', icon: '📔', shortcut: '' },
    { id: 'nav-boardroom', title: 'Go to Boardroom', description: 'CEO unified view', action: () => navigate('boardroom'), category: 'Navigation', icon: '🏢', shortcut: '' },

    // Agent Control Rooms
    { id: 'acr-opencode', title: 'Open OpenCode Control Room', description: 'Code & DevOps agent', action: () => navigate('agent-control-room/opencode'), category: 'Agents', icon: '🔧', shortcut: '' },
    { id: 'acr-hermes', title: 'Open Hermes Control Room', description: 'Memory & Scheduling agent', action: () => navigate('agent-control-room/hermes'), category: 'Agents', icon: '⚡', shortcut: '' },
    { id: 'acr-gemini', title: 'Open Gemini Control Room', description: 'Research & Analysis agent', action: () => navigate('agent-control-room/gemini'), category: 'Agents', icon: '🧠', shortcut: '' },
    { id: 'acr-claude', title: 'Open Claude Control Room', description: 'Strategy & Architecture agent', action: () => navigate('agent-control-room/claude'), category: 'Agents', icon: '🤖', shortcut: '' },
    { id: 'acr-codex', title: 'Open Codex Control Room', description: 'Code & CI/CD agent', action: () => navigate('agent-control-room/codex'), category: 'Agents', icon: '🐙', shortcut: '' },

    // Actions
    { id: 'action-run-skill', title: 'Run a Skill', description: 'Execute any skill with parameters', action: () => runQuickSkill(), category: 'Actions', icon: '▶', shortcut: '' },
    { id: 'action-add-task', title: 'Add Kanban Task', description: 'Create a new task', action: () => showAddKanbanTask(), category: 'Actions', icon: '➕', shortcut: '' },
    { id: 'action-add-goal', title: 'Add Goal', description: 'Create a new goal', action: () => { navigate('goals'); setTimeout(() => showAddGoal(), 100); }, category: 'Actions', icon: '🎯', shortcut: '' },
    { id: 'action-new-journal', title: 'New Journal Entry', description: 'Create today\'s entry', action: () => { navigate('journal'); setTimeout(() => showNewJournalEntry(), 100); }, category: 'Actions', icon: '📝', shortcut: '' },

    // System
    { id: 'sys-refresh', title: 'Refresh Agent Status', description: 'Check all agent connections', action: () => { if(window.gwRefreshStatus) window.gwRefreshStatus(); showToast('Agent status refreshed', 'success'); }, category: 'System', icon: '🔄', shortcut: '' },
    { id: 'sys-toggle-theme', title: 'Toggle Theme', description: 'Switch dark/light mode', action: () => toggleTheme(), category: 'System', icon: '🌙', shortcut: '' },
    { id: 'sys-toggle-sidebar', title: 'Toggle Sidebar', description: 'Collapse/expand navigation', action: () => toggleSidebar(), category: 'System', icon: '◀', shortcut: '' },
    { id: 'sys-clear-toasts', title: 'Clear Notifications', description: 'Dismiss all toasts', action: () => { const c = document.getElementById('toastContainer'); if(c) c.innerHTML = ''; }, category: 'System', icon: '🧹', shortcut: '' },

    // Development
    { id: 'dev-open-console', title: 'Open Browser Console', description: 'For debugging', action: () => console.log('Open DevTools (F12) to see console'), category: 'Development', icon: '🛠', shortcut: 'F12' },
    { id: 'dev-reload', title: 'Reload Page', description: 'Hard refresh the dashboard', action: () => window.location.reload(), category: 'Development', icon: '↻', shortcut: '' },
  ];

  function init() {
    commandList = COMMANDS;
    // Build the palette HTML
    const html = `
      <div id="commandPalette" class="command-palette-overlay" style="display:none;">
        <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette">
          <div class="cp-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" id="cpInput" placeholder="Type a command or search..." autocomplete="off" spellcheck="false">
            <kbd>⌘K</kbd>
          </div>
          <div class="cp-hint">Type to search, ↑↓ to navigate, Enter to execute, Esc to close</div>
          <div id="cpResults" class="cp-results" role="listbox"></div>
          <div id="cpGroups" class="cp-groups"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const overlay = document.getElementById('commandPalette');
    const input = document.getElementById('cpInput');
    const results = document.getElementById('cpResults');

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); selectNext(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectPrev(); }
      else if (e.key === 'Enter') { e.preventDefault(); executeSelected(); }
    });

    // Input handling
    input.addEventListener('input', (e) => filterCommands(e.target.value));
    input.addEventListener('focus', () => { if (!isOpen) open(); });

    // Click outside to close
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function open() {
    const overlay = document.getElementById('commandPalette');
    const input = document.getElementById('cpInput');
    overlay.style.display = 'flex';
    // Force reflow for animation
    overlay.offsetHeight;
    overlay.classList.add('open');
    isOpen = true;
    selectedIndex = 0;
    filteredCommands = [...commandList];
    renderResults('');
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }

  function close() {
    const overlay = document.getElementById('commandPalette');
    overlay.classList.remove('open');
    isOpen = false;
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
    document.getElementById('cpInput').value = '';
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function filterCommands(query) {
    if (!query.trim()) {
      filteredCommands = [...commandList];
    } else {
      const q = query.toLowerCase();
      filteredCommands = commandList.filter(cmd =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
      );
    }
    selectedIndex = 0;
    renderResults(query);
  }

  function renderResults(query) {
    const results = document.getElementById('cpResults');
    if (!results) return;

    if (filteredCommands.length === 0) {
      results.innerHTML = `<div class="cp-empty">No commands found for "${escapeHtml(query)}"</div>`;
      return;
    }

    // Group by category
    const groups = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });

    let html = '';
    let globalIndex = 0;
    for (const [category, cmds] of Object.entries(groups)) {
      html += `<div class="cp-group"><div class="cp-group-label">${escapeHtml(category)}</div><div class="cp-group-items">`;
      cmds.forEach((cmd, localIndex) => {
        const isSelected = globalIndex === selectedIndex;
        html += `
          <div class="cp-item ${isSelected ? 'selected' : ''}" data-index="${globalIndex}" role="option" aria-selected="${isSelected}">
            <span class="cp-icon">${cmd.icon}</span>
            <div class="cp-content">
              <span class="cp-title">${escapeHtml(cmd.title)}</span>
              <span class="cp-desc">${escapeHtml(cmd.description)}</span>
            </div>
            ${cmd.shortcut ? `<kbd class="cp-shortcut">${escapeHtml(cmd.shortcut)}</kbd>` : ''}
          </div>
        `;
        globalIndex++;
      });
      html += '</div></div>';
    }
    results.innerHTML = html;

    // Ensure selected item is visible
    const selected = results.querySelector('.cp-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  function selectNext() {
    if (filteredCommands.length === 0) return;
    selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    renderResults(document.getElementById('cpInput').value);
  }

  function selectPrev() {
    if (filteredCommands.length === 0) return;
    selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
    renderResults(document.getElementById('cpInput').value);
  }

  function executeSelected() {
    if (filteredCommands.length === 0) return;
    const cmd = filteredCommands[selectedIndex];
    close();
    try { cmd.action(); } catch (e) { console.error('Command error:', e); showToast('Command failed: ' + e.message, 'error'); }
  }

  return {
    init,
    toggle,
    open,
    close,
    isOpen: () => isOpen
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommandPalette.init());
} else {
  CommandPalette.init();
}

// Expose globally
window.CommandPalette = CommandPalette;