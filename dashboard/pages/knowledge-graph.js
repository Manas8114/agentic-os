// Knowledge Graph — Entity/relation extraction, search, and visualization
let kgState = {
  stats: null,
  searchResults: null,
  selectedEntity: null,
  graphData: { nodes: [], edges: [] },
  viewMode: 'search',
  entityMap: {},
  graphNodes: [],
  graphEdges: [],
  graphCanvas: null,
  graphCtx: null,
  graphAnimationId: null,
  graphPhysics: true,
};

async function renderKnowledgeGraph() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div>
        <h1 class="mc-title">Knowledge Graph</h1>
        <p class="mc-subtitle">Entity/relation extraction, search, and visualization across all memory</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="mc-btn" onclick="reindexKnowledgeGraph()" style="color:var(--yellow);border-color:rgba(234,179,8,0.3);">🔄 Reindex All</button>
        <button class="mc-btn primary" onclick="loadKGStats()">📊 Refresh Stats</button>
      </div>
    </div>

    <div class="mc-card" style="margin-bottom:16px;padding:12px 16px;" id="kgStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <div class="mc-card" style="margin-bottom:16px;padding:12px 16px;">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <strong style="font-size:13px;color:var(--text-primary);">View:</strong>
        <button class="mc-btn primary" onclick="setViewMode('search')" id="viewSearchBtn">🔍 Search</button>
        <button class="mc-btn" onclick="setViewMode('graph')" id="viewGraphBtn">🕸️ Graph</button>
      </div>
    </div>

    <div id="searchView" style="display:block">
      <div class="mc-card" style="margin-bottom:16px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:300px">
            <input type="text" id="kgSearchQuery" class="mc-input" placeholder="Search entities or enter entity name..." style="font-size:14px;padding:12px 16px" onkeydown="handleKGSearchKeydown(event)">
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="kgSearchDepth" class="mc-input" style="width:auto;min-width:140px;height:42px;">
              <option value="1">Depth 1</option>
              <option value="2" selected>Depth 2</option>
              <option value="3">Depth 3</option>
            </select>
            <select id="kgSearchLimit" class="mc-input" style="width:auto;min-width:100px;height:42px;">
              <option value="25">Limit 25</option>
              <option value="50" selected>Limit 50</option>
              <option value="100">Limit 100</option>
            </select>
            <button class="mc-btn primary" onclick="performKGSearch()" id="kgSearchBtn" style="padding:0 20px;height:42px">
              <span id="kgSearchBtnText">🔍 Search</span>
              <span id="kgSearchBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="mc-card" style="margin-bottom:16px">
        <strong style="font-size:12px;color:var(--text-muted)">Quick explore:</strong>
        <div id="kgQuickEntities" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
      </div>

      <div class="mc-card" style="padding:0;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border);">
          <h3 style="font-weight:600;font-size:14px;color:var(--text-primary);margin:0;">Entities</h3>
          <div style="font-size:12px;color:var(--text-muted)" id="kgResultsCount">0 results</div>
        </div>
        <div id="kgEntitiesList" style="padding:0;">
          <div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-icon">🕸️</div><div class="empty-state-title">Enter a query or click quick explore</div><div class="empty-state-desc">Search for entities or explore the graph view</div></div>
        </div>
      </div>
    </div>

    <div id="graphView" style="display:none">
      <div class="mc-card" style="height:calc(100vh - 300px);min-height:500px;padding:0;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border);">
          <h3 style="font-weight:600;font-size:14px;color:var(--text-primary);margin:0;">Graph Visualization</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:12px;color:var(--text-muted)">D3.js Force-Directed</span>
            <button class="mc-btn" style="padding:4px 8px;font-size:12px;" onclick="loadEntityNeighborhood()">🔄 Refresh</button>
          </div>
        </div>
        <div style="flex:1;position:relative;">
          <div id="d3GraphContainer" style="width:100%;height:100%;position:absolute;"></div>
        </div>
      </div>
    </div>

    <div id="kgEntityModal" style="display:none"></div>
  `;

  await loadKGStats();
}

async function loadKGStats() {
  try {
    const data = await api.getKnowledgeGraphStats();
    kgState.stats = data;
    renderKGStats();
  } catch (err) {
    console.error('Failed to load KG stats:', err);
  }
}

function renderKGStats() {
  const container = document.getElementById('kgStatsBar');
  if (!container) return;
  const stats = kgState.stats;
  if (!stats) return;
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;gap:24px">
        <div><strong style="color:var(--text-primary);">${stats.total_entities || 0}</strong> <span style="color:var(--text-muted);font-size:12px">entities</span></div>
        <div><strong style="color:var(--text-primary);">${stats.total_relations || 0}</strong> <span style="color:var(--text-muted);font-size:12px">relations</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        ${Object.entries(stats.entity_types || {}).map(([type, count]) => `<span class="mc-badge" style="background:rgba(56,189,248,0.1);color:var(--cyan);">${type} (${count})</span>`).join('')}
        ${Object.entries(stats.relation_types || {}).map(([type, count]) => `<span class="mc-badge" style="background:rgba(168,85,247,0.1);color:var(--purple);">${type} (${count})</span>`).join('')}
      </div>
    </div>
  `;
}

