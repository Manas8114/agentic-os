// Skill Chain — Multi-skill workflow execution with handoff visualization
let chainState = {
  availableSkills: [],
  selectedSkills: [],
  running: false,
  currentChain: null,
  history: [],
};

async function renderSkillChainPage() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Skill Chains</h1>
        <p class="page-subtitle">Chain multiple skills into multi-agent workflows with handoff visualization</p>
      </div>
    </div>

    <div class="grid grid-2" style="gap:24px">
      <!-- Chain Builder -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Build Chain</h3>
        </div>
        <div class="card-body">
          <div style="margin-bottom:16px">
            <label class="form-label">Task ID (optional)</label>
            <input type="text" id="chainTaskId" class="form-input" placeholder="auto-generated">
          </div>

          <div style="margin-bottom:16px">
            <label class="form-label">Initial Input (optional)</label>
            <textarea id="chainInitialInput" class="form-input" rows="3" placeholder="Input passed to first skill..."></textarea>
          </div>

          <h4 style="font-size:13px;margin:16px 0 8px;color:var(--text-secondary)">Available Skills</h4>
          <div id="availableSkillsList" style="max-height:280px;overflow-y:auto;margin-bottom:16px"></div>

          <h4 style="font-size:13px;margin:16px 0 8px;color:var(--text-secondary)">
            Chain Order (drag to reorder, click ✕ to remove)
            <span id="selectedCount" style="font-weight:normal;color:var(--text-muted)">(0 selected)</span>
          </h4>
          <div id="selectedSkillsList" class="droppable" style="min-height:120px;padding:12px;background:var(--bg-card);border:1px dashed var(--border);border-radius:var(--radius)"></div>

          <div class="flex justify-end mt-4" style="gap:12px">
            <button class="btn btn-ghost" onclick="clearChain()">Clear</button>
            <button class="btn btn-primary" onclick="runChain()" id="runChainBtn" disabled>
              <span id="runBtnText">Run Chain</span>
              <span id="runBtnSpinner" class="loading-spinner" style="width:14px;height:14px;display:none;margin-left:8px"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Execution Progress -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Execution Progress</h3>
        </div>
        <div class="card-body">
          <div id="executionProgress">
            <div class="empty-state" style="padding:40px 0">
              <div class="empty-state-icon">⛓</div>
              <div class="empty-state-title">No chain running</div>
              <div class="empty-state-desc">Build a chain and click Run to see live progress</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results & History -->
    <div class="card mt-4">
      <div class="card-header">
        <h3 class="card-title">Results & History</h3>
      </div>
      <div class="card-body">
        <div id="chainResults"></div>
      </div>
    </div>

    <!-- Handoffs Section -->
    <div class="card mt-4">
      <div class="card-header">
        <h3 class="card-title">Recent Handoffs</h3>
      </div>
      <div class="card-body">
        <div id="handoffsList"></div>
      </div>
    </div>
  `;

  await loadAvailableSkills();
  loadHandoffs();
}

async function loadAvailableSkills() {
  const container = document.getElementById('availableSkillsList');
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><span>Loading skills...</span></div>';

  try {
    const data = await api.getSkills();
    chainState.availableSkills = data.skills || [];
    renderAvailableSkills();
  } catch (err) {
    container.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:transparent;padding:12px"><span>✕</span><span>${escapeHtml(err.message)}</span></div>`;
  }
}

function renderAvailableSkills() {
  const container = document.getElementById('availableSkillsList');
  if (chainState.availableSkills.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">No skills found</p>';
    return;
  }

  // Group by category
  const categorized = {};
  for (const skill of chainState.availableSkills) {
    const cat = skill.category || 'general';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(skill);
  }

  let html = '';
  for (const [cat, skills] of Object.entries(categorized)) {
    html += `<div style="margin-bottom:16px"><h5 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">${cat}</h5>`;
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
    for (const skill of skills) {
      const isSelected = chainState.selectedSkills.some(s => s.name === skill.name);
      const primaryAgent = skill.primary_agent || 'opencode';
      const agentColor = getAgentColor(primaryAgent);
      html += `
        <div class="skill-chip ${isSelected ? 'selected' : ''}"
             onclick="toggleSkillSelection('${skill.name}', this)"
             draggable="true"
             ondragstart="dragStart(event, '${skill.name}')"
             style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg-card);border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'};border-radius:var(--radius);font-size:12px;cursor:pointer;transition:var(--transition)">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()" style="accent-color:var(--accent)">
          <span style="font-weight:600">${skill.name}</span>
          <span class="badge" style="background:${agentColor};font-size:9px">${primaryAgent}</span>
        </div>
      `;
    }
    html += '</div></div>';
  }
  container.innerHTML = html;
  updateSelectedSkillsList();
}

