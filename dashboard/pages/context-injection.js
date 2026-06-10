// Context Injection Engine — Auto-load relevant memory per task
let contextState = {
  task: '',
  result: null,
  rules: [],
  selectedRule: null,
};

async function renderContextInjection() {
  const content = document.getElementById('pageContent');
  content.innerHTML = getContextInjectionHTML();
  await loadContextRules();
}

function getContextInjectionHTML() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Context Injection Engine</h1>
        <p class="page-subtitle">Auto-load relevant memory (semantic search, knowledge graph, skills, journal, brain) for any task</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="showCreateRuleModal()">+ Create Rule</button>
        <button class="btn btn-ghost" onclick="loadContextRules()">Refresh Rules</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title">Inject Context for Task</h3></div>
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1;min-width:300px">
            <textarea id="contextTaskInput" class="form-input" placeholder="Describe the task... (e.g., Audit GCP infrastructure for CloudMart, Write daily standup notes, Research semantic search implementation)" style="min-height:100px;font-family:var(--font-mono);font-size:13px;resize:vertical"></textarea>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <div style="display:flex;gap:8px;align-items:center">
              <select id="contextAgent" class="form-select" style="width:auto;min-width:160px">
                <option value="auto">Auto-detect Agent</option>
                <option value="opencode">opencode</option>
                <option value="hermes">Hermes</option>
                <option value="gemini">Gemini CLI</option>
                <option value="claude">Claude</option>
              </select>
              <select id="contextMaxItems" class="form-select" style="width:auto;min-width:100px">
                <option value="5">Max 5 items</option>
                <option value="10" selected>Max 10 items</option>
                <option value="20">Max 20 items</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="injectContext()" id="injectBtn" style="padding:0 24px;height:42px">
              <span id="injectBtnText">Inject Context</span>
              <span id="injectBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div id="contextResult" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Injected Context</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="copyInjectedContext()">Copy to Clipboard</button>
            <button class="btn btn-primary btn-sm" onclick="useInjectedContext()">Use in Chat</button>
          </div>
        </div>
        <div class="card-body" style="padding:0" id="injectedContextDisplay"></div>
      </div>
    </div>

    <div id="contextSources" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3 class="card-title">Source Details</h3></div>
        <div class="card-body" style="padding:0" id="contextSourceDetails"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Context Injection Rules</h3>
        <span class="badge" id="rulesCount">0 rules</span>
      </div>
      <div class="card-body" style="padding:0" id="contextRulesList">
        <div class="empty-state" style="padding:40px"><div class="empty-state-icon">Settings</div><div class="empty-state-title">No rules yet</div><div class="empty-state-desc">Create rules to auto-inject context based on trigger keywords</div></div>
      </div>
    </div>

    <div id="contextRuleModal" style="display:none"></div>
  `;
}

async function loadContextRules() {
  try {
    const data = await api.getContextRules();
    contextState.rules = data.rules || [];
    renderContextRules();
  } catch (err) {
    console.error('Failed to load context rules:', err);
  }
}

function renderContextRules() {
  const container = document.getElementById('contextRulesList');
  const countEl = document.getElementById('rulesCount');
  if (countEl) countEl.textContent = contextState.rules.length + ' rule' + (contextState.rules.length !== 1 ? 's' : '');

  if (!container) return;

  if (contextState.rules.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">Settings</div><div class="empty-state-title">No rules yet</div><div class="empty-state-desc">Create rules to auto-inject context based on trigger keywords</div></div>';
    return;
  }

  container.innerHTML = contextState.rules.map(function(rule) {
    return '<div class="card" style="margin-bottom:12px;transition:var(--transition)" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><div style="padding:16px;display:flex;gap:12px;align-items:flex-start"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px"><span style="font-weight:600;font-size:14px">' + escapeHtml(rule.name || 'Unnamed Rule') + '</span>' + (rule.enabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge">Disabled</span>') + '<span class="badge" style="background:var(--purple-dim);color:var(--purple);font-size:10px">Priority: ' + (rule.priority || 0) + '</span></div><div style="font-size:12px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px"><span>Triggers: ' + (rule.trigger_keywords || []).map(function(k) { return '<code>' + escapeHtml(k) + '</code>'; }).join(', ') + '</span><span>Sources: ' + (rule.include_sources || []).join(', ') + '</span><span>Max Items: ' + (rule.max_items || 10) + '</span></div></div><div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" onclick="editContextRule(\'' + rule.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteContextRule(\'' + rule.id + '\')">Delete</button></div></div>';
  }).join('');
}

async function injectContext() {
  var task = document.getElementById('contextTaskInput')?.value?.trim();
  var agent = document.getElementById('contextAgent')?.value || 'auto';
  var maxItems = parseInt(document.getElementById('contextMaxItems')?.value || '10');

  if (!task) { showToast('Enter a task description', 'warning'); return; }

  var btn = document.getElementById('injectBtn');
  var btnText = document.getElementById('injectBtnText');
  var btnSpinner = document.getElementById('injectBtnSpinner');
  btn.disabled = true; btnText.textContent = 'Injecting...'; btnSpinner.style.display = 'inline-block';

  try {
    var result = await api.injectContext({ task: task, agent: agent, max_items: maxItems });
    contextState.result = result;
    renderContextResult();
    document.getElementById('contextResult').style.display = 'block';
    document.getElementById('contextSources').style.display = 'block';
    showToast('Context injected successfully', 'success');
  } catch (err) {
    showToast('Injection failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btnText.textContent = 'Inject Context'; btnSpinner.style.display = 'none';
  }
}

function renderContextResult() {
  var result = contextState.result;
  if (!result) return;

  var display = document.getElementById('injectedContextDisplay');
  if (display) {
    if (result.injected_context) {
      display.innerHTML = '<div style="padding:16px;font-family:var(--font-mono);font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:500px;overflow-y:auto">' + escapeHtml(result.injected_context) + '</div>';
    } else {
      display.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No context injected</div></div>';
    }
  }

  var sources = document.getElementById('contextSourceDetails');
  if (sources) {
    var semantic = result.semantic_matches || [];
    var kgEntities = result.knowledge_graph?.entities || [];
    var kgRelations = result.knowledge_graph?.relations || [];
    var skills = result.recent_skills || [];
    var journal = result.recent_journal || [];
    var brain = result.business_brain || '';
    var projects = result.active_projects || '';

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;padding:16px">';

    // Semantic
    var semHtml = '<div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)"><div style="padding:12px;border-bottom:1px solid var(--border);font-weight:600">Semantic Matches (' + semantic.length + ')</div><div style="padding:12px;max-height:300px;overflow-y:auto;font-size:12px">';
    if (semantic.length) {
      semHtml += semantic.map(function(m) {
        return '<div style="margin-bottom:8px;padding:8px;background:var(--bg-secondary);border-radius:4px"><strong>[' + m.source + ']</strong> <span class="badge" style="background:var(--green-dim);color:var(--green);font-size:10px;margin-left:8px">' + (m.score * 100).toFixed(1) + '%</span><br><span style="color:var(--text-secondary)">' + escapeHtml(m.text_preview.substring(0, 150)) + '</span></div>';
      }).join('');
    } else {
      semHtml += '<div class="text-muted">No matches</div>';
    }
    semHtml += '</div></div>';
    html += semHtml;

    // Knowledge Graph
    var kgHtml = '<div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)"><div style="padding:12px;border-bottom:1px solid var(--border);font-weight:600">Knowledge Graph (' + kgEntities.length + ' entities, ' + kgRelations.length + ' relations)</div><div style="padding:12px;max-height:300px;overflow-y:auto;font-size:12px">';
    if (kgEntities.length) {
      kgHtml += kgEntities.slice(0, 15).map(function(e) {
        return '<div style="margin-bottom:6px;padding:6px;background:var(--bg-secondary);border-radius:4px;display:flex;align-items:center;gap:8px"><span style="font-weight:600">' + escapeHtml(e.name) + '</span><span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:10px">' + e.type + '</span><span style="color:var(--text-muted);font-size:11px">' + (e.mentions || []).length + ' mentions</span></div>';
      }).join('');
      if (kgEntities.length > 15) kgHtml += '<div style="color:var(--text-muted);font-size:11px">... and ' + (kgEntities.length - 15) + ' more</div>';
    } else {
      kgHtml += '<div class="text-muted">No entities</div>';
    }
    kgHtml += '</div></div>';
    html += kgHtml;

    // Recent Skills
    var skHtml = '<div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)"><div style="padding:12px;border-bottom:1px solid var(--border);font-weight:600">Recent Skills (' + skills.length + ')</div><div style="padding:12px;max-height:300px;overflow-y:auto;font-size:12px">';
    if (skills.length) {
      skHtml += skills.slice(-10).map(function(s) {
        var success = s.success;
        return '<div style="margin-bottom:6px;padding:6px;background:var(--bg-secondary);border-radius:4px;display:flex;align-items:center;gap:8px"><span class="badge" style="background:' + (success ? 'var(--green-dim)' : 'var(--red-dim)') + ';color:' + (success ? 'var(--green)' : 'var(--red)') + ';font-size:10px">' + (success ? 'Success' : 'Failed') + '</span><span>' + escapeHtml(s.agent) + '</span><span style="color:var(--text-muted)">></span><span>' + escapeHtml(s.skill || 'unknown') + '</span><span style="color:var(--text-muted);font-size:11px;margin-left:auto">' + (s.timestamp || '').substring(0, 19) + '</span></div>';
      }).join('');
    } else {
      skHtml += '<div class="text-muted">No recent skills</div>';
    }
    skHtml += '</div></div>';
    html += skHtml;

    // Journal
    var jrHtml = '<div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)"><div style="padding:12px;border-bottom:1px solid var(--border);font-weight:600">Recent Journal (' + journal.length + ')</div><div style="padding:12px;max-height:300px;overflow-y:auto;font-size:12px">';
    if (journal.length) {
      jrHtml += journal.slice(-5).map(function(e) {
        return '<div style="margin-bottom:8px;padding:8px;background:var(--bg-secondary);border-radius:4px"><strong>' + (e.date || '') + '</strong><br><span style="color:var(--text-secondary)">' + escapeHtml((e.preview || '').substring(0, 150)) + '</span></div>';
      }).join('');
    } else {
      jrHtml += '<div class="text-muted">No journal entries</div>';
    }
    jrHtml += '</div></div>';
    html += jrHtml;

    // Brain & Projects
    var bpHtml = '<div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)"><div style="padding:12px;border-bottom:1px solid var(--border);font-weight:600">Business Brain &amp; Projects</div><div style="padding:12px;max-height:300px;overflow-y:auto;font-size:12px">';
    if (brain) bpHtml += '<strong>Business Brain:</strong><br><span style="color:var(--text-secondary)">' + escapeHtml(brain.substring(0, 300)) + '...</span><br><br>';
    if (projects) bpHtml += '<strong>Active Projects:</strong><br><span style="color:var(--text-secondary)">' + escapeHtml(projects.substring(0, 300)) + '...</span>';
    if (!brain && !projects) bpHtml += '<div class="text-muted">No brain data</div>';
    bpHtml += '</div></div>';
    html += bpHtml;

    html += '</div>';
    sources.innerHTML = html;
  }
}

function copyInjectedContext() {
  var result = contextState.result;
  if (!result || !result.injected_context) return;
  navigator.clipboard.writeText(result.injected_context);
  showToast('Context copied to clipboard', 'success');
}

function useInjectedContext() {
  var result = contextState.result;
  if (!result || !result.injected_context) return;
  showToast('Open AI Chat and paste the context', 'info');
  closeContextResult();
}

function closeContextResult() {
  document.getElementById('contextResult').style.display = 'none';
  document.getElementById('contextSources').style.display = 'none';
}

function showCreateRuleModal() {
  showContextRuleModal();
}

function showContextRuleModal(rule) {
  var isEdit = !!rule;
  var r = rule || { name: '', trigger_keywords: [], include_sources: ['semantic', 'kg', 'brain'], max_items: 10, priority: 0, enabled: true };
  var title = isEdit ? 'Edit Context Rule' : 'Create Context Rule';

  var sourcesHtml = '';
  var sourceOptions = ['semantic', 'kg', 'skills', 'journal', 'brain'];
  var labels = ['Semantic Search', 'Knowledge Graph', 'Recent Skills', 'Journal', 'Brain Files'];
  for (var i = 0; i < sourceOptions.length; i++) {
    var src = sourceOptions[i];
    var checked = (r.include_sources || []).includes(src) ? 'checked' : '';
    sourcesHtml += '<label class="switch" style="align-items:center"><input type="checkbox" id="src' + src.charAt(0).toUpperCase() + src.slice(1) + '" ' + checked + '><span class="switch-slider"></span><span style="margin-left:6px;font-size:13px">' + labels[i] + '</span></label>';
  }

  showModal(title, '<div style="max-height:500px;overflow-y:auto"><div class="form-group"><label class="form-label">Rule Name</label><input class="form-input" id="ruleName" value="' + escapeHtml(r.name || '') + '" placeholder="e.g., GCP Infrastructure Tasks"></div><div class="form-group"><label class="form-label">Trigger Keywords (comma-separated)</label><input class="form-input" id="ruleTriggers" value="' + (r.trigger_keywords || []).join(', ') + '" placeholder="gcp, infrastructure, audit, cloud"></div><div class="form-group"><label class="form-label">Include Sources</label><div style="display:flex;gap:8px;flex-wrap:wrap">' + sourcesHtml + '</div></div><div class="form-group"><label class="form-label">Max Items</label><input type="number" class="form-input" id="ruleMaxItems" value="' + (r.max_items || 10) + '" min="1" max="50" style="width:100px"></div><div class="form-group"><label class="form-label">Priority</label><input type="number" class="form-input" id="rulePriority" value="' + (r.priority || 0) + '" min="-10" max="10" style="width:100px"></div><div class="form-group"><label class="switch"><input type="checkbox" id="ruleEnabled" ' + (r.enabled ? 'checked' : '') + '><span class="switch-slider"></span><span style="margin-left:8px">Enabled</span></label></div></div>', '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="' + (isEdit ? 'saveContextRule(\'' + r.id + '\')' : 'createContextRule()') + '">' + (isEdit ? 'Save' : 'Create') + '</button>');
}

async function createContextRule() {
  var name = document.getElementById('ruleName')?.value?.trim();
  var triggers = document.getElementById('ruleTriggers')?.value?.split(',').map(function(t) { return t.trim(); }).filter(Boolean) || [];
  var sources = [];
  if (document.getElementById('srcSemantic')?.checked) sources.push('semantic');
  if (document.getElementById('srcKg')?.checked) sources.push('kg');
  if (document.getElementById('srcSkills')?.checked) sources.push('skills');
  if (document.getElementById('srcJournal')?.checked) sources.push('journal');
  if (document.getElementById('srcBrain')?.checked) sources.push('brain');
  var maxItems = parseInt(document.getElementById('ruleMaxItems')?.value || '10');
  var priority = parseInt(document.getElementById('rulePriority')?.value || '0');
  var enabled = document.getElementById('ruleEnabled')?.checked || false;

  if (!name) { showToast('Rule name required', 'warning'); return; }
  if (triggers.length === 0) { showToast('At least one trigger keyword required', 'warning'); return; }
  if (sources.length === 0) { showToast('At least one source required', 'warning'); return; }

  try {
    await api.createContextRule({ name: name, trigger_keywords: triggers, include_sources: sources, max_items: maxItems, priority: priority, enabled: enabled });
    closeModal();
    showToast('Rule created', 'success');
    await loadContextRules();
  } catch (err) { showToast('Create failed: ' + err.message, 'error'); }
}

async function editContextRule(ruleId) {
  var rule = contextState.rules.find(function(r) { return r.id === ruleId; });
  if (rule) showContextRuleModal(rule);
}

async function saveContextRule(ruleId) {
  var name = document.getElementById('ruleName')?.value?.trim();
  var triggers = document.getElementById('ruleTriggers')?.value?.split(',').map(function(t) { return t.trim(); }).filter(Boolean) || [];
  var sources = [];
  if (document.getElementById('srcSemantic')?.checked) sources.push('semantic');
  if (document.getElementById('srcKg')?.checked) sources.push('kg');
  if (document.getElementById('srcSkills')?.checked) sources.push('skills');
  if (document.getElementById('srcJournal')?.checked) sources.push('journal');
  if (document.getElementById('srcBrain')?.checked) sources.push('brain');
  var maxItems = parseInt(document.getElementById('ruleMaxItems')?.value || '10');
  var priority = parseInt(document.getElementById('rulePriority')?.value || '0');
  var enabled = document.getElementById('ruleEnabled')?.checked || false;

  if (!name) { showToast('Rule name required', 'warning'); return; }
  if (triggers.length === 0) { showToast('At least one trigger keyword required', 'warning'); return; }
  if (sources.length === 0) { showToast('At least one source required', 'warning'); return; }

  try {
    await api.updateContextRule(ruleId, { name: name, trigger_keywords: triggers, include_sources: sources, max_items: maxItems, priority: priority, enabled: enabled });
    closeModal();
    showToast('Rule updated', 'success');
    await loadContextRules();
  } catch (err) { showToast('Update failed: ' + err.message, 'error'); }
}

async function deleteContextRule(ruleId) {
  if (!confirm('Delete this context rule?')) return;
  try {
    await api.deleteContextRule(ruleId);
    showToast('Rule deleted', 'success');
    await loadContextRules();
  } catch (err) { showToast('Delete failed: ' + err.message, 'error'); }
}

window.renderContextInjection = renderContextInjection;
window.injectContext = injectContext;
window.loadContextRules = loadContextRules;
window.showCreateRuleModal = showCreateRuleModal;
window.showContextRuleModal = showContextRuleModal;
window.createContextRule = createContextRule;
window.editContextRule = editContextRule;
window.saveContextRule = saveContextRule;
window.deleteContextRule = deleteContextRule;
window.copyInjectedContext = copyInjectedContext;