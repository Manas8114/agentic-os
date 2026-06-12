// ─── utils.js — Agentic OS shared UI utilities ────────────────────────────────

// Fix #22: null guard so showToast never crashes if container is missing
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (['online', 'healthy', 'active', 'pass', 'ok'].includes(s)) return { bg: 'var(--green-dim)', dot: 'var(--green)', text: 'var(--green)' };
  if (['warning', 'warn', 'degraded'].includes(s)) return { bg: 'var(--yellow-dim)', dot: 'var(--yellow)', text: 'var(--yellow)' };
  if (['offline', 'error', 'fail', 'down'].includes(s)) return { bg: 'var(--red-dim)', dot: 'var(--red)', text: 'var(--red)' };
  return { bg: 'var(--bg-card)', dot: 'var(--text-muted)', text: 'var(--text-muted)' };
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', isCollapsed);
  const icon = sidebar.querySelector('.toggle-icon');
  if (icon) {
    icon.style.transform = isCollapsed ? 'rotate(180deg)' : '';
  }
}

// Fix #1: single canonical loadTheme (no duplicate below)
function loadTheme() {
  const html = document.documentElement;
  const current = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', current);
  const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
  if (sidebarCollapsed === 'true') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('collapsed');
      const icon = sidebar.querySelector('.toggle-icon');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }
}

// Fix #1: single canonical toggleTheme
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function showModal(title, bodyHtml, footerHtml) {
  const container = document.getElementById('modalContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;
}

function closeModal() {
  const c = document.getElementById('modalContainer');
  if (c) c.innerHTML = '';
}

function handleGlobalSearch(value) {
  if (value.length < 2) return;
  if (window.location.hash !== '#skills') navigate('skills');
}

// Fix #1: single canonical renderSkeleton
function renderSkeleton(count = 3) {
  return Array(count).fill(0).map(() =>
    `<div class="card"><div class="skeleton" style="height:20px;width:60%;margin-bottom:12px"></div><div class="skeleton" style="height:14px;width:90%;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:40%"></div></div>`
  ).join('');
}

// Fix #1: single canonical PAGE_TITLES declaration (was duplicated)
const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', breadcrumb: 'Overview' },
  skills: { title: 'Skills Hub', breadcrumb: 'Browse & execute skills' },
  memory: { title: 'Memory', breadcrumb: 'Shared brain context' },
  scheduler: { title: 'Scheduler', breadcrumb: 'Automated workflows' },
  audit: { title: 'Audit Log', breadcrumb: 'System activity trail' },
  cost: { title: 'Cost Analytics', breadcrumb: 'Usage & spending' },
  plugins: { title: 'Plugin Registry', breadcrumb: 'Manage plugins' },
  backups: { title: 'Backups', breadcrumb: 'Disaster recovery' },
  prompts: { title: 'Prompt Library', breadcrumb: 'Reusable templates' },
  standards: { title: 'Standards', breadcrumb: 'Project conventions' },
  settings: { title: 'Settings', breadcrumb: 'Configuration' },
  'setup-wizard': { title: 'Setup Wizard', breadcrumb: 'Guided configuration' },
  chat: { title: 'AI Chat', breadcrumb: 'Multi-agent terminal' },
  kanban: { title: 'Kanban Board', breadcrumb: 'Multi-agent task management' },
  goals: { title: 'Goals', breadcrumb: 'Project targets and progress' },
  journal: { title: 'Journal', breadcrumb: 'Daily entries and notes' },
  'agent-health': { title: 'Agent Health', breadcrumb: 'Real-time agent monitoring' },
  'smart-router': { title: 'Smart Router', breadcrumb: 'Task routing intelligence' },
  'learning-analytics': { title: 'Learning Analytics', breadcrumb: 'Skill improvement tracking' },
  'session-replay': { title: 'Session Replay', breadcrumb: 'Conversation history playback' },
  'skill-chain': { title: 'Skill Chains', breadcrumb: 'Multi-agent workflow execution' },
  'handoffs': { title: 'Handoffs', breadcrumb: 'Agent handoff tracking' },
  'agent-status-center': { title: 'Agent Status Center', breadcrumb: 'Unified real-time agent monitoring' },
  'conversation-view': { title: 'Conversation View', breadcrumb: 'Threaded multi-agent conversations' },
  'notification-center': { title: 'Notification Center', breadcrumb: 'Persistent notification history' },
  'agent-config': { title: 'Agent Config', breadcrumb: 'Per-agent configuration & skills' },
  'agent-skills-registry': { title: 'Agent Skills Registry', breadcrumb: 'Per-agent skills management' },
  'agent-kanban': { title: 'Agent Kanban', breadcrumb: 'Per-agent task board' },
  'agent-performance': { title: 'Agent Performance', breadcrumb: 'Real-time metrics, trends & cost per agent' },
  'agent-plugin-marketplace': { title: 'Plugin Marketplace', breadcrumb: 'Per-agent plugin discovery & management' },
  'semantic-search': { title: 'Semantic Search', breadcrumb: 'Vector-based semantic memory search' },
  'knowledge-graph': { title: 'Knowledge Graph', breadcrumb: 'Entity/relation extraction & visualization' },
  'context-injection': { title: 'Context Injection', breadcrumb: 'Auto-load relevant memory per task' },
  'voice-capture': { title: 'Voice Capture', breadcrumb: 'Push-to-talk STT and auto-summarization' },
  'timeline': { title: 'Unified Timeline', breadcrumb: 'Chronological browser of all events' },
  'memory-verification': { title: 'Memory Verification', breadcrumb: 'Health checks, initialization & repair' },
  'skill-library': { title: 'Skill Library', breadcrumb: 'Discover, organize, and manage skills with collections' },
  'studio': { title: 'Studio', breadcrumb: 'Multimodal content creation: images, video, prompts, assets' },
  'workflow-designer': { title: 'Workflow Designer', breadcrumb: 'Visual DAG editor for skill chains & multi-agent workflows' },
  'video-generator': { title: 'Video Generator', breadcrumb: 'Multi-provider video generation with job management' },
  'hermes-workspace': { title: 'Hermes Workspace V2', breadcrumb: 'Full control room: Chat · Memory · Skills · Inspector · Swarm' },
  'command-room': { title: 'Command Room', breadcrumb: 'Virtual office: Round-table · Grid · Office views' },
  'factory-idea-factory': { title: 'Idea Factory', breadcrumb: 'AI-powered idea generation & research' },
  'multi-agent-chat': { title: 'Agent Discussion', breadcrumb: 'Multi-agent collaborative chat' },
  'agent-control-room': { title: 'Agent Control Room', breadcrumb: 'Full agent configuration & control' },
};