function getAgentColor(agent) {
  const colors = { opencode: 'var(--blue-dim)', hermes: 'var(--purple)', gemini: 'var(--yellow-dim)', claude: 'var(--pink)' };
  return colors[agent] || 'var(--border)';
}

function toggleSkillSelection(name, el) {
  const checkbox = el.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;

  if (checkbox.checked) {
    const skill = chainState.availableSkills.find(s => s.name === name);
    if (skill) chainState.selectedSkills.push(skill);
    el.classList.add('selected');
    el.style.borderColor = 'var(--accent)';
  } else {
    chainState.selectedSkills = chainState.selectedSkills.filter(s => s.name !== name);
    el.classList.remove('selected');
    el.style.borderColor = 'var(--border)';
  }

  updateSelectedSkillsList();
}

function updateSelectedSkillsList() {
  const countEl = document.getElementById('selectedCount');
  const listEl = document.getElementById('selectedSkillsList');
  const runBtn = document.getElementById('runChainBtn');

  countEl.textContent = `(${chainState.selectedSkills.length} selected)`;
  runBtn.disabled = chainState.selectedSkills.length < 2;

  if (chainState.selectedSkills.length === 0) {
    listEl.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">Click skills to add them to the chain</p>';
    return;
  }

  listEl.innerHTML = chainState.selectedSkills.map((skill, i) => `
    <div class="chain-step" draggable="true"
         ondragstart="dragStartStep(event, ${i})"
         ondragover="dragOverStep(event)"
         ondrop="dropStep(event, ${i})"
         style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;cursor:grab">
      <span style="width:24px;height:24px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${i + 1}</span>
      <span style="font-weight:600;font-size:13px;flex:1">${skill.name}</span>
      <span class="badge" style="background:${getAgentColor(skill.primary_agent || 'opencode')}">${skill.primary_agent || 'opencode'}</span>
      <button class="btn btn-ghost" onclick="removeFromChain(${i})" style="padding:4px 8px;font-size:11px">✕</button>
    </div>
  `).join('');
}

function removeFromChain(index) {
  chainState.selectedSkills.splice(index, 1);
  renderAvailableSkills();
}

function clearChain() {
  chainState.selectedSkills = [];
  renderAvailableSkills();
}

function dragStart(event, skillName) {
  event.dataTransfer.setData('text/plain', skillName);
  event.target.style.opacity = '0.5';
}

function dragStartStep(event, index) {
  event.dataTransfer.setData('text/plain', `step:${index}`);
  event.target.style.opacity = '0.5';
}

function dragOverStep(event) {
  event.preventDefault();
}

function dropStep(event, targetIndex) {
  event.preventDefault();
  const data = event.dataTransfer.getData('text/plain');
  if (data.startsWith('step:')) {
    const sourceIndex = parseInt(data.split(':')[1]);
    if (sourceIndex !== targetIndex) {
      const [moved] = chainState.selectedSkills.splice(sourceIndex, 1);
      chainState.selectedSkills.splice(targetIndex, 0, moved);
      renderAvailableSkills();
    }
  }
}

async function runChain() {
  if (chainState.selectedSkills.length < 2) return;
  if (chainState.running) return;

  chainState.running = true;
  const taskId = document.getElementById('chainTaskId').value.trim() || `chain-${Date.now()}`;
  const initialInput = document.getElementById('chainInitialInput').value.trim();
  const skillNames = chainState.selectedSkills.map(s => s.name);

  const runBtn = document.getElementById('runChainBtn');
  const runBtnText = document.getElementById('runBtnText');
  const runBtnSpinner = document.getElementById('runBtnSpinner');
  runBtn.disabled = true;
  runBtnText.textContent = 'Running...';
  runBtnSpinner.style.display = 'inline-block';

  // Show execution progress UI
  renderExecutionProgress(skillNames, 0, 'pending');

  try {
    const result = await api.runSkillChain(skillNames, initialInput, taskId);
    chainState.currentChain = result;
    renderExecutionProgress(skillNames, skillNames.length, 'completed', result);
    renderResults(result);
    showToast(`Chain "${taskId}" completed`, 'success');
  } catch (err) {
    renderExecutionProgress(skillNames, skillNames.length, 'failed', { error: err.message });
    showToast('Chain failed: ' + err.message, 'error');
  } finally {
    chainState.running = false;
    runBtn.disabled = false;
    runBtnText.textContent = 'Run Chain';
    runBtnSpinner.style.display = 'none';
    loadHandoffs();
  }
}

