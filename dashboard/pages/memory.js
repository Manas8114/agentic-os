let _brainCache = {};

async function renderMemory() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div style="display:flex;height:calc(100vh - 64px);margin:-32px;">
      <!-- Memory Sidebar -->
      <div style="width:280px;min-width:280px;border-right:1px solid var(--mc-border);background:var(--mc-surface);display:flex;flex-direction:column;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--mc-border);">
          <div style="font-weight:600;font-size:16px;color:var(--mc-text-primary);margin-bottom:4px;">Second Brain</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);margin-bottom:16px;">Shared knowledge graph</div>
          <div class="mc-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-left:12px;color:var(--mc-text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="memSearch" placeholder="Search memory..." oninput="filterMemory()" style="background:transparent;border:none;color:var(--mc-text-primary);font-size:13px;width:100%;outline:none;padding:8px;"/>
          </div>
        </div>
        <div id="memoryList" style="flex:1;overflow-y:auto;padding:12px;">
          <div class="loading" style="padding:40px;text-align:center;"><div class="loading-spinner"></div></div>
        </div>
      </div>
      
      <!-- Main Editor/Viewer -->
      <div id="memoryEditor" style="flex:1;background:var(--mc-bg);display:flex;flex-direction:column;position:relative;">
        <div style="padding:40px;text-align:center;color:var(--mc-text-muted);display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
          <div style="font-size:48px;margin-bottom:16px;">🧠</div>
          <div style="font-weight:600;font-size:16px;color:var(--mc-text-primary);">Select a document</div>
          <div style="font-size:13px;max-width:300px;margin-top:8px;">Access the shared context and long-term memory of all agents.</div>
        </div>
      </div>
    </div>
  `;

  try {
    const brain = await api.getBrain();
    _brainCache = brain;
    renderMemoryList();
  } catch (err) {
    (document.getElementById('memoryList') || {}).innerHTML = `<div style="color:var(--mc-red);font-size:13px;padding:16px;">Failed to load memory: ${err.message}</div>`;
  }
}

function filterMemory() {
  const q = document.getElementById('memSearch')?.value.toLowerCase() || '';
  renderMemoryList(q);
}

function renderMemoryList(filterQuery = '') {
  const container = document.getElementById('memoryList');
  if (!container) return;
  
  const files = Object.entries(_brainCache);
  if (files.length === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--mc-text-muted);font-size:13px;">No memory files found.</div>';
    return;
  }

  const filtered = filterQuery 
    ? files.filter(([name]) => name.toLowerCase().includes(filterQuery))
    : files;

  container.innerHTML = filtered.map(([name, content]) => {
    const isProject = name.includes('projects');
    const isGoal = name.includes('goals');
    const icon = isProject ? '🚀' : isGoal ? '🎯' : '📄';
    const lines = content ? content.split('\n').length : 0;
    
    return `
      <div onclick="openMemoryFile('${name}')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--mc-radius);cursor:pointer;transition:var(--mc-transition);margin-bottom:4px;" onmouseover="this.style.background='var(--mc-surface-hover)'" onmouseout="this.style.background='transparent'">
        <div style="font-size:16px;">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${name.replace('.md', '').replace(/-/g, ' ')}</div>
          <div style="font-size:11px;color:var(--mc-text-muted);">${lines} lines</div>
        </div>
      </div>
    `;
  }).join('');
}

async function openMemoryFile(name) {
  const editor = document.getElementById('memoryEditor');
  if (!editor) return;
  
  const display = name.replace('.md', '').replace(/-/g, ' ');
  editor.innerHTML = `<div class="loading" style="padding:60px;text-align:center;"><div class="loading-spinner"></div></div>`;
  
  try {
    const r = await api.getBrainFile(name);
    const content = r.content || '';
    
    editor.innerHTML = `
      <div style="padding:20px 32px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;background:var(--mc-bg);">
        <div>
          <div style="font-weight:600;font-size:18px;color:var(--mc-text-primary);margin-bottom:4px;">${display}</div>
          <div style="font-size:12px;color:var(--mc-text-muted);font-family:var(--mc-font-mono);">${name}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="mc-btn mc-btn-primary" onclick="saveMemoryFile('${name}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Changes
          </button>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;">
        <textarea id="memEditorArea" style="flex:1;width:100%;resize:none;border:none;background:var(--mc-bg);color:var(--mc-text-primary);font-family:var(--mc-font-mono);font-size:13px;padding:32px;line-height:1.6;outline:none;">${escapeHtml(content)}</textarea>
      </div>
    `;
  } catch (err) {
    editor.innerHTML = `<div style="padding:40px;color:var(--mc-red);font-size:14px;">Error loading file: ${err.message}</div>`;
  }
}

async function saveMemoryFile(name) {
  const content = document.getElementById('memEditorArea')?.value || '';
  try {
    await api.updateBrainFile(name, content);
    showToast('Saved to memory', 'success');
    _brainCache[name] = content;
    renderMemoryList(document.getElementById('memSearch')?.value || '');
  } catch (err) {
    showToast(`Error saving: ${err.message}`, 'error');
  }
}