window.AGENT_META = {
  opencode: { color: 'var(--blue)', icon: 'terminal', type: 'Code / DevOps' },
  hermes: { color: 'var(--accent)', icon: 'brain', type: 'Memory / System' },
  gemini: { color: 'var(--green)', icon: 'search', type: 'Research / Data' },
  codex: { color: 'var(--purple)', icon: 'code', type: 'Code / Agentic' },
  claude: { color: 'var(--orange)', icon: 'sparkle', type: 'Reasoning / Chat' },
  antigravity: { color: 'var(--cyan)', icon: 'telescope', type: 'Research / Discovery' },
  openclaw: { color: 'var(--red)', icon: 'spider', type: 'Orchestration' },
  odysseus: { color: 'var(--teal)', icon: 'compass', type: 'Planning / Research' },
  jarvis: { color: 'var(--yellow)', icon: 'mic', type: 'Voice / Executive' },
};

window.getAvailableModels = function() {
  return [
    { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (Anthropic)' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet (Anthropic)' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Anthropic)' },
    { id: 'google/gemini-pro', name: 'Gemini Pro (Google)' },
    { id: 'google/gemini-flash', name: 'Gemini Flash (Google)' },
    { id: 'meta/llama-3-70b-instruct', name: 'Llama 3 70B (Meta)' },
    { id: 'openrouter/owl-alpha', name: 'Owl Alpha (OpenRouter, Free)' },
  ];
};

// Fix #2: logout function — was missing, called from index.html
function logout() {
  localStorage.removeItem('agentic_os_token');
  localStorage.removeItem('agentic_os_user');
  window.location.reload();
}
