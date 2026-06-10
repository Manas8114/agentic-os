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
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Knowledge Graph</h1>
        <p class="page-subtitle">Entity/relation extraction, search, and visualization across all memory</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-warning" onclick="reindexKnowledgeGraph()">🔄 Reindex All</button>
        <button class="btn btn-primary" onclick="loadKGStats()">📊 Refresh Stats</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px" id="kgStatsBar">
      <div class="loading"><div class="loading-spinner"></div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <strong style="font-size:13px">View:</strong>
          <button class="btn btn-sm btn-primary" onclick="setViewMode('search')" id="viewSearchBtn">🔍 Search</button>
          <button class="btn btn-sm btn-ghost" onclick="setViewMode('graph')" id="viewGraphBtn">🕸️ Graph</button>
        </div>
      </div>
    </div>

    <div id="searchView" style="display:block">
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:16px">
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:300px">
              <input type="text" id="kgSearchQuery" class="form-input" placeholder="Search entities or enter entity name..." style="font-size:14px;padding:12px 16px" onkeydown="handleKGSearchKeydown(event)">
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <select id="kgSearchDepth" class="form-select" style="width:auto;min-width:140px">
                <option value="1">Depth 1</option>
                <option value="2" selected>Depth 2</option>
                <option value="3">Depth 3</option>
              </select>
              <select id="kgSearchLimit" class="form-select" style="width:auto;min-width:100px">
                <option value="25">Limit 25</option>
                <option value="50" selected>Limit 50</option>
                <option value="100">Limit 100</option>
              </select>
              <button class="btn btn-primary" onclick="performKGSearch()" id="kgSearchBtn" style="padding:0 20px;height:42px">
                <span id="kgSearchBtnText">🔍 Search</span>
                <span id="kgSearchBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:12px 16px">
          <strong style="font-size:12px;color:var(--text-muted)">Quick explore:</strong>
          <div id="kgQuickEntities" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Entities</h3>
          <div style="font-size:12px;color:var(--text-muted)" id="kgResultsCount">0 results</div>
        </div>
        <div class="card-body" style="padding:0" id="kgEntitiesList">
          <div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-icon">🕸️</div><div class="empty-state-title">Enter a query or click quick explore</div><div class="empty-state-desc">Search for entities or explore the graph view</div></div>
        </div>
      </div>
    </div>

    <div id="graphView" style="display:none">
      <div class="card" style="height:calc(100vh - 300px);min-height:500px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Graph Visualization</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <label class="switch" style="margin:0" title="Physics simulation"><input type="checkbox" id="graphPhysics" checked onchange="toggleGraphPhysics()"><span class="switch-slider"></span></label>
            <span style="font-size:12px;color:var(--text-muted)">Physics</span>
            <select id="graphLayout" class="form-select" onchange="changeGraphLayout()" style="width:auto;min-width:140px"><option value="force">Force Directed</option><option value="hierarchical">Hierarchical</option><option value="circular">Circular</option></select>
            <button class="btn btn-ghost btn-sm" onclick="loadEntityNeighborhood()">🔄 Refresh</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;height:calc(100% - 60px)">
          <div id="graphContainer" style="width:100%;height:100%;position:relative"><canvas id="graphCanvas" style="width:100%;height:100%;display:block"></canvas></div>
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
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px">
      <div style="display:flex;gap:24px">
        <div><strong>${stats.total_entities || 0}</strong> <span style="color:var(--text-muted);font-size:12px">entities</span></div>
        <div><strong>${stats.total_relations || 0}</strong> <span style="color:var(--text-muted);font-size:12px">relations</span></div>
      </div>
      <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        ${Object.entries(stats.entity_types || {}).map(([type, count]) => `<span class="badge" style="background:var(--blue-dim);color:var(--blue)">${type} (${count})</span>`).join('')}
        ${Object.entries(stats.relation_types || {}).map(([type, count]) => `<span class="badge" style="background:var(--purple-dim);color:var(--purple)">${type} (${count})</span>`).join('')}
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
  if (searchBtn) { searchBtn.classList.toggle('btn-primary', mode === 'search'); searchBtn.classList.toggle('btn-ghost', mode !== 'search'); }
  if (graphBtn) { graphBtn.classList.toggle('btn-primary', mode === 'graph'); graphBtn.classList.toggle('btn-ghost', mode !== 'graph'); }
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
    html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><strong>Entities (' + entities.length + ')</strong></div><div style="display:flex;flex-direction:column">';
    for (const entity of entities) {
      const typeColor = getEntityTypeColor(entity.type);
      html += `<div class="kg-entity-row" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--transition)" onclick="showEntityDetail('${entity.name}')" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''"><span style="font-size:20px">${getEntityIcon(entity.type)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${escapeHtml(entity.name)}</div><div style="display:flex;gap:gap:gap:gap:8px;margin-top:2px"><span class="badge" style="background:var(--${typeColor}-dim);color:var(--${typeColor})">${entity.type}</span><span style="font-size:11px;color:var(--text-muted)">${entity.mentions?.length || 0} mentions</span></div></div></div>`;
    }
    html += '</div>';
  }
  if (relations.length) {
    html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><strong>Relations (' + relations.length + ')</strong></div><div style="display:flex;flex-direction:column">';
    for (const rel of relations.slice(0, 50)) {
      html += `<div class="kg-relation-row" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);color:var(--text-secondary)"><span style="font-weight:600">${escapeHtml(rel.source)}</span><span style="color:var(--text-muted)">→</span><span style="font-weight:600">${escapeHtml(rel.target)}</span><span class="badge" style="background:var(--purple-dim);color:var(--purple);margin-left:auto">${rel.type || 'co_occurs'}</span><span style="font-size:11px;color:var(--text-muted)">${rel.source_count || 1} co-occurrences</span></div>`;
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

// Graph Visualization
function initGraph() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  kgState.graphCanvas = canvas;
  kgState.graphCtx = canvas.getContext('2d');
  resizeGraphCanvas();
  window.addEventListener('resize', resizeGraphCanvas);
  if (kgState.graphAnimationId) cancelAnimationFrame(kgState.graphAnimationId);
  loadEntityNeighborhood(); // initial load
  graphAnimationLoop();
}

function resizeGraphCanvas() {
  const container = document.getElementById('graphContainer');
  if (!kgState.graphCanvas || !container) return;
  kgState.graphCanvas.width = container.clientWidth * window.devicePixelRatio;
  kgState.graphCanvas.height = container.clientHeight * window.devicePixelRatio;
  kgState.graphCanvas.style.width = container.clientWidth + 'px';
  kgState.graphCanvas.style.height = container.clientHeight + 'px';
  kgState.graphCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

async function loadEntityNeighborhood(centerEntity = null) {
  try {
    const data = await api.searchKnowledgeGraph({ query: '', entity: centerEntity || '', depth: 2, limit: 100 });
    kgState.searchResults = data;
    buildGraphFromKGData(data);
    if (!centerEntity) renderKGSearchResults();
  } catch (err) { console.error('Failed to load graph:', err); }
}

function buildGraphFromKGData(data) {
  const entities = data.entities || [];
  const relations = data.relations || [];
  const entityMap = {};
  kgState.graphNodes = entities.map(e => {
    const node = { id: e.name, label: e.name, type: e.type, x: Math.random() * 800 + 100, y: Math.random() * 600 + 100, vx: 0, vy: 0, radius: 30 + (e.mentions?.length || 0) * 2, color: getEntityTypeColor(e.type) };
    entityMap[node.id] = node; return node;
  });
  kgState.graphEdges = [];
  for (const rel of relations) {
    if (entityMap[rel.source] && entityMap[rel.target]) {
      kgState.graphEdges.push({ source: rel.source, target: rel.target, type: rel.type || 'co_occurs', weight: rel.source_count || 1 });
    }
  }
  kgState.entityMap = entityMap;
}

function graphAnimationLoop() {
  if (!kgState.graphCtx || !kgState.graphCanvas) return;
  kgState.graphCtx.clearRect(0, 0, kgState.graphCanvas.width / window.devicePixelRatio, kgState.graphCanvas.height / window.devicePixelRatio);
  if (kgState.graphPhysics) applyPhysics();
  // Draw edges
  for (const edge of kgState.graphEdges) {
    const source = kgState.entityMap[edge.source];
    const target = kgState.entityMap[edge.target];
    if (source && target) drawEdge(source, target, edge);
  }
  // Draw nodes
  for (const node of Object.values(kgState.entityMap)) drawNode(node);
  kgState.graphAnimationId = requestAnimationFrame(graphAnimationLoop);
}

function applyPhysics() {
  const k = 0.01, repulsion = 2000; const nodes = Object.values(kgState.entityMap);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      nodes[i].vx += fx; nodes[i].vy += fy; nodes[j].vx -= fx; nodes[j].vy -= fy;
    }
  }
  for (const edge of kgState.graphEdges) {
    const source = kgState.entityMap[edge.source], target = kgState.entityMap[edge.target];
    if (!source || !target) continue;
    const dx = target.x - source.x, dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = k * (dist - 100);
    const fx = (dx / dist) * force, fy = (dy / dist) * force;
    source.vx += fx; source.vy += fy; target.vx -= fx; target.vy -= fy;
  }
  const damping = 0.9;
  for (const node of Object.values(kgState.entityMap)) {
    node.x += node.vx; node.y += node.vy; node.vx *= damping; node.vy *= damping;
    const m = 50; node.x = Math.max(m, Math.min(kgState.graphCanvas.width / window.devicePixelRatio - m, node.x)); node.y = Math.max(m, Math.min(kgState.graphCanvas.height / window.devicePixelRatio - m, node.y));
  }
}

