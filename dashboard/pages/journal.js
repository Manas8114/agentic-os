// Journal Enhancement — Templates, Tags, Linking, Enhanced UI
let journalState = {
  currentDate: '',
  currentEntry: null,
  entries: [],
  templates: {},
  tags: [],
  saveTimer: null,
  searchQuery: '',
  viewMode: 'editor', // 'editor' | 'list' | 'tags' | 'timeline'
};

const DEFAULT_TEMPLATES = {
  daily: {
    name: '📋 Daily Note',
    content: `# {date}

## 🎯 Today's Focus
- 

## ✅ Completed
- 

## 📝 Notes
- 

## 🔗 Links
- [[entity:name]] — link to knowledge graph
- #tag — tag for filtering
`,
    description: 'Structured daily note with focus, completed, and notes sections'
  },
  standup: {
    name: '☀️ Daily Standup',
    content: `# Standup - {date}

## Yesterday
- 

## Today
- 

## Blockers
- 

## Mood: 😐/😊/😤
`,
    description: 'Team standup format with yesterday/today/blockers'
  },
  retrospective: {
    name: '🔄 Weekly Retrospective',
    content: `# Weekly Retrospective - {date}

## 🎉 What Went Well
- 

## 🤔 What Could Be Better
- 

## 🎯 Action Items
- 

## 📊 Metrics
- 
`,
    description: 'End-of-week reflection with wins, improvements, and actions'
  },
  meeting: {
    name: '🤝 Meeting Notes',
    content: `# Meeting: {title} - {date}

## Attendees
- 

## Agenda
- 

## Decisions
- 

## Action Items
- [ ] 

## Notes
- 
`,
    description: 'Structured meeting notes with decisions and action items'
  },
  research: {
    name: '🔬 Research Log',
    content: `# Research: {topic} - {date}

## Question
- 

## Findings
- 

## Sources
- 

## Next Steps
- 
`,
    description: 'Research log with question, findings, sources, and next steps'
  },
};

