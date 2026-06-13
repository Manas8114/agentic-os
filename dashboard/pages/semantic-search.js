// Semantic Search / Vector Memory — Semantic search over all agent memory
let semanticState = {
  query: '',
  results: [],
  stats: {},
  searching: false,
  selectedResult: null,
};

async function renderSemanticSearch() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div class="mc-header-left">
        <h1 class="mc-title">Semantic Search</h1>
        <p class="mc-subtitle">Vector-based semantic search over all agent memory</p>
      </div>
      <div class="mc-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="mc-btn mc-btn-warning" onclick="reindexMemory()">🔄 Reindex All</button>
        <button class="mc-btn mc-btn-primary" onclick="loadVectorStats()">📊 Refresh Stats</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="mc-card" style="margin-bottom:16px" id="vectorStatsBar">
      <div class="mc-loading"><div class="mc-spinner"></div></div>
    </div>

    <!-- Search Box -->
    <div class="mc-card" style="margin-bottom:16px">
      <div class="mc-card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:300px">
            <input type="text" id="semanticQuery" class="mc-input" placeholder="Search all memory semantically... (e.g., 'GCP infrastructure audit', 'daily standup notes', 'skill chain for research')" style="width: 100%; padding:12px 16px" onkeydown="handleSearchKeydown(event)">
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="searchTopK" class="mc-select" style="width:auto;min-width:100px">
              <option value="5">Top 5</option>
              <option value="10" selected>Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
            </select>
            <select id="searchMinScore" class="mc-select" style="width:auto;min-width:120px">
              <option value="0.1">Min Score: 0.1 (Broad)</option>
              <option value="0.3" selected>Min Score: 0.3</option>
              <option value="0.5">Min Score: 0.5</option>
              <option value="0.7">Min Score: 0.7 (Strict)</option>
            </select>
            <button class="mc-btn mc-btn-primary" onclick="performSearch()" id="searchBtn" style="padding:0 20px;height:38px">
              <span id="searchBtnText">🔍 Search</span>
              <span id="searchBtnSpinner" class="mc-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Search Suggestions -->
    <div class="mc-card" style="margin-bottom:16px">
      <div class="mc-card-body" style="padding:12px 16px">
        <strong style="font-size:12px;color:var(--text-muted)">Quick searches:</strong>
        <div id="quickSearches" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
      </div>
    </div>

    <!-- Results -->
    <div class="mc-card">
      <div class="mc-card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="mc-card-title">Search Results</h3>
        <div style="font-size:12px;color:var(--text-muted)" id="resultsCount">0 results</div>
      </div>
      <div class="mc-card-body" style="padding:0" id="searchResults">
        <div class="mc-empty" style="padding:60px 20px;text-align:center">
          <div class="mc-empty-icon">🔍</div>
          <div class="mc-empty-title">Enter a query to search</div>
          <div class="mc-empty-desc">Semantic search finds conceptually similar content, not just keywords</div>
        </div>
      </div>
    </div>

    <!-- Result Detail Modal (inline) -->
    <div id="resultDetailModal" style="display:none"></div>
  `;

  await Promise.all([loadVectorStats(), loadQuickSearches()]);
}

async function loadVectorStats() {
  try {
    const data = await api.getVectorStats();
    if (!data) return; // Auth required
    semanticState.stats = data;
    renderVectorStats();
  } catch (err) {
    console.error('Failed to load vector stats:', err);
  }
}

async function loadQuickSearches() {
  const container = document.getElementById('quickSearches');
  if (!container) return;

  const suggestions = [
    { query: 'GCP infrastructure audit', icon: '☁️' },
    { query: 'daily standup notes', icon: '☀️' },
    { query: 'skill chain for research', icon: '⛓️' },
    { query: 'agent handoff protocol', icon: '🤝' },
    { query: 'cost analytics setup', icon: '💰' },
    { query: 'kanban task automation', icon: '📋' },
    { query: 'memory consolidation schedule', icon: '🧠' },
    { query: 'agent health monitoring', icon: '🏥' },
  ];

  container.innerHTML = suggestions.map(s => `
    <button class="mc-btn mc-btn-ghost mc-btn-sm" onclick="setQuickSearch('${s.query}')" style="display:flex;align-items:center;gap:6px;font-size:12px">
      <span>${s.icon}</span> ${s.query}
    </button>
  `).join('');
}

function renderVectorStats() {
  const container = document.getElementById('vectorStatsBar');
  if (!container) return;

  const total = semanticState.stats.total_vectors || 0;
  const bySource = semanticState.stats.by_source || {};
  const dbSize = semanticState.stats.db_size_bytes || 0;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
      <div style="display:flex;gap:24px">
        <div><strong style="color:var(--text-primary)">${total}</strong> <span style="color:var(--text-muted);font-size:12px">vectors</span></div>
        <div><strong style="color:var(--text-primary)">${semanticState.stats.embedding_dim || 1536}</strong> <span style="color:var(--text-muted);font-size:12px">dimensions</span></div>
        <div><strong style="color:var(--text-primary)">${formatBytes(dbSize)}</strong> <span style="color:var(--text-muted);font-size:12px">storage</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        ${Object.entries(bySource).map(([src, count]) => `
          <span class="mc-badge mc-badge-info">${src} (${count})</span>
        `).join('')}
      </div>
    </div>
  `;
}