function setViewMode(mode) {
  kgState.viewMode = mode;
  document.getElementById('searchView').style.display = mode === 'search' ? 'block' : 'none';
  document.getElementById('graphView').style.display = mode === 'graph' ? 'block' : 'none';
  const searchBtn = document.getElementById('viewSearchBtn');
  const graphBtn = document.getElementById('viewGraphBtn');
  if (searchBtn) { searchBtn.classList.toggle('primary', mode === 'search'); }
  if (graphBtn) { graphBtn.classList.toggle('primary', mode === 'graph'); }
  if (mode === 'graph') { initGraph(); }
}

async function performKGSearch() {
  const query = document.getElementById('kgSearchQuery')?.value?.trim();
  const depth = parseInt(document.getElementById('kgSearchDepth')?.value || '2');
  const limit = parseInt(document.getElementById('kgSearchLimit')?.value || '50');
  if (!query) return;

  const btn = document.getElementById('kgSearchBtn');
  const btnText = document.getElementById('kgSearchBtnText');
  const btnSpinner = document.getElementById('kgSearchBtnSpinner');
  btn.disabled = true; btnText.textContent = 'Searching...'; btnSpinner.style.display = 'inline-block';
  try {
    const data = await api.searchKnowledgeGraph({ query, entity: '', depth, limit });
    kgState.searchResults = data;
    renderKGSearchResults();
  } catch (err) { showToast('Search failed: ' + err.message, 'error'); }
  finally { btn.disabled = false; btnText.textContent = '🔍 Search'; btnSpinner.style.display = 'none'; }
}