async function renderJournal() {
  const today = new Date().toISOString().split('T')[0];
  journalState.currentDate = today;

  // Load templates and tags
  await loadTemplates();
  await loadTags();

  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Journal</h1>
        <p class="page-subtitle">Daily entries with templates, tags, linking, and timeline views</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="journalViewMode" class="form-select" onchange="setJournalView(this.value)" style="width:auto;min-width:160px">
          <option value="editor">✏️ Editor</option>
          <option value="list">📋 List</option>
          <option value="tags">🏷️ Tags</option>
          <option value="timeline">📅 Timeline</option>
        </select>
        <button class="btn btn-ghost" onclick="renderJournal()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px;display:flex;gap:24px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:120px"><div class="metric-tile-value" id="journalTotalCount">0</div><div class="metric-tile-label">Total Entries</div></div>
        <div style="flex:1;min-width:120px"><div class="metric-tile-value" id="journalWordCount">0</div><div class="metric-tile-label">Words (Current)</div></div>
        <div style="flex:1;min-width:120px"><div class="metric-tile-value" id="journalStreak">0</div><div class="metric-tile-label">Day Streak</div></div>
        <div style="flex:1;min-width:120px"><div class="metric-tile-value" id="journalTotalWords">0</div><div class="metric-tile-label">All-Time Words</div></div>
        <div style="flex:1;min-width:120px"><div class="metric-tile-value" id="journalTagCount">0</div><div class="metric-tile-label">Unique Tags</div></div>
      </div>
    </div>

    <!-- Editor View -->
    <div id="viewEditor" style="display:block">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <input class="form-input" type="date" id="journalDatePicker" value="${today}" onchange="loadJournalEntry(this.value)" style="width:160px">
            <span style="font-weight:600;font-size:14px" id="journalDateLabel">${formatDateDisplay(today)}</span>
            <span class="badge badge-info" id="journalSaveStatus">Auto-save on</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select id="journalTemplate" class="form-select" onchange="applyTemplate(this.value)" style="width:auto;min-width:180px">
              <option value="">📄 Use Template...</option>
              ${Object.entries(DEFAULT_TEMPLATES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
            </select>
            <select id="journalTagFilter" class="form-select" onchange="filterByTag(this.value)" style="width:auto;min-width:160px">
              <option value="">🏷️ Filter by Tag...</option>
            </select>
            <button class="btn btn-primary" onclick="saveJournalEntry()">💾 Save Now</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <textarea id="journalText" placeholder="Write your daily entry here... Markdown supported. Use [[Entity Name]] for knowledge graph links, #tag for tags." oninput="scheduleJournalSave()" style="width:100%;min-height:400px;padding:16px;border:none;resize:vertical;background:transparent;font-family:var(--font-mono);font-size:14px;line-height:1.6;color:var(--text-primary);outline:none"></textarea>
        </div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--text-muted)">
          <span>Shortcuts: <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">Ctrl+S</kbd> Save | <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">Ctrl+B</kbd> Bold | <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">Ctrl+I</kbd> Italic | <kbd style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">Ctrl+K</kbd> Link</span>
          <span id="journalCharCount">0 chars</span>
          <span id="journalLinkCount">0 links</span>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div id="viewList" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:12px 16px">
          <input class="form-input" id="journalListSearch" placeholder="Search entries..." style="width:100%;max-width:400px" oninput="debounceJournalSearch(this.value)">
        </div>
      </div>
      <div class="card" id="journalListContainer"></div>
    </div>

    <!-- Tags View -->
    <div id="viewTags" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3 class="card-title">All Tags</h3></div>
        <div class="card-body" style="padding:0" id="tagsCloud"></div>
      </div>
      <div class="card" id="taggedEntriesContainer"></div>
    </div>

    <!-- Timeline View -->
    <div id="viewTimeline" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <input class="form-input" type="month" id="timelineMonth" onchange="loadTimeline(this.value)" style="width:auto;min-width:160px">
        </div>
      </div>
      <div class="card" id="timelineContainer"></div>
    </div>
  `;

  await loadJournalEntry(today);
  await loadJournalEntries();
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function loadTemplates() {
  journalState.templates = { ...DEFAULT_TEMPLATES };
  // Could load custom templates from storage later
}

async function loadTags() {
  journalState.tags = extractAllTags(journalState.entries);
  updateTagFilter();
}

function extractAllTags(entries) {
  const tagSet = new Set();
  for (const entry of entries) {
    const tags = extractTags(entry.content || '');
    tags.forEach(t => tagSet.add(t));
  }
  return Array.from(tagSet).sort();
}

function extractTags(text) {
  const matches = text.match(/#[\w-]+/g) || [];
  return matches.map(t => t.substring(1));
}

function applyTemplate(templateKey) {
  const template = DEFAULT_TEMPLATES[templateKey];
  if (!template) return;
  const textarea = document.getElementById('journalText');
  if (!textarea) return;
  const dateStr = formatDateDisplay(journalState.currentDate);
  let content = template.content
    .replace(/\{date\}/g, journalState.currentDate)
    .replace(/\{title\}/g, 'Meeting Title')
    .replace(/\{topic\}/g, 'Research Topic');
  textarea.value = content;
  scheduleJournalSave();
  document.getElementById('journalTemplate').value = '';
  showToast(`Applied template: ${template.name}`, 'success');
}

function updateTagFilter() {
  const select = document.getElementById('journalTagFilter');
  if (select) {
    const current = select.value;
    const tags = [...new Set(journalState.tags)];
    select.innerHTML = '<option value="">🏷️ Filter by Tag...</option>' + tags.map(t => `<option value="${t}">#${t}</option>`).join('');
    select.value = current;
  }
  renderTagsCloud();
}