function renderExecutionProgress(skills, completed, status, result = null) {
  const container = document.getElementById('executionProgress');
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  let html = `<div style="margin-bottom:16px"><strong>Task:</strong> ${chainState.currentChain?.task_id || 'N/A'}</div>`;
  html += '<div style="display:flex;flex-direction:column;gap:8px">';

  skills.forEach((skill, i) => {
    let stepStatus = 'pending';
    let stepOutput = '';
    if (result?.results?.[i]) {
      stepStatus = result.results[i].status;
      stepOutput = result.results[i].output?.substring(0, 100) + '...' || '';
    } else if (i < completed) {
      stepStatus = 'completed';
    } else if (i === completed && isRunning) {
      stepStatus = 'running';
    }

    const statusIcon = stepStatus === 'completed' ? '✓' : stepStatus === 'running' ? '⟳' : stepStatus === 'failed' ? '✕' : '○';
    const statusColor = stepStatus === 'completed' ? 'var(--green)' : stepStatus === 'running' ? 'var(--accent)' : stepStatus === 'failed' ? 'var(--red)' : 'var(--text-muted)';
    const bgColor = stepStatus === 'completed' ? 'var(--green-dim)' : stepStatus === 'running' ? 'var(--accent-glow)' : stepStatus === 'failed' ? 'var(--red-dim)' : 'var(--bg-card)';

    html += `
      <div style="display:flex;gap:12px;padding:12px;background:${bgColor};border:1px solid ${statusColor}40;border-radius:var(--radius);transition:var(--transition)">
        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:${statusColor};color:white;flex-shrink:0">${statusIcon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:600;font-size:13px">${skill}</span>
            <span style="font-size:11px;color:${statusColor}">${stepStatus}</span>
          </div>
          ${stepOutput ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(stepOutput)}</div>` : ''}
        </div>
        ${i < skills.length - 1 && !isRunning ? `
          <div style="display:flex;flex-direction:column;align-items:center;color:var(--text-muted);font-size:10px">
            <span>↓</span>
            <span>handoff</span>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderResults(result) {
  const container = document.getElementById('chainResults');

  if (!result) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">No results yet</p>';
    return;
  }

  const completed = result.completed_steps || 0;
  const total = result.total_steps || 0;
  const success = completed === total;

  let html = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
      <div style="font-size:32px">${success ? '✓' : '⚠'}</div>
      <div>
        <div style="font-weight:600;font-size:14px">${success ? 'Chain Completed Successfully' : 'Chain Completed with Errors'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${completed}/${total} steps • Task: ${result.task_id}</div>
      </div>
    </div>
  `;

  // Final output
  if (result.final_context) {
    html += `
      <h5 style="font-size:12px;margin:16px 0 8px;color:var(--text-secondary)">Final Output</h5>
      <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;max-height:200px;overflow-y:auto;font-family:var(--font-mono);white-space:pre-wrap">${escapeHtml(result.final_context.substring(0, 2000))}</div>
    `;
  }

  // Step details
  if (result.results && result.results.length > 0) {
    html += '<h5 style="font-size:12px;margin:16px 0 8px;color:var(--text-secondary)">Step Details</h5>';
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    for (const step of result.results) {
      const statusColor = step.status === 'completed' ? 'var(--green)' : 'var(--red)';
      html += `
        <div style="padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-weight:600">${step.skill}</span>
            <span class="badge" style="background:${statusColor}">${step.status}</span>
            <span style="font-size:11px;color:var(--text-muted)">Agent: ${step.agent}</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);max-height:100px;overflow-y:auto;font-family:var(--font-mono);white-space:pre-wrap">${escapeHtml(step.output || '')}</div>
        </div>
      `;
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

async function loadHandoffs() {
  const container = document.getElementById('handoffsList');
  try {
    const data = await api.getHandoffs();
    const handoffs = data.handoffs || [];

    if (handoffs.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">No handoffs recorded yet</p>';
      return;
    }

    // Show last 10
    const recent = handoffs.slice(-10).reverse();
    let html = '<div style="display:flex;flex-direction:column;gap:8px">';
    for (const h of recent) {
      const statusColor = h.status === 'completed' ? 'var(--green)' : h.status === 'failed' ? 'var(--red)' : 'var(--yellow)';
      html += `
        <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
          <div style="width:8px;height:8px;border-radius:50%;background:${statusColor}"></div>
          <div style="font-weight:600;font-size:13px;flex:1">${h.from_agent} → ${h.to_agent}</div>
          <div style="font-size:11px;color:var(--text-muted)">${h.context_summary || ''}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${h.task_id} · ${h.chain_step || ''}</div>
          <div style="font-size:10px;color:var(--text-muted)">${formatDate(h.created)}</div>
          <span class="badge" style="background:${statusColor}">${h.status}</span>
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

window.renderSkillChainPage = renderSkillChainPage;