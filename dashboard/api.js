// Auth token helper - must be defined before api object since api.js loads before app.js
function getAuthHeaders() {
  let token = localStorage.getItem('agentic_os_token');
  if (token === 'null' || token === 'undefined') token = null;
  // If it's a JWT (has 3 parts separated by dots), use Bearer token
  if (token && token.split('.').length === 3) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return { 'X-API-Key': token || 'local-dev-key' };
}

const api = {
  async get(path) {
    const r = await fetch(path, { headers: { ...getAuthHeaders() } });
    if (!r.ok) {
      if (r.status === 401) {
        localStorage.removeItem('agentic_os_token');
        window.location.reload();
      }
      const e = await r.json().catch(() => ({})); 
      throw new Error(e.detail || `Request failed: ${r.status}`); 
    }
    return r.json();
  },
  async post(path, body = {}, controller) {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body) };
    if (controller) opts.signal = controller.signal;
    const r = await fetch(path, opts);
    if (!r.ok) {
      if (r.status === 401) {
        localStorage.removeItem('agentic_os_token');
        window.location.reload();
      }
      const e = await r.json().catch(() => ({})); 
      throw new Error(e.detail || `Request failed: ${r.status}`); 
    }
    return r.json();
  },
  async put(path, body = {}) {
    const r = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body) });
    if (!r.ok) {
      if (r.status === 401) {
        localStorage.removeItem('agentic_os_token');
        window.location.reload();
      }
      const e = await r.json().catch(() => ({})); 
      throw new Error(e.detail || `Request failed: ${r.status}`); 
    }
    return r.json();
  },
  async patch(path, body = {}) {
    const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body) });
    if (!r.ok) {
      if (r.status === 401) {
        localStorage.removeItem('agentic_os_token');
        window.location.reload();
      }
      const e = await r.json().catch(() => ({})); 
      throw new Error(e.detail || `Request failed: ${r.status}`); 
    }
    return r.json();
  },
  async del(path) {
    const r = await fetch(path, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    if (!r.ok) {
      if (r.status === 401) {
        localStorage.removeItem('agentic_os_token');
        window.location.reload();
      }
      const e = await r.json().catch(() => ({})); 
      throw new Error(e.detail || `Request failed: ${r.status}`); 
    }
    return r.json();
  },
  getStatus: () => api.get('/api/status'),
  getBrain: () => api.get('/api/brain'),
  getBrainFile: (name) => api.get(`/api/brain/${encodeURIComponent(name)}`),
  updateBrainFile: (name, content) => api.put(`/api/brain/${encodeURIComponent(name)}`, { content }),
  getSkills: () => api.get('/api/skills'),
  getSkill: (name) => api.get(`/api/skills/${encodeURIComponent(name)}`),
  runSkill: (name, input = '', agent = 'auto') => api.post(`/api/skills/${encodeURIComponent(name)}/run`, { input, agent }),
  getSkillEval: (name) => api.get(`/api/skills/${encodeURIComponent(name)}/eval`),
  getJobs: () => api.get('/api/scheduler/jobs'),
  createJob: (job) => api.post('/api/scheduler/jobs', job),
  deleteJob: (id) => api.del(`/api/scheduler/jobs/${encodeURIComponent(id)}`),
  getAudit: (limit = 100) => api.get(`/api/audit?limit=${limit}`),
  getCost: () => api.get('/api/cost'),
  recordCost: (data) => api.post('/api/cost/record', data),
  getPlugins: () => api.get('/api/plugins'),
  installPlugin: (name) => api.post('/api/plugins/install', { name }),
  uninstallPlugin: (name) => api.post('/api/plugins/uninstall', { name }),
  getBackups: () => api.get('/api/backup'),
  createBackup: () => api.post('/api/backup'),
  restoreBackup: (file) => api.post('/api/backup/restore', { file }),
  getPrompts: () => api.get('/api/prompts'),
  getSettings: () => api.get('/api/settings'),
  updateSettings: (settings) => api.put('/api/settings', { settings }),
  getStandards: () => api.get('/api/standards'),
  discoverStandards: () => api.post('/api/standards/discover'),
  chat: (agent, message, controller) => api.post('/api/chat/send', { agent, message }, controller),
  getChatHistory: (agent) => agent ? api.get(`/api/chat/history?agent=${encodeURIComponent(agent)}`) : api.get('/api/chat/history'),
  // Kanban
  getKanbanBoard: (status) => api.get(status ? `/api/kanban/board?status=${encodeURIComponent(status)}` : '/api/kanban/board'),
  getKanbanTask: (id) => api.get(`/api/kanban/tasks/${encodeURIComponent(id)}`),
  createKanbanTask: (data) => api.post('/api/kanban/tasks', data),
  updateKanbanTask: (id, data) => api.patch(`/api/kanban/tasks/${encodeURIComponent(id)}`, data),
  completeKanbanTask: (id, summary) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/complete`, { summary }),
  blockKanbanTask: (id, reason) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/block`, { reason }),
  unblockKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/unblock`, {}),
  addKanbanComment: (id, message) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/comments`, { message }),
  linkKanbanTasks: (parentId, childId) => api.post('/api/kanban/links', { parent_id: parentId, child_id: childId }),
  unlinkKanbanTasks: (parentId, childId) => api.del(`/api/kanban/links?parent_id=${encodeURIComponent(parentId)}&child_id=${encodeURIComponent(childId)}`),
  dispatchKanban: () => api.post('/api/kanban/dispatch', {}),
  specifyKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/specify`, {}),
  decomposeKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/decompose`, {}),
  // Goals
  getGoals: () => api.get('/api/goals'),
  createGoal: (data) => api.post('/api/goals', data),
  updateGoal: (id, data) => api.put(`/api/goals/${encodeURIComponent(id)}`, data),
  deleteGoal: (id) => api.del(`/api/goals/${encodeURIComponent(id)}`),
  // Journal
  getJournalEntries: () => api.get('/api/journal/entries'),
  getJournalEntry: (date) => api.get(`/api/journal/entries/${encodeURIComponent(date)}`),
  saveJournalEntry: (date, content) => api.put(`/api/journal/entries/${encodeURIComponent(date)}`, { content }),
  searchJournal: (query) => api.get(`/api/journal/search?q=${encodeURIComponent(query)}`),
  // Agent Health
  getAgentHealth: () => api.get('/api/agents/health'),
  getAgentStats: (name) => api.get(`/api/agents/${encodeURIComponent(name)}/stats`),
  refreshAgentHealth: () => api.post('/api/agents/health/refresh', {}),
  // Smart Router
  suggestRouter: (task) => api.post('/api/router/suggest', { task }),
  routeTask: (task, agent) => api.post('/api/router/route', { task, agent }),
  // Learning Analytics
  getSkillAnalytics: () => api.get('/api/analytics/skills'),
  getTrendAnalytics: () => api.get('/api/analytics/trends'),
  // Session Replay
    listSessions: () => api.get('/api/sessions/list'),
    getSessionReplay: (id) => api.get(`/api/sessions/${encodeURIComponent(id)}/replay`),
    // Handoff Protocol
    createHandoff: (data) => api.post('/api/handoffs', data),
    getHandoffs: (status) => api.get(status ? `/api/handoffs?status=${encodeURIComponent(status)}` : '/api/handoffs'),
    getHandoff: (id) => api.get(`/api/handoffs/${encodeURIComponent(id)}`),
    updateHandoff: (id, data) => api.patch(`/api/handoffs/${encodeURIComponent(id)}`, data),
    // Skill Chaining
    runSkillChain: (skills, initialInput = '', taskId) => api.post('/api/skills/chain', { skills, initial_input: initialInput, task_id: taskId }),
    // Skill Context
    getSkillContext: (name) => api.get(`/api/skills/${encodeURIComponent(name)}/context`),
    createSkillContext: (name, fileName, content) => api.post(`/api/skills/${encodeURIComponent(name)}/context`, { name: fileName, content }),
    getSkillContextFile: (name, fileName) => api.get(`/api/skills/${encodeURIComponent(name)}/context/${encodeURIComponent(fileName)}`),
    deleteSkillContextFile: (name, fileName) => api.del(`/api/skills/${encodeURIComponent(name)}/context/${encodeURIComponent(fileName)}`),
    // Agent Performance Analytics
    getAgentPerformanceSummary: () => api.get('/api/analytics/agents/summary'),
    getAgentTrends: (name) => api.get(`/api/analytics/agents/${encodeURIComponent(name)}/trends`),
    getAgentCostBreakdown: () => api.get('/api/analytics/agents/cost-breakdown'),
    // Semantic Memory
    indexMemory: (data) => api.post('/api/memory/index', data),
    searchMemory: (data) => api.post('/api/memory/search', data),
    reindexMemory: () => api.post('/api/memory/reindex'),
    getVectorStats: () => api.get('/api/memory/vector-stats'),
    // Knowledge Graph
    searchKnowledgeGraph: (data) => api.post('/api/knowledge-graph/search', data),
    getKnowledgeGraphStats: () => api.get('/api/knowledge-graph/stats'),
    reindexKnowledgeGraph: () => api.post('/api/knowledge-graph/reindex'),
    // Context Injection
    injectContext: (data) => api.post('/api/context/inject', data),
    getContextRules: () => api.get('/api/context/rules'),
    createContextRule: (data) => api.post('/api/context/rules', data),
    updateContextRule: (id, data) => api.patch(`/api/context/rules/${encodeURIComponent(id)}`, data),
    deleteContextRule: (id) => api.del(`/api/context/rules/${encodeURIComponent(id)}`),
    // OMI Voice Capture
    captureVoice: (data) => api.post('/api/voice/capture', data),
    getVoiceCaptures: (limit) => api.get(`/api/voice/captures?limit=${limit || 50}`),
    getVoiceCapture: (id) => api.get(`/api/voice/captures/${encodeURIComponent(id)}`),
    deleteVoiceCapture: (id) => api.del(`/api/voice/captures/${encodeURIComponent(id)}`),
    // Screen Activity & Timeline
    recordScreenActivity: (data) => api.post('/api/screen-activity/record', data),
    getScreenActivitySummary: (hours) => api.get(`/api/screen-activity/summary?hours=${hours || 24}`),
    getScreenActivityTimeline: (hours, limit) => api.get(`/api/screen-activity/timeline?hours=${hours || 24}&limit=${limit || 100}`),
    getUnifiedTimeline: (hours, limit) => api.get(`/api/timeline?hours=${hours || 168}&limit=${limit || 200}`),
    rebuildTimeline: () => api.post('/api/timeline/rebuild'),
    // Image/Video Generation
    generateImage: (data) => api.post('/api/image/generate', data),
    listImageModels: () => api.get('/api/image/models'),
    generateVideo: (data) => api.post('/api/video/generate', data),
    listVideoModels: () => api.get('/api/video/models'),
    getVideoJobStatus: (jobId) => api.get(`/api/video/job/${encodeURIComponent(jobId)}`),
    cancelVideoJob: (jobId) => api.post(`/api/video/job/${encodeURIComponent(jobId)}/cancel`),
    // Unified Agent Architecture
    listUnifiedAgents: () => api.get('/api/unified/agents'),
    getUnifiedAgent: (name) => api.get(`/api/unified/agents/${encodeURIComponent(name)}`),
    executeUnifiedAgent: (data) => api.post('/api/unified/agents/execute', data),
    getBestAgentForTask: (task) => api.post('/api/unified/agents/best-for-task', { task }),
    getAgentCapabilities: () => api.get('/api/unified/agents/capabilities'),
    executeSkillUnified: (agent, skill, input = '', subAgent = 'auto') => api.post(`/api/unified/agents/${encodeURIComponent(agent)}/skill`, { skill, input, agent: subAgent }),
    injectContextUnified: (agent, data) => api.post(`/api/unified/agents/${encodeURIComponent(agent)}/context/inject`, data),
    // Memory Verification
    verifyMemory: () => api.get('/api/memory/verification'),
    initializeMemory: (data) => api.post('/api/memory/initialize', data),
    repairMemory: () => api.post('/api/memory/repair'),
    // Profiles (V2)
    getProfiles: () => api.get('/api/profiles'),
    saveProfile: (data) => api.post('/api/profiles', data),
    deleteProfile: (name) => api.del(`/api/profiles/${encodeURIComponent(name)}`),
    // Command Room (V2)
    getCommandRoomOverview: () => api.get('/api/command-room/overview'),
    broadcastToAgents: (message) => api.post('/api/command-room/broadcast', { message }),
    // Swarm (V2)
    runSwarm: (data) => api.post('/api/swarm/run', data),
    };
