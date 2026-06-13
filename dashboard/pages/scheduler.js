async function renderScheduler() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Scheduler</h1>
        <p class="mc-subtitle">Automated workflow scheduling — single skills or multi-skill chains</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="mc-btn primary" onclick="showAddJob('single')">+ Add Single Job</button>
        <button class="mc-btn primary" onclick="showAddJob('chain')">+ Add Chain Job</button>
      </div>
    </div>

    <div id="jobList"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const jobs = await api.getJobs();
    const container = document.getElementById('jobList');

    if (jobs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏱</div><div class="empty-state-title">No scheduled jobs</div><div class="empty-state-desc">Create your first scheduled job to automate workflows</div><div style="display:flex;gap:12px;margin-top:16px"><button class="btn btn-primary" onclick="showAddJob(\'single\')">+ Add Single Skill Job</button><button class="btn btn-primary" onclick="showAddJob(\'chain\')">+ Add Skill Chain Job</button></div></div>';
      return;
    }

    container.innerHTML = `
      <div class="mc-card" style="padding:0;overflow:hidden;">
        <div class="table-wrapper" style="margin:0;">
          <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:500;font-size:12px;text-transform:uppercase;">
                <th style="padding:12px 16px;">Name</th>
                <th style="padding:12px 16px;">Type</th>
                <th style="padding:12px 16px;">Skill(s)</th>
                <th style="padding:12px 16px;">Cron</th>
                <th style="padding:12px 16px;">Status</th>
                <th style="padding:12px 16px;">Last Run</th>
                <th style="padding:12px 16px;"></th>
              </tr>
            </thead>
            <tbody>
              ${jobs.map((j, i) => {
                const isChain = j.skills && j.skills.length > 0;
                return `
                  <tr style="${i !== jobs.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.02);' : ''}">
                    <td style="padding:12px 16px;font-weight:500;color:var(--text-primary);">${j.name}</td>
                    <td style="padding:12px 16px;"><span class="mc-badge" style="background:${isChain ? 'rgba(168,85,247,0.1)' : 'rgba(56,189,248,0.1)'};color:${isChain ? 'var(--purple)' : 'var(--cyan)'};">${isChain ? 'Chain' : 'Single'}</span></td>
                    <td style="padding:12px 16px;">
                      ${isChain
                        ? j.skills.map(s => `<span class="mc-badge" style="margin:2px;background:rgba(255,255,255,0.05);color:var(--text-secondary);">${s}</span>`).join(' ')
                        : `<span class="mc-badge" style="background:rgba(255,255,255,0.05);color:var(--text-secondary);">${j.skill}</span>`
                      }
                    </td>
                    <td style="padding:12px 16px;"><code style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${j.cron}</code></td>
                    <td style="padding:12px 16px;"><span class="mc-badge" style="background:${j.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)'};color:${j.enabled ? 'var(--green)' : 'var(--yellow)'};">${j.enabled ? 'Active' : 'Paused'}</span></td>
                    <td style="padding:12px 16px;font-size:12px;color:var(--text-muted);">${j.last_run ? formatDate(j.last_run) : 'Never'}</td>
                    <td style="padding:12px 16px;text-align:right;"><button class="mc-btn" onclick="deleteJob('${j.id}')" style="color:var(--red);">Delete</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);text-align:right;margin-top:12px">${jobs.length} job${jobs.length !== 1 ? 's' : ''}</div>
    `;
  } catch (err) {
    (document.getElementById('jobList') || {}).innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function showAddJob(type) {
  let skills = [];
  try { const s = await api.getSkills(); skills = s || []; } catch {}

  if (type === 'single') {
    showModal('Add Single Skill Job', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;margin-bottom:6px;display:block;">Job Name</label>
          <input id="jobName" class="mc-input" placeholder="e.g., Nightly Backup">
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;margin-bottom:6px;display:block;">Skill</label>
          <select id="jobSkill" class="mc-input">
            <option value="">Select a skill...</option>
            ${skills.map(s => `<option value="${s.name}">${s.name.replace(/-/g, ' ')}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;margin-bottom:6px;display:block;">Cron Expression</label>
          <input id="jobCron" class="mc-input" placeholder="e.g., 0 2 * * *" value="0 0 * * *">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Format: minute hour day month weekday</div>
        </div>
      </div>
    `, `
      <button class="mc-btn" onclick="closeModal()">Cancel</button>
      <button class="mc-btn primary" onclick="createJob('single')">Create Job</button>
    `);
  } else {
    // Chain job builder - similar to skill-chain page
    const categorized = {};
    for (const skill of skills) {
      const cat = skill.category || 'general';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(skill);
    }

    const chainState = { selectedSkills: [], availableSkills: skills };

    showModal('Add Skill Chain Job (Wide Modal)', `
      <style>
        .modal.wide { max-width: 900px; }
        .skill-chip { display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;transition:all 0.2s; }
        .skill-chip.selected { border-color:var(--accent); background:rgba(56,189,248,0.1); }
        .chain-step { display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-panel);border:1px solid var(--border);border-radius:6px;margin-bottom:8px;cursor:grab }
      </style>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;margin-bottom:6px;display:block;">Job Name</label>
          <input id="chainJobName" class="mc-input" placeholder="e.g., Research & Implement Pipeline">
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;margin-bottom:6px;display:block;">Cron Expression</label>
          <input id="chainJobCron" class="mc-input" placeholder="e.g., 0 3 * * 0" value="0 3 * * 0">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Format: minute hour day month weekday</div>
        </div>

        <h5 style="font-size:13px;margin:16px 0 8px;color:var(--text-secondary)">Available Skills</h5>
        <div id="chainAvailableSkills" style="max-height:200px;overflow-y:auto;margin-bottom:16px">
          ${Object.entries(categorized).map(([cat, catSkills]) => `
            <div style="margin-bottom:12px"><h6 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">${cat}</h6>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${catSkills.map(skill => `
                <div class="skill-chip" onclick="toggleChainSkill('${skill.name}', this)" data-skill-name="${skill.name}">
                  <input type="checkbox" onchange="event.stopPropagation()" style="accent-color:var(--accent)">
                  <span style="font-weight:600">${skill.name}</span>
                  <span class="mc-badge" style="background:${getAgentColor(skill.primary_agent || 'opencode')};font-size:9px">${skill.primary_agent || 'opencode'}</span>
                </div>
              `).join('')}
            </div></div>
          `).join('')}
        </div>

        <h5 style="font-size:13px;margin:16px 0 8px;color:var(--text-secondary)">
          Chain Order (click ✕ to remove, drag to reorder)
          <span id="chainSelectedCount" style="font-weight:normal;color:var(--text-muted)">(0 selected)</span>
        </h5>
        <div id="chainSelectedSkills" class="droppable" style="min-height:100px;padding:12px;background:rgba(255,255,255,0.01);border:1px dashed var(--border);border-radius:6px"></div>

        <div style="margin-top:16px;padding:12px;background:rgba(56,189,248,0.1);border-radius:6px;border:1px solid rgba(56,189,248,0.3);font-size:12px;color:var(--cyan)">
          <strong>Note:</strong> Chains execute skills sequentially, passing output from each step to the next. Handoffs are automatically created between steps for tracking.
        </div>
      </div>
    `, `
      <button class="mc-btn" onclick="closeModal()">Cancel</button>
      <button class="mc-btn primary" onclick="createChainJob()" disabled id="createChainBtn">Create Chain Job</button>
    `, 'wide');

    // Make modal wide
    const modal = document.querySelector('.modal');
    if (modal) modal.classList.add('wide');

    window.chainState = { selectedSkills: [], availableSkills: skills };
    updateChainSelectedList();
  }
}

function getAgentColor(agent) {
  const colors = { opencode: 'var(--blue-dim)', hermes: 'var(--purple)', gemini: 'var(--yellow-dim)', claude: 'var(--pink)' };
  return colors[agent] || 'var(--border)';
}

function toggleChainSkill(name, el) {
  const checkbox = el.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;
  const skill = window.chainState.availableSkills.find(s => s.name === name);

  if (checkbox.checked) {
    if (skill) window.chainState.selectedSkills.push(skill);
    el.classList.add('selected');
    el.style.borderColor = 'var(--accent)';
  } else {
    window.chainState.selectedSkills = window.chainState.selectedSkills.filter(s => s.name !== name);
    el.classList.remove('selected');
    el.style.borderColor = 'var(--border)';
  }
  updateChainSelectedList();
}

function updateChainSelectedList() {
  const countEl = document.getElementById('chainSelectedCount');
  const listEl = document.getElementById('chainSelectedSkills');
  const createBtn = document.getElementById('createChainBtn');

  countEl.textContent = `(${window.chainState.selectedSkills.length} selected)`;
  createBtn.disabled = window.chainState.selectedSkills.length < 2;

  if (window.chainState.selectedSkills.length === 0) {
    listEl.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">Click skills to add them to the chain</p>';
    return;
  }

  listEl.innerHTML = window.chainState.selectedSkills.map((skill, i) => `
    <div class="chain-step" draggable="true"
         ondragstart="chainDragStart(event, ${i})"
         ondragover="chainDragOver(event)"
         ondrop="chainDrop(event, ${i})"
         style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:6px;margin-bottom:8px;cursor:grab">
      <span style="width:24px;height:24px;border-radius:50%;background:rgba(56,189,248,0.2);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${i + 1}</span>
      <span style="font-weight:600;font-size:13px;flex:1;color:var(--text-primary);">${skill.name}</span>
      <span class="mc-badge" style="background:${getAgentColor(skill.primary_agent || 'opencode')}">${skill.primary_agent || 'opencode'}</span>
      <button class="mc-btn" onclick="removeFromChain(${i})" style="padding:4px 8px;font-size:11px;color:var(--red);">✕</button>
    </div>
  `).join('');
}

function removeFromChain(index) {
  window.chainState.selectedSkills.splice(index, 1);
  updateChainSelectedList();
  // Also uncheck in available skills
  const chips = document.querySelectorAll('.skill-chip');
  chips.forEach(chip => {
    if (chip.dataset.skillName === window.chainState.selectedSkills[index]?.name) return;
    // Find the one that was removed
    const removedSkill = window.chainState.selectedSkills[index];
    // Actually we need to find the chip that has the removed skill
  });
  // Re-render available skills to update checkboxes
  // Simpler: just re-fetch the modal content or accept slight UI inconsistency
  renderAvailableSkillsAll();
}

function renderAvailableSkillsAll() {
  // Re-render available skills to sync checkboxes
  const container = document.getElementById('chainAvailableSkills');
  if (!container) return;
  const skills = window.chainState.availableSkills;
  const categorized = {};
  for (const skill of skills) {
    const cat = skill.category || 'general';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(skill);
  }
  container.innerHTML = Object.entries(categorized).map(([cat, catSkills]) => `
    <div style="margin-bottom:12px"><h6 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">${cat}</h6>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${catSkills.map(skill => {
        const isSelected = window.chainState.selectedSkills.some(s => s.name === skill.name);
        return `
          <div class="skill-chip ${isSelected ? 'selected' : ''}" onclick="toggleChainSkill('${skill.name}', this)" data-skill-name="${skill.name}" style="border-color: ${isSelected ? 'var(--accent)' : 'var(--border)'}; background: ${isSelected ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.02)'}">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="event.stopPropagation()" style="accent-color:var(--accent)">
            <span style="font-weight:600">${skill.name}</span>
            <span class="mc-badge" style="background:${getAgentColor(skill.primary_agent || 'opencode')};font-size:9px">${skill.primary_agent || 'opencode'}</span>
          </div>
        `;
      }).join('')}
    </div></div>
  `).join('');
}

function chainDragStart(event, index) {
  event.dataTransfer.setData('text/plain', `step:${index}`);
  event.target.style.opacity = '0.5';
}

function chainDragOver(event) {
  event.preventDefault();
}

function chainDrop(event, targetIndex) {
  event.preventDefault();
  const data = event.dataTransfer.getData('text/plain');
  if (data.startsWith('step:')) {
    const sourceIndex = parseInt(data.split(':')[1]);
    if (sourceIndex !== targetIndex) {
      const [moved] = window.chainState.selectedSkills.splice(sourceIndex, 1);
      window.chainState.selectedSkills.splice(targetIndex, 0, moved);
      updateChainSelectedList();
    }
  }
}

async function createJob(type) {
  if (type === 'single') {
    const name = document.getElementById('jobName').value.trim();
    const skill = document.getElementById('jobSkill').value;
    const cron = document.getElementById('jobCron').value.trim();
    if (!name || !skill || !cron) { showToast('All fields required', 'warning'); return; }
    try {
      await api.createJob({ name, skill, cron });
      closeModal();
      showToast('Job created', 'success');
      renderScheduler();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }
}

async function createChainJob() {
  const name = document.getElementById('chainJobName').value.trim();
  const cron = document.getElementById('chainJobCron').value.trim();
  const skills = window.chainState.selectedSkills.map(s => s.name);

  if (!name || !cron || skills.length < 2) {
    showToast('Name, cron, and at least 2 skills required', 'warning');
    return;
  }

  try {
    await api.createJob({ name, skills, cron });
    closeModal();
    showToast('Skill chain job created', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteJob(id) {
  if (!confirm('Delete this scheduled job?')) return;
  try {
    await api.deleteJob(id);
    showToast('Job deleted', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

window.renderScheduler = renderScheduler;
window.showAddJob = showAddJob;
window.createJob = createJob;
window.createChainJob = createChainJob;
window.deleteJob = deleteJob;
window.toggleChainSkill = toggleChainSkill;
window.removeFromChain = removeFromChain;
window.chainDragStart = chainDragStart;
window.chainDragOver = chainDragOver;
window.chainDrop = chainDrop;
window.updateChainSelectedList = updateChainSelectedList;
window.renderAvailableSkillsAll = renderAvailableSkillsAll;