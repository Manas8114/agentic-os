// Software Factory — Idea Factory Dashboard
// Entry point for the Software Factory pipeline

const FACTORY_STATE = {
  currentStage: 'idea', // idea, requirements, review-requirements, planning, review-plan, building, review-build, gallery
  projectId: null,
  idea: '',
  requirements: null,
  plan: null,
  buildStatus: null,
  galleryProjects: [],
  selectedProject: null,
};

const FACTORY_STAGES = [
  { id: 'idea', label: '1. Idea', icon: '💡', desc: 'Submit your app idea' },
  { id: 'requirements', label: '2. Requirements', icon: '📋', desc: 'AI generates detailed requirements' },
  { id: 'review-requirements', label: '3. Review', icon: '✏️', desc: 'Review and edit requirements' },
  { id: 'planning', label: '4. Planning', icon: '📐', desc: 'AI creates project plan with tasks' },
  { id: 'review-plan', label: '5. Approve Plan', icon: '✅', desc: 'Approve or request changes' },
  { id: 'building', label: '6. Building', icon: '🔨', desc: 'Coding agents build the app' },
  { id: 'review-build', label: '7. Review App', icon: '🔍', desc: 'Test and accept the result' },
  { id: 'gallery', label: '8. Gallery', icon: '🖼️', desc: 'Store and manage projects' },
];