function renderTagsCloud() {
  const container = document.getElementById('tagsCloud');
  if (!container) return;
  
  // Count tag frequencies
  const tagCounts = {};
  for (const entry of journalState.entries) {
    const tags = extractTags(entry.content || '');
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  if (Object.keys(tagCounts).length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">No tags yet</div><div class="empty-state-desc">Use #tag in your entries to organize them</div></div>';
    return;
  }
  
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:16px">' + sortedTags.map(([tag, count]) => `
    <button class="btn btn-sm btn-ghost" onclick="filterByTag('${tag}')" style="display:flex;align-items:center;gap:6px;padding:6px 12px">
      <span>#${tag}</span>
      <span class="badge" style="background:var(--purple-dim);color:var(--purple);font-size:10px">${count}</span>
    </button>
  `).join('') + '</div>';
}

function filterByTag(tag) {
  if (!tag) { setJournalView('list'); return; }
  setJournalView('list');
  const filtered = journalState.entries.filter(e => (e.content || '').includes('#' + tag));
  renderJournalList(filtered);
  document.getElementById('journalTagFilter').value = tag;
}

function debounceJournalSearch(value) {
  clearTimeout(journalState.saveTimer);
  journalState.saveTimer = setTimeout(() => { journalState.searchQuery = value; filterJournalList(); }, 300);
}

function filterJournalList() {
  const query = journalState.searchQuery.toLowerCase();
  const filtered = journalState.entries.filter(e => 
    (e.content || '').toLowerCase().includes(query) || e.date.includes(query)
  );
  renderJournalList(filtered);
}

function renderJournalList(entries) {
  const container = document.getElementById('journalListContainer');
  if (!container) return;
  
  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px"><div class="empty-state-icon">📓</div><div class="empty-state-title">No entries found</div></div>';
    return;
  }
  
  container.innerHTML = entries.slice(0, 100).map(e => `
    <div class="card" style="cursor:pointer;margin-bottom:8px;transition:var(--transition)" 
         onclick="loadJournalEntry('${e.date}');document.getElementById('journalDatePicker').value='${e.date}';setJournalView('editor')"
         onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="padding:12px 16px;display:flex;align-items:flex-start;gap:12px">
        <div style="font-weight:600;min-width:100px;color:var(--accent)">${e.date}</div>
        <div style="flex:1;min-width:0;font-size:13px;color:var(--text-secondary);line-height:1.6">${escapeHtml((e.content || '').substring(0, 300))}${(e.content || '').length > 300 ? '...' : ''}</div>
        <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">${extractTags(e.content || '').map(t => '#' + t).join(' ') || '—'}</div>
      </div>
    </div>
  `).join('');
}

async function loadJournalEntry(date) {
  journalState.currentDate = date;
  const label = document.getElementById('journalDateLabel');
  if (label) label.textContent = formatDateDisplay(date);
  const textarea = document.getElementById('journalText');
  if (!textarea) return;
  try {
    const data = await api.getJournalEntry(date);
    textarea.value = data.content || '';
    textarea.dataset.loaded = 'true';
    updateEditorStats(data.content || '');
    const status = document.getElementById('journalSaveStatus');
    if (status) status.textContent = 'Loaded ✓';
  } catch (err) {
    textarea.value = '';
    updateEditorStats('');
  }
}

function scheduleJournalSave() {
  if (journalState.saveTimer) clearTimeout(journalState.saveTimer);
  journalState.saveTimer = setTimeout(saveJournalEntry, 2000);
  const status = document.getElementById('journalSaveStatus');
  if (status) status.textContent = 'Unsaved changes...';
  updateEditorStats(document.getElementById('journalText')?.value || '');
}

function updateEditorStats(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const links = (content.match(/\[\[.*?\]\]/g) || []).length;
  const tags = (content.match(/#[\w-]+/g) || []).length;
  
  const wc = document.getElementById('journalWordCount');
  if (wc) wc.textContent = words;
  const cc = document.getElementById('journalCharCount');
  if (cc) cc.textContent = `${chars} chars`;
  const lc = document.getElementById('journalLinkCount');
  if (lc) lc.textContent = `${links} links, ${tags} tags`;
}

async function saveJournalEntry() {
  const textarea = document.getElementById('journalText');
  if (!textarea) return;
  const content = textarea.value;
  const date = journalState.currentDate;
  try {
    await api.saveJournalEntry(date, content);
    const status = document.getElementById('journalSaveStatus');
    if (status) status.textContent = 'Saved ✓';
    updateEditorStats(content);
    
    // Extract and save tags
    const tags = extractTags(content);
    for (const tag of tags) {
      if (!journalState.tags.includes(tag)) {
        journalState.tags.push(tag);
      }
    }
    updateTagFilter();
    
    // Reload entries to update list
    await loadJournalEntries();
    
    // Index into knowledge graph for tags and entities
    await indexJournalToKG(date, content);
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
    const status = document.getElementById('journalSaveStatus');
    if (status) status.textContent = 'Save failed';
  }
}

async function indexJournalToKG(date, content) {
  try {
    await api.indexMemory({ source: 'journal', content_id: date, text: content, metadata: { date } });
  } catch (e) { /* silent */ }
}

async function loadJournalEntries() {
  try {
    const data = await api.getJournalEntries();
    journalState.entries = data.entries || [];
    updateStats();
    if (journalState.viewMode === 'list') renderJournalList(journalState.entries);
    if (journalState.viewMode === 'tags') renderTagsCloud();
    if (journalState.viewMode === 'timeline') loadTimeline();
  } catch (err) {
    showToast('Failed to load entries: ' + err.message, 'error');
  }
}

function updateStats() {
  const totalEl = document.getElementById('journalTotalCount');
  if (totalEl) totalEl.textContent = journalState.entries.length;
  
  const totalWords = journalState.entries.reduce((sum, e) => sum + ((e.content || '').trim().split(/\s+/).length || 0), 0);
  const tw = document.getElementById('journalTotalWords');
  if (tw) tw.textContent = totalWords.toLocaleString();
  
  const streakEl = document.getElementById('journalStreak');
  if (streakEl) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (journalState.entries.some(e => e.date === ds)) { streak++; }
      else if (i > 0) break;
    }
    streakEl.textContent = streak;
  }
  
  const tc = document.getElementById('journalTagCount');
  if (tc) tc.textContent = journalState.tags.length;
}

function setJournalView(mode) {
  journalState.viewMode = mode;
  document.getElementById('viewEditor').style.display = mode === 'editor' ? 'block' : 'none';
  document.getElementById('viewList').style.display = mode === 'list' ? 'block' : 'none';
  document.getElementById('viewTags').style.display = mode === 'tags' ? 'block' : 'none';
  document.getElementById('viewTimeline').style.display = mode === 'timeline' ? 'block' : 'none';
  
  const select = document.getElementById('journalViewMode');
  if (select) select.value = mode;
  
  if (mode === 'list') { renderJournalList(journalState.entries); }
  if (mode === 'tags') { renderTagsCloud(); }
  if (mode === 'timeline') { loadTimeline(); }
}

async function searchJournal() {
  const q = document.getElementById('journalSearchInput')?.value?.trim();
  if (!q) { loadJournalEntries(); return; }
  try {
    const data = await api.searchJournal(q);
    const results = data.results || [];
    const list = document.getElementById('journalEntriesList');
    if (list) {
      if (results.length === 0) { list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No results for "${escapeHtml(q)}"</div></div>`; return; }
      list.innerHTML = `<div class="section-title">Results for "${escapeHtml(q)}"</div>${results.map(r => `<div class="card" style="cursor:pointer;margin-bottom:8px" onclick="loadJournalEntry('${r.date}');document.getElementById('journalDatePicker').value='${r.date}'"><div style="font-size:13px;font-weight:600;margin-bottom:4px">${r.date}</div><div class="text-muted text-sm">${escapeHtml(r.preview)}</div></div>`).join('')}`;
    }
  } catch (err) { showToast('Search failed: ' + err.message, 'error'); }
}

