// Command Palette — Fuzzy search for actions, navigation, and quick commands
const CommandPalette = (function() {
  let isOpen = false;
  let selectedIndex = 0;
  let filteredCommands = [];
  let commands = [];
  let onCloseCallbacks = [];

  // Simple fuzzy matching algorithm
  function fuzzyMatch(query, text) {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  }

  function fuzzyScore(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let score = 0;
    let qi = 0;
    let lastMatch = -1;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) {
        // Bonus for consecutive matches
        if (i === lastMatch + 1) score += 2;
        else score += 1;
        // Bonus for start of word
        if (i === 0 || t[i-1] === ' ' || t[i-1] === '-' || t[i-1] === '_') score += 3;
        lastMatch = i;
        qi++;
      }
    }
    if (qi !== q.length) return 0;
    // Normalize by text length
    return score / Math.log(t.length + 1);
  }

  function registerCommand(cmd) {
    commands.push({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description || '',
      category: cmd.category || 'General',
      keywords: cmd.keywords || [],
      action: cmd.action,
      icon: cmd.icon || '▸',
      shortcut: cmd.shortcut,
    });
  }

  function buildDefaultCommands() {
    // Navigation commands
    const pages = [
      { id: 'dashboard', title: 'Dashboard', desc: 'System overview', icon: '◉', cat: 'Navigation', keywords: ['overview', 'home', 'status'] },
      { id: 'chat', title: 'AI Chat', desc: 'Multi-agent terminal', icon: '💬', cat: 'Navigation', keywords: ['terminal', 'talk', 'ask'] },
      { id: 'skills', title: 'Skills Hub', desc: 'Browse & execute skills', icon: '⚡', cat: 'Navigation', keywords: ['automation', 'run', 'execute'] },
      { id: 'memory', title: 'Memory', desc: 'Shared brain context', icon: '🧠', cat: 'Navigation', keywords: ['brain', 'context', 'notes'] },
      { id: 'scheduler', title: 'Scheduler', desc: 'Automated workflows', icon: '⏱', cat: 'Navigation', keywords: ['cron', 'jobs', 'schedule', 'automation'] },
      { id: 'audit', title: 'Audit Log', desc: 'System activity trail', icon: '📋', cat: 'Navigation', keywords: ['logs', 'history', 'activity'] },
      { id: 'kanban', title: 'Kanban Board', desc: 'Multi-agent task management', icon: '📌', cat: 'Navigation', keywords: ['tasks', 'board', 'project'] },
      { id: 'goals', title: 'Goals', desc: 'Project targets and progress', icon: '🎯', cat: 'Navigation', keywords: ['targets', 'objectives', 'okr'] },
      { id: 'journal', title: 'Journal', desc: 'Daily entries and notes', icon: '📓', cat: 'Navigation', keywords: ['diary', 'daily', 'notes'] },
      { id: 'skill-chain', title: 'Skill Chains', desc: 'Multi-agent workflow execution', icon: '⛓', cat: 'Navigation', keywords: ['chain', 'workflow', 'pipeline', 'handoff'] },
      { id: 'handoffs', title: 'Handoffs', desc: 'Agent handoff tracking', icon: '🔄', cat: 'Navigation', keywords: ['transfer', 'agent', 'multi-agent'] },
      { id: 'agent-health', title: 'Agent Health', desc: 'Real-time agent monitoring', icon: '🏥', cat: 'Navigation', keywords: ['health', 'monitor', 'status'] },
      { id: 'agent-status-center', title: 'Agent Status Center', desc: 'Unified real-time agent monitoring', icon: '📊', cat: 'Navigation', keywords: ['center', 'unified', 'activity', 'feed'] },
      { id: 'smart-router', title: 'Smart Router', desc: 'Task routing intelligence', icon: '🧭', cat: 'Navigation', keywords: ['route', 'suggest', 'which agent'] },
      { id: 'learning-analytics', title: 'Learning Analytics', desc: 'Skill improvement tracking', icon: '📊', cat: 'Navigation', keywords: ['analytics', 'skills', 'eval', 'scores'] },
      { id: 'session-replay', title: 'Session Replay', desc: 'Conversation history playback', icon: '🔄', cat: 'Navigation', keywords: ['replay', 'session', 'history'] },
      { id: 'cost', title: 'Cost Analytics', desc: 'Usage & spending', icon: '💰', cat: 'Navigation', keywords: ['cost', 'spending', 'budget', 'tokens'] },
      { id: 'plugins', title: 'Plugin Registry', desc: 'Manage plugins', icon: '🔌', cat: 'Navigation', keywords: ['plugin', 'extension', 'marketplace'] },
      { id: 'backups', title: 'Backups', desc: 'Disaster recovery', icon: '💾', cat: 'Navigation', keywords: ['backup', 'restore', 'disaster', 'recovery'] },
      { id: 'prompts', title: 'Prompt Library', desc: 'Reusable templates', icon: '📝', cat: 'Navigation', keywords: ['prompt', 'template', 'library'] },
      { id: 'standards', title: 'Standards', desc: 'Project conventions', icon: '📐', cat: 'Navigation', keywords: ['standards', 'conventions', 'rules'] },
      { id: 'settings', title: 'Settings', desc: 'Configuration', icon: '⚙', cat: 'Navigation', keywords: ['config', 'preferences', 'setup'] },
      { id: 'setup-wizard', title: 'Setup Wizard', desc: 'Guided configuration', icon: '🚀', cat: 'Navigation', keywords: ['wizard', 'onboard', 'configure'] },
    ];

    for (const p of pages) {
      registerCommand({
        id: `nav:${p.id}`,
        title: p.title,
        description: p.desc,
        category: p.cat,
        icon: p.icon,
        keywords: p.keywords,
        action: () => navigate(p.id),
      });
    }

    // Quick actions
    registerCommand({
      id: 'action:refresh-status',
      title: 'Refresh Agent Status',
      description: 'Force refresh all agent health checks',
      category: 'Actions',
      icon: '🔄',
      keywords: ['refresh', 'reload', 'update', 'health'],
      action: async () => {
        if (typeof updateAgentStatus === 'function') await updateAgentStatus();
        if (typeof refreshAgentHealth === 'function') await refreshAgentHealth();
        showToast('Agent status refreshed', 'success');
      },
    });

    registerCommand({
      id: 'action:run-heartbeat',
      title: 'Run Heartbeat Skill',
      description: 'Execute system health check',
      category: 'Actions',
      icon: '💓',
      keywords: ['heartbeat', 'health', 'check', 'skill'],
      action: async () => {
        try {
          await api.runSkill('heartbeat');
          showToast('Heartbeat completed', 'success');
        } catch (e) {
          showToast('Heartbeat failed: ' + e.message, 'error');
        }
      },
    });

    registerCommand({
      id: 'action:run-standup',
      title: 'Run Daily Standup',
      description: 'Generate morning briefing',
      category: 'Actions',
      icon: '☀️',
      keywords: ['standup', 'briefing', 'morning', 'daily'],
      action: async () => {
        try {
          await api.runSkill('daily-standup');
          showToast('Daily standup completed', 'success');
        } catch (e) {
          showToast('Standup failed: ' + e.message, 'error');
        }
      },
    });

    registerCommand({
      id: 'action:run-consolidation',
      title: 'Run Memory Consolidation',
      description: 'Weekly memory synthesis',
      category: 'Actions',
      icon: '🧠',
      keywords: ['memory', 'consolidation', 'synthesis', 'weekly'],
      action: async () => {
        try {
          await api.runSkill('memory-consolidation');
          showToast('Memory consolidation completed', 'success');
        } catch (e) {
          showToast('Consolidation failed: ' + e.message, 'error');
        }
      },
    });

    registerCommand({
      id: 'action:create-backup',
      title: 'Create Backup',
      description: 'Snapshot current state',
      category: 'Actions',
      icon: '💾',
      keywords: ['backup', 'snapshot', 'save'],
      action: async () => {
        try {
          await api.createBackup();
          showToast('Backup created', 'success');
        } catch (e) {
          showToast('Backup failed: ' + e.message, 'error');
        }
      },
    });

    registerCommand({
      id: 'action:toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between dark/light mode',
      category: 'Actions',
      icon: '🌓',
      keywords: ['theme', 'dark', 'light', 'mode'],
      shortcut: 'Ctrl+Shift+L',
      action: () => toggleTheme(),
    });

    registerCommand({
      id: 'action:toggle-sidebar',
      title: 'Toggle Sidebar',
      description: 'Collapse/expand navigation',
      category: 'Actions',
      icon: '◀',
      keywords: ['sidebar', 'collapse', 'nav', 'menu'],
      shortcut: 'Ctrl+B',
      action: () => toggleSidebar(),
    });

    registerCommand({
      id: 'action:new-chat',
      title: 'New AI Chat',
      description: 'Start conversation with agents',
      category: 'Actions',
      icon: '💬',
      keywords: ['chat', 'new', 'conversation', 'talk'],
      action: () => navigate('chat'),
    });

    registerCommand({
      id: 'action:new-task',
      title: 'Create Kanban Task',
      description: 'Add new task to board',
      category: 'Actions',
      icon: '➕',
      keywords: ['task', 'create', 'kanban', 'add'],
      action: () => {
        navigate('kanban');
        // Could trigger task creation modal
        setTimeout(() => {
          if (window.showAddTaskModal) window.showAddTaskModal();
        }, 100);
      },
    });

    registerCommand({
      id: 'action:new-goal',
      title: 'Create Goal',
      description: 'Set new project target',
      category: 'Actions',
      icon: '🎯',
      keywords: ['goal', 'create', 'target', 'objective'],
      action: () => {
        navigate('goals');
        setTimeout(() => {
          if (window.showAddGoalModal) window.showAddGoalModal();
        }, 100);
      },
    });

    registerCommand({
      id: 'action:journal-today',
      title: 'Open Today\'s Journal',
      description: 'Write today\'s entry',
      category: 'Actions',
      icon: '📓',
      keywords: ['journal', 'today', 'diary', 'entry'],
      action: () => {
        navigate('journal');
        const today = new Date().toISOString().split('T')[0];
        setTimeout(() => {
          if (window.openJournalEntry) window.openJournalEntry(today);
        }, 100);
      },
    });

    // Agent-specific commands
    const agents = ['opencode', 'hermes', 'gemini', 'claude'];
    for (const agent of agents) {
      registerCommand({
        id: `agent:chat-${agent}`,
        title: `Chat with ${agent}`,
        description: `Open chat with ${agent} agent`,
        category: 'Agents',
        icon: agent === 'opencode' ? '🔧' : agent === 'hermes' ? '⚡' : agent === 'gemini' ? '🧠' : '🤖',
        keywords: ['chat', 'talk', agent, 'agent'],
        action: () => {
          navigate('chat');
          // Could pre-select agent in chat
        },
      });
    }

    // Skill execution commands (dynamically loaded)
    registerCommand({
      id: 'skills:run-any',
      title: 'Run Any Skill...',
      description: 'Select and execute a skill',
      category: 'Skills',
      icon: '⚡',
      keywords: ['skill', 'run', 'execute', 'automation'],
      action: () => {
        navigate('skills');
      },
    });

    registerCommand({
      id: 'skills:run-chain',
      title: 'Run Skill Chain...',
      description: 'Execute multi-skill workflow',
      category: 'Skills',
      icon: '⛓',
      keywords: ['chain', 'workflow', 'pipeline', 'multi-skill'],
      action: () => {
        navigate('skill-chain');
      },
    });

    registerCommand({
      id: 'scheduler:new-job',
      title: 'Create Scheduled Job',
      description: 'Add new cron job',
      category: 'Scheduler',
      icon: '⏱',
      keywords: ['job', 'schedule', 'cron', 'create'],
      action: () => {
        navigate('scheduler');
        setTimeout(() => {
          if (window.showAddJob) window.showAddJob('single');
        }, 100);
      },
    });

    registerCommand({
      id: 'scheduler:new-chain-job',
      title: 'Create Skill Chain Job',
      description: 'Schedule multi-skill workflow',
      category: 'Scheduler',
      icon: '⛓',
      keywords: ['chain', 'schedule', 'cron', 'workflow'],
      action: () => {
        navigate('scheduler');
        setTimeout(() => {
          if (window.showAddJob) window.showAddJob('chain');
        }, 100);
      },
    });
  }

  function filterCommands(query) {
    if (!query) {
      filteredCommands = [...commands].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
      return filteredCommands;
    }

    filteredCommands = commands
      .map(cmd => {
        const searchText = `${cmd.title} ${cmd.description} ${cmd.keywords.join(' ')} ${cmd.category}`;
        const score = fuzzyScore(query, searchText);
        return { ...cmd, score };
      })
      .filter(cmd => cmd.score > 0)
      .sort((a, b) => b.score - a.score);
    return filteredCommands;
  }

  function render() {
    const container = document.getElementById('commandPalette');
    if (!container) return;

    const input = container.querySelector('.cmd-input');
    const query = input?.value || '';
    filterCommands(query);

    const list = container.querySelector('.cmd-list');
    if (!list) return;

    if (filteredCommands.length === 0) {
      list.innerHTML = `
        <div class="cmd-empty">
          <span class="cmd-empty-icon">🔍</span>
          <span>No commands found for "${escapeHtml(query)}"</span>
        </div>
      `;
      return;
    }

    // Group by category
    const grouped = {};
    for (const cmd of filteredCommands.slice(0, 20)) {
      if (!grouped[cmd.category]) grouped[cmd.category] = [];
      grouped[cmd.category].push(cmd);
    }

    let html = '';
    for (const [cat, cmds] of Object.entries(grouped)) {
      html += `<div class="cmd-category">${escapeHtml(cat)}</div>`;
      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        const isSelected = i === selectedIndex && Object.keys(grouped).indexOf(cat) === 0 && selectedIndex < cmds.length;
        // Calculate global index
        let globalIdx = 0;
        for (const [c, cs] of Object.entries(grouped)) {
          if (c === cat) break;
          globalIdx += cs.length;
        }
        globalIdx += i;
        const selected = globalIdx === selectedIndex ? 'selected' : '';
        html += `
          <div class="cmd-item ${selected}" data-index="${globalIdx}" data-action="${escapeHtml(cmd.id)}">
            <span class="cmd-icon">${cmd.icon}</span>
            <div class="cmd-info">
              <span class="cmd-title">${escapeHtml(cmd.title)}</span>
              ${cmd.description ? `<span class="cmd-desc">${escapeHtml(cmd.description)}</span>` : ''}
            </div>
            ${cmd.shortcut ? `<span class="cmd-shortcut">${escapeHtml(cmd.shortcut)}</span>` : ''}
          </div>
        `;
      }
    }
    list.innerHTML = html;

    // Scroll selected into view
    const selectedEl = list.querySelector('.cmd-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    selectedIndex = 0;

    // Create overlay if not exists
    let overlay = document.getElementById('commandPaletteOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'commandPaletteOverlay';
      overlay.className = 'cmd-overlay';
      overlay.innerHTML = `
        <div class="cmd-panel" id="commandPalette" role="dialog" aria-label="Command Palette">
          <div class="cmd-header">
            <svg class="cmd-search-icon" viewBox="0 0 24 24" width="18" height="18"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <input type="text" class="cmd-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false" aria-label="Command search">
            <span class="cmd-hint">⌘K</span>
          </div>
          <div class="cmd-list" role="listbox"></div>
          <div class="cmd-footer">
            <span class="cmd-count" id="cmdCount">0 commands</span>
            <span class="cmd-hint-nav">↑↓ Navigate • ⏎ Execute • Esc Close</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus input
    setTimeout(() => {
      const input = overlay.querySelector('.cmd-input');
      if (input) input.focus();
      filterCommands('');
      render();
    }, 10);

    // Event listeners
    overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeydown);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    selectedIndex = 0;

    const overlay = document.getElementById('commandPaletteOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', handleOverlayClick);
    }
    document.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';

    // Run close callbacks
    for (const cb of onCloseCallbacks) cb();
  }

  function handleOverlayClick(e) {
    if (e.target.id === 'commandPaletteOverlay') {
      close();
    }
  }

  function handleKeydown(e) {
    if (!isOpen) {
      // Global open shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        render();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        render();
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through results
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        render();
        break;
    }
  }

  function executeSelected() {
    const cmd = filteredCommands[selectedIndex];
    if (!cmd) return;

    try {
      if (typeof cmd.action === 'function') {
        const result = cmd.action();
        if (result && typeof result.then === 'function') {
          result.catch(err => showToast('Command failed: ' + err.message, 'error'));
        }
      }
      showToast(`Executed: ${cmd.title}`, 'success');
    } catch (err) {
      showToast('Command failed: ' + err.message, 'error');
    }
    close();
  }

  function onClose(cb) {
    onCloseCallbacks.push(cb);
  }

  // Initialize default commands
  buildDefaultCommands();

  // Public API
  return {
    open,
    close,
    registerCommand,
    onClose,
    getCommands: () => commands,
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Global shortcut listener (works even when palette closed)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      // Don't open if typing in input/textarea
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      e.preventDefault();
      CommandPalette.open();
    }
  });
});

// Expose globally
window.CommandPalette = CommandPalette;

// Helper for other modules to register commands
window.registerCommand = (cmd) => CommandPalette.registerCommand(cmd);