function renderKGSearchResults() {
  const countEl = document.getElementById('kgResultsCount');
  const container = document.getElementById('kgEntitiesList');
  if (countEl) { const total = (kgState.searchResults?.entities?.length || 0) + (kgState.searchResults?.relations?.length || 0); countEl.textContent = `${total} items`; }
  if (!container) return;
  if (!kgState.searchResults || (!kgState.searchResults.entities?.length && !kgState.searchResults.relations?.length)) { container.innerHTML = '<div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-icon">🕸️</div><div class="empty-state-title">No results</div><div class="empty-state-desc">Try a different query</div></div>'; return; }
  const entities = kgState.searchResults?.entities || [];
  const relations = kgState.searchResults?.relations || [];
  let html = '';
  if (entities.length) {
    html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><strong style="color:var(--text-primary);">Entities (' + entities.length + ')</strong></div><div style="display:flex;flex-direction:column">';
    for (const entity of entities) {
      const typeColor = getEntityTypeColor(entity.type);
      html += `<div class="kg-entity-row" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.02);cursor:pointer;transition:all 0.2s;" onclick="showEntityDetail('${entity.name}')" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''"><span style="font-size:20px">${getEntityIcon(entity.type)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;color:var(--text-primary);">${escapeHtml(entity.name)}</div><div style="display:flex;gap:8px;margin-top:2px"><span class="mc-badge" style="background:var(--${typeColor}-dim);color:var(--${typeColor})">${entity.type}</span><span style="font-size:11px;color:var(--text-muted)">${entity.mentions?.length || 0} mentions</span></div></div></div>`;
    }
    html += '</div>';
  }
  if (relations.length) {
    html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><strong style="color:var(--text-primary);">Relations (' + relations.length + ')</strong></div><div style="display:flex;flex-direction:column">';
    for (const rel of relations.slice(0, 50)) {
      html += `<div class="kg-relation-row" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.02);color:var(--text-secondary)"><span style="font-weight:600;color:var(--text-primary);">${escapeHtml(rel.source)}</span><span style="color:var(--text-muted)">→</span><span style="font-weight:600;color:var(--text-primary);">${escapeHtml(rel.target)}</span><span class="mc-badge" style="background:rgba(168,85,247,0.1);color:var(--purple);margin-left:auto">${rel.type || 'co_occurs'}</span><span style="font-size:11px;color:var(--text-muted)">${rel.source_count || 1} co-occurrences</span></div>`;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function getEntityTypeColor(type) {
  const colors = { gcp_service: 'blue', tech_stack: 'green', project: 'purple', proper_noun: 'orange', quoted: 'yellow', unknown: 'accent' };
  return colors[type] || 'accent';
}
function getEntityIcon(type) { const icons = { gcp_service: '☁️', tech_stack: '⚙️', project: '📦', proper_noun: '🏷️', quoted: '💬' }; return icons[type] || '🏷️'; }

function showEntityDetail(entityName) { setViewMode('graph'); setTimeout(() => loadEntityNeighborhood(entityName), 100); }

// D3.js Graph Visualization
let kgD3Graph = null;

function initGraph() {
  // Initialize D3 force-directed graph
  if (!window.KG_D3) {
    console.warn('D3 graph component not loaded');
    return;
  }
  
  kgD3Graph = window.KG_D3.init('d3GraphContainer');
  if (!kgD3Graph) return;
  
  // Load initial neighborhood
  loadEntityNeighborhood();
}

async function loadEntityNeighborhood(centerEntity = null) {
  try {
    const data = await api.searchKnowledgeGraph({ query: '', entity: centerEntity || '', depth: 2, limit: 100 });
    kgState.searchResults = data;
    
    // Build graph data for D3
    const entities = data.entities || [];
    const relations = data.relations || [];
    const entityMap = {};
    
    const nodes = entities.map(e => ({
      id: e.name,
      label: e.name,
      type: e.type,
      mentions: e.mentions?.length || 0,
      radius: Math.max(20, Math.min(50, 25 + (e.mentions?.length || 0) * 3)),
      color: getEntityTypeColor(e.type),
      type: e.type
    }));
    
    const entityMapLocal = {};
    nodes.forEach(n => entityMapLocal[n.id] = n);
    
    const links = relations
      .filter(r => entityMapLocal[r.source] && entityMapLocal[r.target])
      .map(r => ({
        source: entityMapLocal[r.source],
        target: entityMapLocal[r.target],
        type: r.type || 'co_occurs',
        weight: r.source_count || 1
      }));
    
    kgState.graphNodes = nodes;
    kgState.graphEdges = links;
    kgState.entityMap = entityMapLocal;
    
    // Update D3 graph
    if (kgD3Graph && kgD3Graph.setData) {
      kgD3Graph.setData({ entities, relations });
      kgD3Graph.update(nodes, links);
    }
    
    if (!centerEntity) renderKGSearchResults();
  } catch (err) { console.error('Failed to load graph:', err); }
}

function getEntityTypeColor(type) {
  const colors = { gcp_service: 'blue', tech_stack: 'green', project: 'purple', proper_noun: 'orange', quoted: 'yellow', unknown: 'accent' };
  return colors[type] || 'accent';
}
function getEntityIcon(type) { const icons = { gcp_service: '☁️', tech_stack: '⚙️', project: '📦', proper_noun: '🏷️', quoted: '💬' }; return icons[type] || '🏷️'; }

function showEntityDetail(entityName) { setViewMode('graph'); setTimeout(() => loadEntityNeighborhood(entityName), 100); }

// Remove old canvas-based functions (replaced by D3)
// Removed: initGraph, resizeGraphCanvas, buildGraphFromKGData, graphAnimationLoop, applyPhysics, drawNode, drawEdge, toggleGraphPhysics, changeGraphLayout

async function reindexKnowledgeGraph() { if (!confirm('Rebuild knowledge graph from all memory sources?')) return; showToast('Reindexing knowledge graph...', 'info'); try { const result = await api.reindexKnowledgeGraph(); showToast(`Reindex complete: ${result.indexed} items`, 'success'); await loadKGStats(); } catch (err) { showToast('Reindex failed: ' + err.message, 'error'); } }

window.renderKnowledgeGraph = renderKnowledgeGraph;
window.performKGSearch = performKGSearch;
window.reindexKnowledgeGraph = reindexKnowledgeGraph;
window.loadKGStats = loadKGStats;
window.setViewMode = setViewMode;
window.showEntityDetail = showEntityDetail;
window.initGraph = initGraph;
window.loadEntityNeighborhood = loadEntityNeighborhood;
window.toggleGraphPhysics = () => { if (kgD3Graph) kgD3Graph.togglePhysics(); };
window.changeGraphLayout = () => { if (kgD3Graph) kgD3Graph.setData({}); };