function setQuickSearch(query) {
  document.getElementById('semanticQuery').value = query;
  performSearch();
}

function handleSearchKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    performSearch();
  }
}

async function performSearch() {
  const query = document.getElementById('semanticQuery')?.value?.trim();
  if (!query) return;

  const btn = document.getElementById('searchBtn');
  const btnText = document.getElementById('searchBtnText');
  const btnSpinner = document.getElementById('searchBtnSpinner');
  const topK = parseInt(document.getElementById('searchTopK')?.value || '10');
  const minScore = parseFloat(document.getElementById('searchMinScore')?.value || '0.3');

  if (!query) return;

  btn.disabled = true;
  btnText.textContent = 'Searching...';
  btnSpinner.style.display = 'inline-block';

  try {
    const data = await api.searchMemory({ query, top_k: topK, min_score: minScore });
    semanticState.results = data.results || [];
    semanticState.query = query;
    renderSearchResults();
  } catch (err) {
    showToast('Search failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🔍 Search';
    btnSpinner.style.display = 'none';
  }
}

function renderSearchResults() {
  const countEl = document.getElementById('resultsCount');
  const container = document.getElementById('searchResults');

  if (countEl) countEl.textContent = `${semanticState.results.length} result${semanticState.results.length !== 1 ? 's' : ''}`;

  if (!container) return;

  if (semanticState.results.length === 0) {
    container.innerHTML = '<div class="mc-empty" style="padding:60px 20px;text-align:center"><div class="mc-empty-icon">🔍</div><div class="mc-empty-title">No results found</div><div class="mc-empty-desc">Try a different query or lower the minimum score threshold</div></div>';
    return;
  }

  container.innerHTML = semanticState.results.map((result, idx) => {
    const sourceIcons = {
      brain: '🧠',
      journal: '📓',
      skill: '⚡',
      audit: '📋',
    };
    const sourceIcon = sourceIcons[result.source] || '📄';
    const badgeClass = result.source === 'brain' ? 'mc-badge-primary' : 
                      result.source === 'journal' ? 'mc-badge-success' : 
                      result.source === 'skill' ? 'mc-badge-warning' : 'mc-badge-danger';

    return `
      <div class="semantic-result" style="padding:16px;border-bottom:1px solid var(--mc-border);transition:var(--mc-transition);cursor:pointer;"
           onmouseover="this.style.background='var(--mc-hover)'"
           onmouseout="this.style.background=''"
           onclick="showResultDetail(${idx})">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:20px;line-height:1">${sourceIcon}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:600;font-size:14px;color:var(--text-primary)">${escapeHtml(result.content_id)}</span>
              <span class="mc-badge ${badgeClass}">${sourceIcon} ${result.source}</span>
              <span class="mc-badge mc-badge-success">${(result.score * 100).toFixed(1)}%</span>
              <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${result.indexed_at ? new Date(result.indexed_at).toLocaleString() : '—'}</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;line-height:1.5">${escapeHtml(result.text_preview)}</div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap">
              ${Object.entries(result.metadata || {}).map(([k, v]) => `<span><strong style="color:var(--text-primary)">${k}:</strong> ${escapeHtml(String(v))}</span>`).join('')}
            </div>
          </div>
          <span style="font-size:18px;color:var(--text-muted)">▸</span>
        </div>
      </div>
    `;
  }).join('');
}

function showResultDetail(idx) {
  const result = semanticState.results[idx];
  if (!result) return;
  semanticState.selectedResult = result;

  const modal = document.getElementById('resultDetailModal');
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="mc-modal-overlay" onclick="if(event.target===this)closeResultDetail()" style="display:flex">
      <div class="mc-modal" style="max-width:800px;width:100%;max-height:80vh;display:flex;flex-direction:column">
        <div class="mc-modal-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <span class="mc-modal-title">${escapeHtml(result.content_id)}</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Source: ${result.source} · Score: ${(result.score * 100).toFixed(1)}%</div>
          </div>
          <button class="mc-btn mc-btn-ghost" style="padding:4px 8px" onclick="closeResultDetail()">✕</button>
        </div>
        <div class="mc-modal-body" style="padding:20px;overflow-y:auto">
          <div style="margin-bottom:16px;padding:12px;background:var(--bg-black);border:1px solid var(--mc-border);border-radius:4px;font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${escapeHtml(result.text_preview)}</div>
          
          <div style="margin-bottom:16px">
            <strong style="font-size:12px;color:var(--text-muted)">Metadata</strong>
            <div style="margin-top:8px;font-size:12px;color:var(--text-secondary)">
              ${Object.entries(result.metadata || {}).map(([k, v]) => `<div><strong style="color:var(--text-primary)">${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`).join('')}
            </div>
          </div>

          <div>
            <strong style="font-size:12px;color:var(--text-muted)">Indexed</strong>
            <div style="margin-top:4px;font-size:12px;color:var(--text-secondary)">${result.indexed_at ? new Date(result.indexed_at).toLocaleString() : 'Unknown'}</div>
          </div>
        </div>
        <div class="mc-modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="mc-btn mc-btn-ghost" onclick="closeResultDetail()">Close</button>
          <button class="mc-btn mc-btn-primary" onclick="closeResultDetail(); navigate('memory'); showToast('Open Memory page to view full content', 'info')">Open in Memory</button>
        </div>
      </div>
    </div>
  `;
}

function closeResultDetail() {
  const modal = document.getElementById('resultDetailModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
  semanticState.selectedResult = null;
}

async function reindexMemory() {
  if (!confirm('Rebuild the entire vector index from all memory sources? This may take a moment.')) return;
  
  try {
    showToast('Reindexing all memory...', 'info');
    const result = await api.reindexMemory();
    showToast(`Reindex complete: ${result.indexed} items indexed`, 'success');
    await loadVectorStats();
  } catch (err) {
    showToast('Reindex failed: ' + err.message, 'error');
  }
}

window.renderSemanticSearch = renderSemanticSearch;
window.performSearch = performSearch;
window.reindexMemory = reindexMemory;
window.showResultDetail = showResultDetail;
window.closeResultDetail = closeResultDetail;
window.setQuickSearch = setQuickSearch;
window.loadVectorStats = loadVectorStats;
window.loadQuickSearches = loadQuickSearches;