async function loadTimeline(month = null) {
  const container = document.getElementById('timelineContainer');
  if (!container) return;
  const targetMonth = month || new Date().toISOString().substring(0, 7);
  const monthEntries = journalState.entries.filter(e => e.date.startsWith(targetMonth)).sort((a,b) => b.date.localeCompare(a.date));
  
  if (monthEntries.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px"><div class="empty-state-icon">📅</div><div class="empty-state-title">No entries this month</div></div>';
    return;
  }
  
  // Group by week
  const weeks = {};
  for (const entry of monthEntries) {
    const d = new Date(entry.date + 'T00:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(entry);
  }
  
  container.innerHTML = Object.entries(weeks).sort((a,b) => b[0].localeCompare(a[0])).map(([weekStart, entries]) => `
    <div style="margin-bottom:24px">
      <div style="font-weight:600;padding:8px 12px;background:var(--bg-secondary);border-radius:var(--radius) var(--radius) 0 0;border:1px solid var(--border);border-bottom:none">Week of ${weekStart} (${entries.length} entries)</div>
      <div style="border:1px solid var(--border);border-radius:0 0 var(--radius) var(--radius);background:var(--bg-card)">
        ${entries.map(e => `<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:12px;align-items:flex-start" onclick="loadJournalEntry('${e.date}');document.getElementById('journalDatePicker').value='${e.date}';setJournalView('editor')"><div style="min-width:100px;color:var(--accent);font-weight:600">${e.date}</div><div style="flex:1;min-width:0;font-size:13px;color:var(--text-secondary)">${escapeHtml((e.content || '').substring(0, 200))}</div></div>`).join('')}
      </div>
    </div>
  `).join('');
}

window.renderJournal = renderJournal;
window.loadJournalEntry = loadJournalEntry;
window.saveJournalEntry = saveJournalEntry;
window.applyTemplate = applyTemplate;
window.filterByTag = filterByTag;
window.setJournalView = setJournalView;
window.searchJournal = searchJournal;
window.loadTimeline = loadTimeline;
window.debounceJournalSearch = debounceJournalSearch;