function drawNode(node) {
  const ctx = kgState.graphCtx; if (!ctx) return;
  const w = kgState.graphCanvas.width / window.devicePixelRatio, h = kgState.graphCanvas.height / window.devicePixelRatio;
  ctx.beginPath(); ctx.arc(node.x, node.y, Math.min(node.radius, 40), 0, Math.PI * 2);
  ctx.fillStyle = getNodeColor(node.type); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(node.label, node.x, node.y + node.radius + 14);
}

function drawEdge(source, target, edge) {
  const ctx = kgState.graphCtx; if (!ctx) return;
  ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(target.x, target.y);
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)'; ctx.lineWidth = Math.max(1, Math.min(3, edge.weight)); ctx.stroke();
}

function getNodeColor(type) { const colors = { gcp_service: '#fd79a8', tech_stack: '#6c5ce7', project: '#fdcb6e', proper_noun: '#00cec9', quoted: '#fab1a0' }; return colors[type] || '#a29bfe'; }

function toggleGraphPhysics() { kgState.graphPhysics = document.getElementById('graphPhysics')?.checked || false; }
function changeGraphLayout() { kgState.graphNodes.forEach(n => { n.x = Math.random() * 800 + 100; n.y = Math.random() * 600 + 100; n.vx = 0; n.vy = 0; }); }

function handleKGSearchKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); performKGSearch(); } }

async function reindexKnowledgeGraph() { if (!confirm('Rebuild knowledge graph from all memory sources?')) return; showToast('Reindexing knowledge graph...', 'info'); try { const result = await api.reindexKnowledgeGraph(); showToast(`Reindex complete: ${result.indexed} items`, 'success'); await loadKGStats(); } catch (err) { showToast('Reindex failed: ' + err.message, 'error'); } }

window.renderKnowledgeGraph = renderKnowledgeGraph;
window.performKGSearch = performKGSearch;
window.reindexKnowledgeGraph = reindexKnowledgeGraph;
window.loadKGStats = loadKGStats;
window.setViewMode = setViewMode;
window.showEntityDetail = showEntityDetail;
window.initGraph = initGraph;
window.loadEntityNeighborhood = loadEntityNeighborhood;
window.toggleGraphPhysics = toggleGraphPhysics;
window.changeGraphLayout = changeGraphLayout;