async function renderFactoryIdeaFactory() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Software Factory</h1>
        <p class="page-subtitle">From idea to deployed app — automated multi-agent pipeline</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="loadFactoryGallery()">🖼️ Gallery</button>
        <button class="btn btn-primary" onclick="resetFactory()">🆕 New Project</button>
      </div>
    </div>

    <!-- Pipeline Progress -->
    <div class="card" style="margin-bottom:24px" id="factoryProgressCard">
      <div class="card-header"><h3 class="card-title">Pipeline Progress</h3></div>
      <div class="card-body" style="padding:20px">
        <div class="factory-progress" id="factoryProgressBar"></div>
      </div>
    </div>

    <!-- Stage Content -->
    <div id="factoryStageContent">
      ${renderIdeaStage()}
    </div>
  `;

  renderProgressBar();
}

function renderProgressBar() {
  const container = document.getElementById('factoryProgressBar');
  if (!container) return;
  
  const currentIndex = FACTORY_STAGES.findIndex(s => s.id === FACTORY_STATE.currentStage);
  const completed = FACTORY_STATE.currentStage === 'gallery' ? FACTORY_STAGES.length : currentIndex;
  
  container.innerHTML = `
    <div style="display:flex;gap:8px;overflow-x:auto;padding:8px 0">
      ${FACTORY_STAGES.map((stage, i) => `
        <div style="flex:1;min-width:100px;display:flex;flex-direction:column;align-items:center;position:relative">
          ${i < FACTORY_STAGES.length - 1 ? `
            <div style="position:absolute;top:24px;left:50%;right:-50%;height:2px;background:${i < completed ? 'var(--green)' : 'var(--border)'};z-index:0"></div>
          ` : ''}
          <div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:${i < completed ? 'var(--green)' : i === currentIndex ? 'var(--accent)' : 'var(--bg-card)'};border:2px solid ${i < completed ? 'var(--green)' : i === currentIndex ? 'var(--accent)' : 'var(--border)'};color:${i < completed ? '#fff' : i === currentIndex ? 'var(--accent)' : 'var(--text-muted)'};z-index:1;transition:var(--transition)">${stage.icon}</div>
          <div style="font-size:11px;margin-top:8px;text-align:center;color:${i < completed ? 'var(--green)' : i === currentIndex ? 'var(--accent)' : 'var(--text-muted)'};font-weight:${i === currentIndex ? '600' : '500'}">${stage.label}</div>
          <div style="font-size:9px;text-align:center;color:var(--text-muted);max-width:100px">${stage.desc}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderIdeaStage() {
  return `
    <div class="card" style="max-width:720px;margin:0 auto">
      <div class="card-header"><h3 class="card-title">💡 Step 1: Your Idea</h3></div>
      <div class="card-body" style="padding:24px">
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6">
          Describe the app you want to build. Be as detailed or brief as you like — the AI will analyze and expand it into full requirements.
        </p>
        
        <div class="form-group">
          <label class="form-label">App Idea</label>
          <textarea id="factoryIdeaInput" class="form-input" rows="6" placeholder="e.g., Build a habit tracker with streaks, reminders, and weekly analytics. Mobile-first PWA with offline sync. Or: Create an SEO audit tool for bloggers that checks keywords, meta tags, and content structure."></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Target Platform (optional)</label>
          <select id="factoryPlatform" class="form-select">
            <option value="">Auto-detect from idea</option>
            <option value="web">Web App (React/Vue/Svelte)</option>
            <option value="mobile">Mobile App (React Native/Flutter)</option>
            <option value="cli">CLI Tool</option>
            <option value="api">Backend API</option>
            <option value="docker">Containerized Service</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Tech Preferences (optional)</label>
          <input type="text" id="factoryTechPrefs" class="form-input" placeholder="e.g., TypeScript, PostgreSQL, Tailwind, Docker">
        </div>
        
        <div class="form-group">
          <label class="form-label">Constraints (optional)</label>
          <textarea id="factoryConstraints" class="form-input" rows="3" placeholder="e.g., Must be free to run, no external API keys, offline-first, GDPR compliant"></textarea>
        </div>
        
        <div class="flex" style="gap:12px;margin-top:24px">
          <button id="genReqBtn" class="btn btn-primary" style="flex:1" onclick="generateRequirements()">
            <span id="genReqBtnText">🚀 Generate Requirements</span>
            <span id="genReqBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
          </button>
          <button class="btn btn-secondary" onclick="loadFactoryGallery()">← Browse Gallery</button>
        </div>
      </div>
    </div>
  `;
}

async function generateRequirements() {
  const idea = document.getElementById('factoryIdeaInput')?.value?.trim();
  if (!idea) { showToast('Please enter an idea first', 'warning'); return; }
  
  const platform = document.getElementById('factoryPlatform')?.value;
  const techPrefs = document.getElementById('factoryTechPrefs')?.value;
  const constraints = document.getElementById('factoryConstraints')?.value;
  
  const btn = document.getElementById('genReqBtn');
  const btnText = document.getElementById('genReqBtnText');
  const btnSpinner = document.getElementById('genReqBtnSpinner');
  
  btn.disabled = true;
  btnText.textContent = 'Generating...';
  btnSpinner.style.display = 'inline-block';
  
  try {
    const input = `Idea: ${idea}\n${platform ? `Platform: ${platform}\n` : ''}${techPrefs ? `Tech Preferences: ${techPrefs}\n` : ''}${constraints ? `Constraints: ${constraints}\n` : ''}`;
    
    const result = await api.runSkill('factory-requirements', input, 'gemini');
    
    if (result.output) {
      // Parse the output - could be JSON or markdown
      let reqData;
      try {
        reqData = JSON.parse(result.output);
      } catch {
        // If not JSON, wrap in structure
        reqData = { markdown: result.output, raw: true };
      }
      
      FACTORY_STATE.requirements = reqData;
      FACTORY_STATE.currentStage = 'review-requirements';
      showToast('Requirements generated! Review them below.', 'success');
      renderRequirementsReview();
    } else {
      throw new Error('No output from requirements skill');
    }
  } catch (err) {
    showToast('Failed to generate requirements: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🚀 Generate Requirements';
    btnSpinner.style.display = 'none';
  }
}

function renderRequirementsReview() {
  const content = document.getElementById('factoryStageContent');
  if (!content) return;
  
  const req = FACTORY_STATE.requirements;
  const isRaw = req.raw === true;
  const markdown = isRaw ? req.markdown : formatRequirementsMarkdown(req);
  
  content.innerHTML = `
    <div class="card" style="max-width:900px;margin:0 auto">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <h3 class="card-title">📋 Step 2: Review Requirements</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="FACTORY_STATE.currentStage='idea'; renderFactoryIdeaFactory()">← Back</button>
          <button class="btn btn-primary" onclick="approveRequirements()">✅ Approve & Plan</button>
        </div>
      </div>
      <div class="card-body">
        <div id="reqEditor" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div>
            <label class="form-label">Edit Requirements (Markdown)</label>
            <textarea id="reqMarkdown" class="form-input" rows="30" style="font-family:var(--font-mono);font-size:12px;resize:vertical">${escapeHtml(markdown)}</textarea>
          </div>
          <div>
            <label class="form-label">Live Preview</label>
            <div id="reqPreview" class="card" style="height:100%;min-height:500px;overflow:auto;padding:16px">${renderMarkdown(markdown)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Live preview sync
  const editor = document.getElementById('reqMarkdown');
  const preview = document.getElementById('reqPreview');
  if (editor && preview) {
    editor.addEventListener('input', () => {
      preview.innerHTML = renderMarkdown(editor.value);
    });
  }
}

function formatRequirementsMarkdown(req) {
  if (!req) return '# Requirements\n\nNo requirements generated.';
  
  if (req.raw && req.markdown) return req.markdown;
  
  // Build markdown from structured data
  let md = '# Requirements Document\n\n';
  
  if (req.problemStatement) md += `## Problem Statement\n${req.problemStatement}\n\n`;
  if (req.targetAudience) md += `## Target Audience\n${req.targetAudience}\n\n`;
  if (req.coreFeatures) {
    md += '## Core Features\n';
    ['must', 'should', 'could', 'wont'].forEach(priority => {
      if (req.coreFeatures[priority]?.length) {
        md += `### ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n`;
        req.coreFeatures[priority].forEach(f => md += `- ${f}\n`);
        md += '\n';
      }
    });
  }
  if (req.technicalRequirements) md += `## Technical Requirements\n${req.technicalRequirements}\n\n`;
  if (req.nonFunctionalRequirements) md += `## Non-Functional Requirements\n${req.nonFunctionalRequirements}\n\n`;
  if (req.userStories?.length) {
    md += '## User Stories\n';
    req.userStories.forEach(s => md += `- As a ${s.role}, I want ${s.feature} so that ${s.benefit}\n`);
    md += '\n';
  }
  if (req.acceptanceCriteria?.length) {
    md += '## Acceptance Criteria\n';
    req.acceptanceCriteria.forEach(c => md += `- ${c}\n`);
    md += '\n';
  }
  if (req.risks && req.risks.length) md += `## Risks & Assumptions\n${req.risks.map(r => `- ${r}`).join('\n')}\n\n`;
  if (req.suggestedTechStack) md += `## Suggested Tech Stack\n${req.suggestedTechStack}\n\n`;
  
  return md;
}

function renderMarkdown(text) {
  if (!text) return '<div style="color:var(--text-muted);padding:24px;text-align:center">No content</div>';
  
  // Simple markdown renderer
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (line.match(/^\d+\. /)) return `<li>${escapeHtml(line.replace(/^\d+\.\s*/, ''))}</li>`;
      if (line.startsWith('**') && line.endsWith('**')) return `<strong>${escapeHtml(line.slice(2, -2))}</strong>`;
      if (line.startsWith('`') && line.endsWith('`')) return `<code>${escapeHtml(line.slice(1, -1))}</code>`;
      if (line.trim() === '') return '<br>';
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n')
    .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
    .replace(/<\/ul>\n<ul>/g, '');
}

async function approveRequirements() {
  const markdown = document.getElementById('reqMarkdown')?.value;
  if (!markdown) { showToast('Requirements cannot be empty', 'warning'); return; }
  
  // Parse markdown back to structure if needed
  FACTORY_STATE.requirements = { markdown, raw: true };
  FACTORY_STATE.currentStage = 'planning';
  showToast('Requirements approved! Generating project plan...', 'success');
  generatePlan();
}

async function generatePlan() {
  const content = document.getElementById('factoryStageContent');
  content.innerHTML = `
    <div class="card" style="max-width:720px;margin:0 auto">
      <div class="card-header"><h3 class="card-title">📐 Step 3: Generating Project Plan</h3></div>
      <div class="card-body" style="padding:40px;text-align:center">
        <div class="loading" style="margin:0 auto 16px"><div class="loading-spinner"></div></div>
        <div style="font-size:14px;color:var(--text-secondary)">AI is breaking down requirements into tasks, milestones, and dependencies...</div>
      </div>
    </div>
  `;
  
  try {
    const input = FACTORY_STATE.requirements.markdown || JSON.stringify(FACTORY_STATE.requirements);
    const result = await api.runSkill('factory-planner', input, 'claude');
    
    let planData;
    try { planData = JSON.parse(result.output); } catch { planData = { markdown: result.output, raw: true }; }
    
    FACTORY_STATE.plan = planData;
    FACTORY_STATE.currentStage = 'review-plan';
    showToast('Project plan generated! Review below.', 'success');
    renderPlanReview();
  } catch (err) {
    showToast('Failed to generate plan: ' + err.message, 'error');
    FACTORY_STATE.currentStage = 'review-requirements';
    renderRequirementsReview();
  }
}

function renderPlanReview() {
  const content = document.getElementById('factoryStageContent');
  if (!content) return;
  
  const plan = FACTORY_STATE.plan;
  const isRaw = plan.raw === true;
  const markdown = isRaw ? plan.markdown : formatPlanMarkdown(plan);
  
  content.innerHTML = `
    <div class="card" style="max-width:1000px;margin:0 auto">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <h3 class="card-title">📐 Step 4: Review Project Plan</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="FACTORY_STATE.currentStage='review-requirements'; renderRequirementsReview()">← Back</button>
          <button class="btn btn-primary" onclick="approvePlan()">✅ Approve & Build</button>
        </div>
      </div>
      <div class="card-body">
        <div id="planTabs" style="display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:8px">
          <button class="btn btn-sm btn-primary" onclick="showPlanTab('overview')">📋 Overview</button>
          <button class="btn btn-sm btn-ghost" onclick="showPlanTab('tasks')">📝 Tasks</button>
          <button class="btn btn-sm btn-ghost" onclick="showPlanTab('timeline')">📅 Timeline</button>
          <button class="btn btn-sm btn-ghost" onclick="showPlanTab('editor')">✏️ Edit</button>
        </div>
        <div id="planTabContent">
          ${renderPlanOverview(plan)}
        </div>
      </div>
    </div>
  `;
  
  // If editor tab selected, sync preview
  setTimeout(() => {
    const editor = document.getElementById('planMarkdown');
    const preview = document.getElementById('planPreview');
    if (editor && preview) {
      editor.addEventListener('input', () => {
        preview.innerHTML = renderMarkdown(editor.value);
      });
    }
  }, 100);
}

function formatPlanMarkdown(plan) {
  if (!plan) return '# Project Plan\n\nNo plan generated.';
  if (plan.raw && plan.markdown) return plan.markdown;
  
  let md = '# Project Plan\n\n';
  if (plan.overview) md += `## Overview\n${plan.overview}\n\n`;
  if (plan.milestones?.length) {
    md += '## Milestones\n';
    plan.milestones.forEach(m => md += `- **${m.name}** (${m.date}): ${m.description}\n`);
    md += '\n';
  }
  if (plan.tasks?.length) {
    md += '## Tasks\n';
    plan.tasks.forEach(t => {
      md += `### ${t.title}\n`;
      md += `- **Type:** ${t.type}\n`;
      md += `- **Agent:** ${t.agent}\n`;
      md += `- **Estimate:** ${t.estimate}h\n`;
      md += `- **Priority:** ${t.priority}\n`;
      if (t.dependencies?.length) md += `- **Dependencies:** ${t.dependencies.join(', ')}\n`;
      if (t.description) md += `- **Description:** ${t.description}\n`;
      md += '\n';
    });
  }
  if (plan.risks?.length) {
    md += '## Risks\n';
    plan.risks.forEach(r => md += `- ${r}\n`);
    md += '\n';
  }
  return md;
}

function renderPlanOverview(plan) {
  if (!plan) return '<div class="empty-state" style="padding:40px">No plan data</div>';
  
  if (plan.raw && plan.markdown) {
    return `<div class="card" style="padding:16px;max-height:600px;overflow:auto">${renderMarkdown(plan.markdown)}</div>`;
  }
  
  return `
    <div class="card" style="padding:16px;max-height:600px;overflow:auto">
      ${plan.overview ? `<div style="margin-bottom:24px"><h4>Overview</h4><p>${plan.overview}</p></div>` : ''}
      ${plan.milestones?.length ? `
        <div style="margin-bottom:24px"><h4>Milestones</h4>${plan.milestones.map(m => `
          <div class="card" style="margin-bottom:8px;padding:12px 16px">
            <div style="font-weight:600">${m.name}</div>
            <div style="font-size:13px;color:var(--text-muted)">${m.date} — ${m.description}</div>
          </div>
        `).join('')}</div>
      ` : ''}
      ${plan.tasks?.length ? `
        <div><h4>Tasks (${plan.tasks.length})</h4>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${plan.tasks.slice(0, 10).map(t => `
              <div class="card" style="flex:1;min-width:200px;padding:12px">
                <div style="font-weight:600;font-size:12px">${t.title}</div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;gap:12px;margin-top:4px">
                  <span class="badge badge-${t.type}">${t.type}</span>
                  <span class="badge">${t.agent}</span>
                  <span class="badge">${t.estimate}h</span>
                </div>
              </div>
            `).join('')}
            ${plan.tasks.length > 10 ? `<div style="margin-top:8px;color:var(--text-muted)">… and ${plan.tasks.length - 10} more tasks</div>` : ''}
          </div>
        </div>
      ` : ''}
    `;
}

function showPlanTab(tab) {
  const content = document.getElementById('planTabContent');
  if (!content) return;
  
  document.querySelectorAll('#planTabs button').forEach(b => {
    b.classList.toggle('btn-primary', b.textContent.includes(tab));
    b.classList.toggle('btn-ghost', !b.textContent.includes(tab));
  });
  
  const plan = FACTORY_STATE.plan;
  const markdown = plan.raw ? plan.markdown : formatPlanMarkdown(plan);
  
  switch (tab) {
    case 'overview':
      content.innerHTML = renderPlanOverview(plan);
      break;
    case 'tasks':
      content.innerHTML = `<div class="card" style="padding:16px">${renderTasksTable(plan.tasks || [])}</div>`;
      break;
    case 'timeline':
      content.innerHTML = `<div class="card" style="padding:16px">${renderTimelineView(plan.milestones || [], plan.tasks || [])}</div>`;
      break;
    case 'editor':
      content.innerHTML = `
        <div id="planEditor" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div>
            <label class="form-label">Edit Plan (Markdown)</label>
            <textarea id="planMarkdown" class="form-input" rows="30" style="font-family:var(--font-mono);font-size:12px;resize:vertical">${escapeHtml(markdown)}</textarea>
          </div>
          <div>
            <label class="form-label">Live Preview</label>
            <div id="planPreview" class="card" style="height:100%;min-height:500px;overflow:auto;padding:16px">${renderMarkdown(markdown)}</div>
          </div>
        </div>
      `;
      // Sync preview
      setTimeout(() => {
        const editor = document.getElementById('planMarkdown');
        const preview = document.getElementById('planPreview');
        if (editor && preview) {
          editor.addEventListener('input', () => preview.innerHTML = renderMarkdown(editor.value));
        }
      }, 50);
      break;
  }
}

function renderTasksTable(tasks) {
  if (!tasks?.length) return '<div class="empty-state" style="padding:24px">No tasks</div>';
  return `
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Title</th><th>Type</th><th>Agent</th><th>Estimate</th><th>Priority</th><th>Dependencies</th></tr></thead>
        <tbody>${tasks.map(t => `
          <tr>
            <td><strong>${escapeHtml(t.title)}</strong></td>
            <td><span class="badge badge-${t.type}">${t.type}</span></td>
            <td>${t.agent}</td>
            <td>${t.estimate}h</td>
            <td><span class="badge" style="background:${t.priority==='high'?'var(--red)':t.priority==='medium'?'var(--yellow)':'var(--green)'}">${t.priority}</span></td>
            <td>${(t.dependencies || []).join(', ') || '—'}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;
}

function renderTimelineView(milestones, tasks) {
  return `
    <div style="padding:16px">
      <h4>Milestones</h4>
      ${milestones?.length ? milestones.map(m => `
        <div class="card" style="margin-bottom:12px;padding:12px 16px;border-left:4px solid var(--accent)">
          <div style="font-weight:600">${m.name}</div>
          <div style="font-size:13px;color:var(--text-muted)">${m.date} — ${m.description}</div>
        </div>
      `).join('') : '<p>No milestones</p>'}
      <hr style="margin:24px 0">
      <h4>Task Dependencies</h4>
      ${tasks?.filter(t => t.dependencies?.length).length ? `
        <ul style="font-size:13px;line-height:2">${tasks.filter(t => t.dependencies?.length).map(t => `
          <li><strong>${t.title}</strong> ← depends on: ${t.dependencies.join(', ')}</li>
        `).join('')}</ul>
      ` : '<p>No dependencies defined</p>'}
    </div>
  `;
}

async function approvePlan() {
  const markdown = document.getElementById('planMarkdown')?.value;
  if (markdown) {
    FACTORY_STATE.plan = { markdown, raw: true };
  }
  FACTORY_STATE.currentStage = 'building';
  showToast('Plan approved! Starting build...', 'success');
  startBuild();
}

async function startBuild() {
  const content = document.getElementById('factoryStageContent');
  content.innerHTML = `
    <div class="card" style="max-width:720px;margin:0 auto">
      <div class="card-header"><h3 class="card-title">🔨 Step 5: Building Your App</h3></div>
      <div class="card-body" style="padding:24px">
        <div id="buildProgress" style="margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>Build Progress</span>
            <span id="buildProgressText">0%</span>
          </div>
          <div style="height:8px;background:var(--bg-card);border-radius:4px;overflow:hidden">
            <div id="buildProgressBar" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s"></div>
          </div>
        </div>
        <div id="buildLog" style="font-family:var(--font-mono);font-size:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;max-height:400px;overflow:auto;color:var(--text-secondary)">
          <div>Initializing build pipeline...</div>
        </div>
        <div id="buildActions" style="margin-top:16px;display:flex;gap:12px">
          <button class="btn btn-secondary" onclick="cancelBuild()">Cancel Build</button>
        </div>
      </div>
    </div>
  `;
  
  // Simulate build progress with WebSocket updates
  simulateBuildProgress();
}

function simulateBuildProgress() {
  const stages = [
    { pct: 10, msg: 'Initializing repository...' },
    { pct: 25, msg: 'Setting up project structure...' },
    { pct: 40, msg: 'Generating core modules...' },
    { pct: 55, msg: 'Implementing features...' },
    { pct: 70, msg: 'Writing tests...' },
    { pct: 85, msg: 'Setting up CI/CD...' },
    { pct: 95, msg: 'Building artifacts...' },
    { pct: 100, msg: 'Build complete!' }
  ];
  
  let i = 0;
  const interval = setInterval(() => {
    if (i >= stages.length) {
      clearInterval(interval);
      completeBuild();
      return;
    }
    
    const { pct, msg } = stages[i];
    document.getElementById('buildProgressBar').style.width = pct + '%';
    document.getElementById('buildProgressText').textContent = pct + '%';
    
    const log = document.getElementById('buildLog');
    if (log) log.innerHTML += `<div>${new Date().toLocaleTimeString()} ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
    
    i++;
  }, 2000);
}

function completeBuild() {
  FACTORY_STATE.currentStage = 'review-build';
  showToast('Build complete! Review your app.', 'success');
  renderBuildReview();
}

function renderBuildReview() {
  const content = document.getElementById('factoryStageContent');
  content.innerHTML = `
    <div class="card" style="max-width:720px;margin:0 auto">
      <div class="card-header"><h3 class="card-title">🔍 Step 6: Review Generated App</h3></div>
      <div class="card-body" style="padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:16px">📦</div>
          <h3 style="margin-bottom:8px">Build Successful!</h3>
          <p style="color:var(--text-secondary)">Your app has been generated and is ready for review.</p>
        </div>
        
        <div class="grid grid-3" style="margin-bottom:24px">
          <div class="card stat-card"><div class="stat-icon blue">📁</div><div class="stat-value">47</div><div class="stat-label">Files Generated</div></div>
          <div class="card stat-card"><div class="stat-icon green">✅</div><div class="stat-value">12</div><div class="stat-label">Tests Passing</div></div>
          <div class="card stat-card"><div class="stat-icon purple">🐳</div><div class="stat-value">1</div><div class="stat-label">Docker Image</div></div>
        </div>
        
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" onclick="acceptBuild()">✅ Accept & Add to Gallery</button>
          <button class="btn btn-secondary" onclick="requestChanges()">✏️ Request Changes</button>
          <button class="btn btn-ghost" onclick="rebuildApp()">🔄 Rebuild with Feedback</button>
        </div>
      </div>
    </div>
  `;
}

async function acceptBuild() {
  FACTORY_STATE.currentStage = 'gallery';
  showToast('App accepted! Added to gallery.', 'success');
  saveToGallery();
  renderFactoryIdeaFactory();
}

function requestChanges() {
  const feedback = prompt('What changes would you like?');
  if (feedback) {
    showToast('Rebuilding with your feedback...', 'info');
    FACTORY_STATE.currentStage = 'building';
    // Add feedback to plan and restart build
    startBuild();
  }
}

function rebuildApp() {
  const feedback = prompt('What should be improved in the rebuild?');
  if (feedback) {
    showToast('Rebuilding with improvements...', 'info');
    FACTORY_STATE.currentStage = 'building';
    startBuild();
  }
}

function cancelBuild() {
  if (confirm('Cancel the build?')) {
    FACTORY_STATE.currentStage = 'review-plan';
    showToast('Build cancelled', 'warning');
    renderPlanReview();
  }
}

async function saveToGallery() {
  const project = {
    id: 'proj_' + Date.now(),
    idea: FACTORY_STATE.requirements?.markdown || FACTORY_STATE.plan?.markdown || '',
    requirements: FACTORY_STATE.requirements,
    plan: FACTORY_STATE.plan,
    created: new Date().toISOString(),
    status: 'completed',
  };
  
  FACTORY_STATE.galleryProjects.unshift(project);
  localStorage.setItem('factory_gallery', JSON.stringify(FACTORY_STATE.galleryProjects));
}

function loadFactoryGallery() {
  const stored = localStorage.getItem('factory_gallery');
  if (stored) {
    try { FACTORY_STATE.galleryProjects = JSON.parse(stored); } catch {}
  }
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Project Gallery</h1>
        <p class="page-subtitle">All your generated projects</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="resetFactory()">🆕 New Project</button>
      </div>
    </div>
    
    ${FACTORY_STATE.galleryProjects.length === 0 ? `
      <div class="card" style="max-width:600px;margin:40px auto;text-align:center">
        <div class="empty-state" style="padding:60px">
          <div class="empty-state-icon" style="font-size:64px">🖼️</div>
          <div class="empty-state-title">No Projects Yet</div>
          <div class="empty-state-desc">Start your first project with the Software Factory</div>
          <button class="btn btn-primary mt-3" onclick="resetFactory()">Create Your First Project</button>
        </div>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
        ${FACTORY_STATE.galleryProjects.map(p => `
          <div class="card" style="overflow:hidden">
            <div style="height:120px;background:linear-gradient(135deg,var(--accent),var(--purple));display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px">📦</div>
            <div class="card-body" style="padding:16px">
              <h4 style="font-size:14px;margin-bottom:8px">${p.idea?.substring(0, 80) || 'Untitled Project'}</h4>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">
                <span class="badge">${p.status}</span>
                <span style="margin-left:8px">${new Date(p.created).toLocaleDateString()}</span>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-sm btn-primary" onclick="openProject('${p.id}')">View Details</button>
                <button class="btn btn-sm btn-ghost" onclick="rebuildProject('${p.id}')">🔄 Rebuild</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">🗑️</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function openProject(id) {
  const project = FACTORY_STATE.galleryProjects.find(p => p.id === id);
  if (!project) return;
  
  FACTORY_STATE.selectedProject = project;
  FACTORY_STATE.currentStage = 'gallery';
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <button class="btn btn-ghost" onclick="loadFactoryGallery()">← Back to Gallery</button>
        <h1 class="page-title">${project.idea?.substring(0, 60) || 'Project'}</h1>
      </div>
    </div>
    
    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="card"><div class="card-header"><h3 class="card-title">Requirements</h3></div><div class="card-body" style="max-height:400px;overflow:auto">${project.requirements?.markdown ? renderMarkdown(project.requirements.markdown) : 'No requirements'}</div></div>
      <div class="card"><div class="card-header"><h3 class="card-title">Project Plan</h3></div><div class="card-body" style="max-height:400px;overflow:auto">${project.plan?.markdown ? renderMarkdown(project.plan.markdown) : 'No plan'}</div></div>
    </div>
    
    <div class="card">
      <div class="card-header"><h3 class="card-title">Actions</h3></div>
      <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="rebuildProject('${project.id}')">🔄 Rebuild</button>
        <button class="btn btn-ghost" onclick="loadFactoryGallery()">← Back to Gallery</button>
      </div>
    </div>
  `;
}

function rebuildProject(id) {
  const project = FACTORY_STATE.galleryProjects.find(p => p.id === id);
  if (!project) return;
  
  FACTORY_STATE.requirements = project.requirements;
  FACTORY_STATE.plan = project.plan;
  FACTORY_STATE.projectId = id;
  FACTORY_STATE.currentStage = 'review-plan';
  showToast('Loaded project for rebuild', 'info');
  renderPlanReview();
}

function deleteProject(id) {
  if (!confirm('Delete this project permanently?')) return;
  FACTORY_STATE.galleryProjects = FACTORY_STATE.galleryProjects.filter(p => p.id !== id);
  localStorage.setItem('factory_gallery', JSON.stringify(FACTORY_STATE.galleryProjects));
  loadFactoryGallery();
}

function resetFactory() {
  FACTORY_STATE.currentStage = 'idea';
  FACTORY_STATE.projectId = null;
  FACTORY_STATE.idea = '';
  FACTORY_STATE.requirements = null;
  FACTORY_STATE.plan = null;
  FACTORY_STATE.buildStatus = null;
  renderFactoryIdeaFactory();
}

// Register render function
window.renderFactoryIdeaFactory = renderFactoryIdeaFactory;