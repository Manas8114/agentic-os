// Workflow Designer — Visual drag-and-drop workflow builder with node-based editing
let workflowState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  history: [],
  historyIndex: -1,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  canvas: null,
  ctx: null,
  scaleCanvas: null,
  scaleCtx: null,
};

const NODE_TYPES = {
  start: { label: 'Start', color: '#00e09e', icon: '▶', inputs: 0, outputs: 1 },
  end: { label: 'End', color: '#ff4757', icon: '■', inputs: 1, outputs: 0 },
  agent: { label: 'Agent Task', color: '#7c6dff', icon: '🤖', inputs: 1, outputs: 1, config: { agent: 'opencode', skill: '', prompt: '' } },
  skill: { label: 'Skill', color: '#8b7cf7', icon: '⚡', inputs: 1, outputs: 1, config: { skill: '', input: '' } },
  condition: { label: 'Condition', color: '#ffa502', icon: '◆', inputs: 1, outputs: 2, config: { field: '', operator: 'equals', value: '' } },
  loop: { label: 'Loop', color: '#fd79a8', icon: '↻', inputs: 1, outputs: 1, config: { count: 3, collection: '' } },
  parallel: { label: 'Parallel', color: '#45aaf2', icon: '⇄', inputs: 1, outputs: 3, config: {} },
  merge: { label: 'Merge', color: '#a29bfe', icon: '⊕', inputs: 3, outputs: 1, config: {} },
  transform: { label: 'Transform', color: '#ecc48d', icon: '⚙', inputs: 1, outputs: 1, config: { code: 'return input;' } },
  webhook: { label: 'Webhook', color: '#00d4aa', icon: '🔔', inputs: 0, outputs: 1, config: { url: '', method: 'POST' } },
};

async function renderWorkflowDesigner() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Workflow Designer</h1>
        <p class="page-subtitle">Visual drag-and-drop workflow builder with node-based editing</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="newWorkflow()">🆕 New</button>
        <button class="btn btn-ghost btn-sm" onclick="saveWorkflow()">💾 Save</button>
        <button class="btn btn-ghost btn-sm" onclick="loadWorkflow()">📂 Load</button>
        <button class="btn btn-primary btn-sm" onclick="runWorkflow()">▶️ Run</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:8px 16px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <!-- Node Palette -->
          <div style="display:flex;gap:4px;flex-wrap:wrap" id="nodePalette"></div>
          
          <div style="flex:1"></div>
          
          <!-- Zoom Controls -->
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn btn-ghost btn-icon" onclick="zoomOut()" title="Zoom Out">🔍⁻</button>
            <span id="zoomLevel" style="font-size:13px;font-family:var(--font-mono);min-width:60px;text-align:center">100%</span>
            <button class="btn btn-ghost btn-icon" onclick="zoomIn()" title="Zoom In">🔍⁺</button>
            <button class="btn btn-ghost btn-icon" onclick="resetView()" title="Reset View">⌖</button>
            <button class="btn btn-ghost btn-icon" onclick="undo()" title="Undo (Ctrl+Z)" id="undoBtn" disabled>↶</button>
            <button class="btn btn-ghost btn-icon" onclick="redo()" title="Redo (Ctrl+Y)" id="redoBtn" disabled>↷</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Canvas Area -->
    <div class="card" style="height:calc(100vh - 300px);min-height:500px;overflow:hidden;position:relative">
      <!-- Mini-map -->
      <canvas id="miniMap" style="position:absolute;top:16px;right:16px;width:200px;height:150px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-primary);z-index:10;box-shadow:var(--shadow-lg);display:none"></canvas>
      
      <!-- Main Canvas -->
      <canvas id="workflowCanvas" style="width:100%;height:100%;cursor:crosshair;touch-action:none"></canvas>
      
      <!-- Context Menu -->
      <div id="nodeContextMenu" class="context-menu" style="display:none;position:absolute;z-index:100">
        <div class="context-menu-item" onclick="editNodeConfig()"><span>⚙</span> Configure</div>
        <div class="context-menu-item" onclick="duplicateNode()"><span>📋</span> Duplicate</div>
        <div class="context-menu-item" onclick="deleteSelectedNode()"><span>🗑</span> Delete</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" onclick="addEdgeFromSelected()"><span>🔗</span> Connect</div>
      </div>
      
      <!-- Node Config Panel (slide-in) -->
      <div id="nodeConfigPanel" class="slide-panel" style="display:none;position:absolute;top:0;right:0;width:360px;height:100%;background:var(--bg-card);border-left:1px solid var(--border);box-shadow:var(--shadow-xl);z-index:20;overflow-y:auto">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <h3 id="configNodeTitle">Node Configuration</h3>
          <button class="btn btn-ghost btn-icon" onclick="closeNodeConfig()" title="Close">✕</button>
        </div>
        <div id="configNodeBody" style="padding:16px"></div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="card" style="margin-top:8px">
      <div class="card-body" style="padding:8px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
          <span>Nodes: <strong id="nodeCount">0</strong></span>
          <span>Edges: <strong id="edgeCount">0</strong></span>
          <span>Zoom: <strong id="zoomPercent">100%</strong></span>
        </div>
        <div style="display:flex;gap:8px;font-size:12px;color:var(--text-muted)">
          <span id="mousePos">0, 0</span>
          <span id="selectionInfo"></span>
        </div>
      </div>
    </div>
  `;

  initWorkflowCanvas();
  renderNodePalette();
  renderWorkflow();
}

function initWorkflowCanvas() {
  workflowState.canvas = document.getElementById('workflowCanvas');
  if (!workflowState.canvas) {
    console.warn('workflowCanvas element not found');
    return;
  }
  workflowState.ctx = workflowState.canvas.getContext('2d');
  
  // Scale canvas for mini-map
  workflowState.scaleCanvas = document.getElementById('miniMap');
  if (workflowState.scaleCanvas) {
    workflowState.scaleCtx = workflowState.scaleCanvas.getContext('2d');
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Mouse events
  workflowState.canvas.addEventListener('mousedown', onMouseDown);
  workflowState.canvas.addEventListener('mousemove', onMouseMove);
  workflowState.canvas.addEventListener('mouseup', onMouseUp);
  workflowState.canvas.addEventListener('wheel', onWheel, { passive: false });
  workflowState.canvas.addEventListener('dblclick', onDoubleClick);
  workflowState.canvas.addEventListener('contextmenu', onContextMenu);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', onKeyDown);
  
  // Drag and drop from palette
  setupPaletteDragDrop();
  
  // Initial render
  renderWorkflow();
}

function resizeCanvas() {
  if (!workflowState.canvas) return;
  const rect = workflowState.canvas.parentElement.getBoundingClientRect();
  workflowState.canvas.width = rect.width;
  workflowState.canvas.height = rect.height;
  renderWorkflow();
}

function renderNodePalette() {
  const container = document.getElementById('nodePalette');
  if (!container) return;
  
  container.innerHTML = Object.entries(NODE_TYPES).map(([type, def]) => `
    <div class="palette-node" draggable="true" data-node-type="${type}" 
         style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;cursor:grab;transition:var(--transition)"
         onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <span style="font-size:14px">${def.icon}</span>
      <span style="font-weight:500">${def.label}</span>
    </div>
  `).join('');
}

function setupPaletteDragDrop() {
  document.querySelectorAll('.palette-node').forEach(node => {
    node.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('node-type', e.target.dataset.nodeType);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
  
  if (!workflowState.canvas) return;
  
  workflowState.canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  
  workflowState.canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!workflowState.canvas) return;
    const type = e.dataTransfer.getData('node-type');
    if (type && NODE_TYPES[type]) {
      const rect = workflowState.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
      const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
      addNode(type, x, y);
    }
  });
}

// Node management
function addNode(type, x, y, config = {}) {
  const def = NODE_TYPES[type];
  const node = {
    id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type,
    label: def.label,
    color: def.color,
    icon: def.icon,
    x, y,
    width: 180,
    height: 40 + def.inputs * 20 + def.outputs * 20,
    inputs: def.inputs,
    outputs: def.outputs,
    config: { ...def.config, ...config },
    selected: false,
  };
  
  saveHistory();
  workflowState.nodes.push(node);
  renderWorkflow();
  updateStatusBar();
}

function deleteNode(nodeId) {
  saveHistory();
  workflowState.nodes = workflowState.nodes.filter(n => n.id !== nodeId);
  workflowState.edges = workflowState.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  workflowState.selectedNode = null;
  renderWorkflow();
  updateStatusBar();
}

function duplicateNode(nodeId) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  saveHistory();
  workflowState.nodes.push({
    ...node,
    id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    x: node.x + 20,
    y: node.y + 20,
    selected: false,
  });
  renderWorkflow();
  updateStatusBar();
}

function selectNode(nodeId) {
  workflowState.nodes.forEach(n => n.selected = n.id === nodeId);
  workflowState.selectedNode = nodeId ? workflowState.nodes.find(n => n.id === nodeId) : null;
  renderWorkflow();
}

function selectEdge(edgeId) {
  workflowState.selectedEdge = edgeId;
  renderWorkflow();
}

// Edge management
function addEdge(fromNodeId, fromOutput, toNodeId, toInput) {
  const edge = {
    id: 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    from: fromNodeId,
    fromOutput,
    to: toNodeId,
    toInput,
    selected: false,
  };
  saveHistory();
  workflowState.edges.push(edge);
  renderWorkflow();
  updateStatusBar();
}

function deleteEdge(edgeId) {
  saveHistory();
  workflowState.edges = workflowState.edges.filter(e => e.id !== edgeId);
  renderWorkflow();
  updateStatusBar();
}

// History management
function saveHistory() {
  const state = {
    nodes: JSON.parse(JSON.stringify(workflowState.nodes)),
    edges: JSON.parse(JSON.stringify(workflowState.edges)),
  };
  workflowState.history = workflowState.history.slice(0, workflowState.historyIndex + 1);
  if (workflowState.history.length >= 50) workflowState.history.shift();
  else workflowState.historyIndex++;
  workflowState.history.push(state);
  updateUndoRedoButtons();
}

function undo() {
  if (workflowState.historyIndex > 0) {
    workflowState.historyIndex--;
    const state = workflowState.history[workflowState.historyIndex];
    workflowState.nodes = JSON.parse(JSON.stringify(state.nodes));
    workflowState.edges = JSON.parse(JSON.stringify(state.edges));
    renderWorkflow();
    updateUndoRedoButtons();
  }
}

function redo() {
  if (workflowState.historyIndex < workflowState.history.length - 1) {
    workflowState.historyIndex++;
    const state = workflowState.history[workflowState.historyIndex];
    workflowState.nodes = JSON.parse(JSON.stringify(state.nodes));
    workflowState.edges = JSON.parse(JSON.stringify(state.edges));
    renderWorkflow();
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = workflowState.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = workflowState.historyIndex >= workflowState.history.length - 1;
}

// Canvas rendering
function renderWorkflow() {
  if (!workflowState.ctx || !workflowState.canvas) return;
  
  const ctx = workflowState.ctx;
  const canvas = workflowState.canvas;
  const { pan, zoom } = workflowState;
  
  // Clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Apply pan/zoom
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);
  
  // Draw grid
  drawGrid(ctx, canvas.width / zoom, canvas.height / zoom, pan, zoom);
  
  // Draw edges first (behind nodes)
  workflowState.edges.forEach(edge => drawEdge(ctx, edge));
  
  // Draw nodes
  workflowState.nodes.forEach(node => drawNode(ctx, node));
  
  // Draw selection
  if (workflowState.selectedNode) {
    const node = workflowState.nodes.find(n => n.id === workflowState.selectedNode);
    if (node) drawNodeSelection(ctx, node);
  }
  
  // Draw mini-map
  renderMiniMap();
}

function drawGrid(ctx, width, height, pan, zoom) {
  const gridSize = 20 * zoom;
  const offsetX = (pan.x % gridSize + gridSize) % gridSize;
  const offsetY = (pan.y % gridSize + gridSize) % gridSize;
  
  ctx.strokeStyle = 'rgba(108, 92, 231, 0.05)';
  ctx.lineWidth = 1;
  
  for (let x = offsetX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = offsetY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawNode(ctx, node) {
  const def = NODE_TYPES[node.type];
  const radius = 8;
  
  // Node body
  ctx.fillStyle = node.color;
  ctx.beginPath();
  roundRect(ctx, node.x, node.y, node.width, node.height, radius);
  ctx.fill();
  
  // Header bar
  ctx.fillStyle = adjustColor(node.color, -30);
  ctx.beginPath();
  roundRectTop(ctx, node.x, node.y, node.width, 36, radius);
  ctx.fill();
  
  // Icon and label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px var(--font-sans)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.icon + ' ' + node.label, node.x + 12, node.y + 18);
  
  // Input ports
  for (let i = 0; i < node.inputs; i++) {
    const y = node.y + 40 + i * 28 + 14;
    ctx.fillStyle = '#45aaf2';
    ctx.beginPath();
    ctx.arc(node.x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Output ports
  for (let i = 0; i < node.outputs; i++) {
    const y = node.y + 40 + i * 28 + 14;
    ctx.fillStyle = '#fd79a8';
    ctx.beginPath();
    ctx.arc(node.x + node.width, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Selection indicator
  if (node.selected) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(node.x - 2, node.y - 2, node.width + 4, node.height + 4);
    ctx.setLineDash([]);
  }
}

function drawEdge(ctx, edge) {
  const fromNode = workflowState.nodes.find(n => n.id === edge.from);
  const toNode = workflowState.nodes.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return;
  
  const fromOutput = fromNode.outputs > 1 ? edge.fromOutput || 0 : 0;
  const toInput = toNode.inputs > 1 ? edge.toInput || 0 : 0;
  
  const startX = fromNode.x + fromNode.width;
  const startY = fromNode.y + 40 + fromOutput * 28 + 14;
  const endX = toNode.x;
  const endY = toNode.y + 40 + toInput * 28 + 14;
  
  // Bezier curve
  const cp1x = startX + 80;
  const cp2x = endX - 80;
  
  ctx.strokeStyle = edge.selected ? '#ff4757' : '#45aaf2';
  ctx.lineWidth = edge.selected ? 3 : 2;
  ctx.setLineDash(edge.selected ? [] : [5, 5]);
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(cp1x, startY, cp2x, endY, endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Arrow head
  const angle = Math.atan2(endY - endY, endX - cp2x) || 0;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 10, endY - 5);
  ctx.lineTo(endX - 10, endY + 5);
  ctx.closePath();
  ctx.fill();
}

function drawNodeSelection(ctx, node) {
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8);
  ctx.setLineDash([]);
}

function renderMiniMap() {
  if (!workflowState.scaleCanvas) return;
  
  const canvas = workflowState.scaleCanvas;
  const ctx = workflowState.scaleCtx;
  const scale = 0.1;
  
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.scale(scale, scale);
  ctx.translate(workflowState.pan.x, workflowState.pan.y);
  
  // Draw nodes as small rectangles
  workflowState.nodes.forEach(node => {
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x, node.y, node.width * 0.8, node.height * 0.8);
  });
  
  // Viewport indicator
  const viewport = {
    x: -workflowState.pan.x / workflowState.zoom,
    y: -workflowState.pan.y / workflowState.zoom,
    w: workflowState.canvas.width / workflowState.zoom,
    h: workflowState.canvas.height / workflowState.zoom,
  };
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1 / 0.1;
  ctx.strokeRect(viewport.x, viewport.y, viewport.w, viewport.h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Mouse event handlers
function onMouseDown(e) {
  const rect = workflowState.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    // Pan
    workflowState.isDragging = true;
    workflowState.dragStart = { x: e.clientX - workflowState.pan.x, y: e.clientY - workflowState.pan.y };
    workflowState.canvas.style.cursor = 'grabbing';
    return;
  }
  
  if (e.button === 0) {
    // Check port clicks
    const port = getPortAt(x, y);
    if (port) {
      startEdgeDrag(port);
      return;
    }
    
    // Check node click
    const node = getNodeAt(x, y);
    if (node) {
      selectNode(node.id);
      workflowState.isDragging = true;
      workflowState.dragStart = { x, y, nodeX: node.x, nodeY: node.y };
      return;
    }
    
    // Check edge click
    const edge = getEdgeAt(x, y);
    if (edge) {
      selectEdge(edge.id);
      return;
    }
    
    // Click on canvas - deselect
    selectNode(null);
    workflowState.selectedEdge = null;
    renderWorkflow();
  }
}

function onMouseMove(e) {
  const rect = workflowState.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  if (workflowState.isDragging) {
    if (workflowState.dragStart.nodeX !== undefined) {
      // Dragging node
      const node = workflowState.nodes.find(n => n.id === workflowState.selectedNode);
      if (node) {
        node.x = workflowState.dragStart.nodeX + (x - workflowState.dragStart.x);
        node.y = workflowState.dragStart.nodeY + (y - workflowState.dragStart.y);
        renderWorkflow();
      }
    } else {
      // Panning
      workflowState.pan.x = e.clientX - workflowState.dragStart.x;
      workflowState.pan.y = e.clientY - workflowState.dragStart.y;
      renderWorkflow();
    }
    return;
  }
  
  // Update cursor
  const port = getPortAt(x, y);
  if (port) {
    workflowState.canvas.style.cursor = 'crosshair';
  } else if (getNodeAt(x, y)) {
    workflowState.canvas.style.cursor = 'grab';
  } else if (getEdgeAt(x, y)) {
    workflowState.canvas.style.cursor = 'pointer';
  } else {
    workflowState.canvas.style.cursor = 'crosshair';
  }
  
  // Update mouse position
  document.getElementById('mousePos').textContent = `${Math.round(x)}, ${Math.round(y)}`;
}

function onMouseUp(e) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    workflowState.isDragging = false;
    workflowState.canvas.style.cursor = 'crosshair';
    return;
  }
  
  if (workflowState.isDragging && workflowState.dragStart.port) {
    // End edge drag
    const rect = workflowState.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
    const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
    const targetPort = getPortAt(x, y);
    
    if (targetPort && targetPort.node.id !== workflowState.dragStart.port.node.id) {
      // Check compatibility (output to input)
      if (workflowState.dragStart.port.type === 'output' && targetPort.type === 'input') {
        addEdge(workflowState.dragStart.port.node.id, workflowState.dragStart.port.index, targetPort.node.id, targetPort.index);
      } else if (workflowState.dragStart.port.type === 'input' && targetPort.type === 'output') {
        addEdge(targetPort.node.id, targetPort.index, workflowState.dragStart.port.node.id, workflowState.dragStart.port.index);
      }
    }
    workflowState.dragStart.port = null;
  }
  
  workflowState.isDragging = false;
  workflowState.canvas.style.cursor = 'crosshair';
  renderWorkflow();
}

function onWheel(e) {
  e.preventDefault();
  const rect = workflowState.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(5, workflowState.zoom * zoomFactor));
  
  // Zoom towards mouse position
  const worldX = (mouseX - workflowState.pan.x) / workflowState.zoom;
  const worldY = (mouseY - workflowState.pan.y) / workflowState.zoom;
  
  workflowState.zoom = newZoom;
  workflowState.pan.x = mouseX - worldX * newZoom;
  workflowState.pan.y = mouseY - worldY * newZoom;
  
  renderWorkflow();
  updateZoomDisplay();
}

function onDoubleClick(e) {
  const rect = workflowState.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  const node = getNodeAt(x, y);
  if (node) {
    openNodeConfig(node);
  }
}

function onContextMenu(e) {
  e.preventDefault();
  const rect = workflowState.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  const node = getNodeAt(x, y);
  if (node) {
    selectNode(node.id);
    const menu = document.getElementById('nodeContextMenu');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.display = 'block';
  } else {
    document.getElementById('nodeContextMenu').style.display = 'none';
  }
}

document.addEventListener('click', () => {
  const menu = document.getElementById('nodeContextMenu');
  if (menu) menu.style.display = 'none';
});

// Hit testing
function getNodeAt(x, y) {
  for (const node of [...workflowState.nodes].reverse()) {
    if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
      return node;
    }
  }
  return null;
}

function getPortAt(x, y) {
  for (const node of workflowState.nodes) {
    // Input ports (left side)
    for (let i = 0; i < node.inputs; i++) {
      const px = node.x;
      const py = node.y + 40 + i * 28 + 14;
      if (Math.hypot(x - px, y - py) < 12) {
        return { node, type: 'input', index: i, x: px, y: py };
      }
    }
    // Output ports (right side)
    for (let i = 0; i < node.outputs; i++) {
      const px = node.x + node.width;
      const py = node.y + 40 + i * 28 + 14;
      if (Math.hypot(x - px, y - py) < 12) {
        return { node, type: 'output', index: i, x: px, y: py };
      }
    }
  }
  return null;
}

function getEdgeAt(x, y) {
  for (const edge of workflowState.edges) {
    const fromNode = workflowState.nodes.find(n => n.id === edge.from);
    const toNode = workflowState.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) continue;
    
    const fromOutput = fromNode.outputs > 1 ? edge.fromOutput || 0 : 0;
    const toInput = toNode.inputs > 1 ? edge.toInput || 0 : 0;
    
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + 40 + fromOutput * 28 + 14;
    const endX = toNode.x;
    const endY = toNode.y + 40 + toInput * 28 + 14;
    const cp1x = startX + 80;
    const cp2x = endX - 80;
    
    // Sample points along curve
    for (let t = 0; t <= 1; t += 0.02) {
      const sx = Math.pow(1-t, 3)*startX + 3*Math.pow(1-t, 2)*t* (startX + 80) + 3*(1-t)*Math.pow(t, 2)*(endX - 80) + Math.pow(t, 3)*endX;
      const sy = Math.pow(1-t, 3)*startY + 3*Math.pow(1-t, 2)*t*startY + 3*(1-t)*Math.pow(t, 2)*endY + Math.pow(t, 3)*endY;
      if (Math.hypot(x - sx, y - sy) < 5) return edge;
    }
  }
  return null;
}

function startEdgeDrag(port) {
  workflowState.dragStart.port = port;
  workflowState.isDragging = true;
  workflowState.canvas.style.cursor = 'crosshair';
}

// Node config
function openNodeConfig(node) {
  const panel = document.getElementById('nodeConfigPanel');
  const title = document.getElementById('configNodeTitle');
  const body = document.getElementById('configNodeBody');
  
  title.textContent = `${node.icon} ${node.label} Configuration`;
  body.innerHTML = renderNodeConfigForm(node);
  
  panel.style.display = 'block';
  // Trigger animation
  requestAnimationFrame(() => panel.style.transform = 'translateX(0)');
}

function closeNodeConfig() {
  const panel = document.getElementById('nodeConfigPanel');
  panel.style.transform = 'translateX(100%)';
  setTimeout(() => panel.style.display = 'none', 300);
}

function renderNodeConfigForm(node) {
  const def = NODE_TYPES[node.type];
  let html = `
    <div class="form-group">
      <label class="form-label">Label</label>
      <input class="form-input" value="${escapeHtml(node.label)}" onchange="updateNodeProperty('${node.id}', 'label', this.value)">
    </div>
    <div class="form-group">
      <label class="form-label">Type: ${def.label}</label>
      <div class="form-hint">Node type cannot be changed</div>
    </div>
  `;
  
  // Type-specific config
  if (node.type === 'agent' || node.type === 'skill') {
    html += `
      <div class="form-group"><label class="form-label">Prompt / Input</label><textarea class="form-textarea" rows="4" onchange="updateNodeProperty('${node.id}', 'config.prompt', this.value)">${escapeHtml(node.config.prompt || '')}</textarea></div>
    `;
  }
  
  if (node.type === 'agent') {
    html += `
      <div class="form-group">
        <label class="form-label">Agent</label>
        <select class="form-select" onchange="updateNodeProperty('${node.id}', 'config.agent', this.value)">
          <option value="opencode" ${node.config.agent === 'opencode' ? 'selected' : ''}>opencode</option>
          <option value="hermes" ${node.config.agent === 'hermes' ? 'selected' : ''}>hermes</option>
          <option value="gemini" ${node.config.agent === 'gemini' ? 'selected' : ''}>Gemini CLI</option>
          <option value="claude" ${node.config.agent === 'claude' ? 'selected' : ''}>Claude</option>
        </select>
      </div>
    `;
  }
  
  if (node.type === 'skill') {
    html += `
      <div class="form-group">
        <label class="form-label">Skill</label>
        <input class="form-input" value="${escapeHtml(node.config.skill || '')}" onchange="updateNodeProperty('${node.id}', 'config.skill', this.value)">
      </div>
    `;
  }
  
  if (node.type === 'condition') {
    html += `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Field</label><input class="form-input" value="${escapeHtml(node.config.field || '')}" onchange="updateNodeProperty('${node.id}', 'config.field', this.value)"></div>
        <div class="form-group"><label class="form-label">Operator</label><select class="form-select" onchange="updateNodeProperty('${node.id}', 'config.operator', this.value)"><option value="equals" ${node.config.operator === 'equals' ? 'selected' : ''}>Equals</option><option value="contains" ${node.config.operator === 'contains' ? 'selected' : ''}>Contains</option><option value="gt" ${node.config.operator === 'gt' ? 'selected' : ''}>Greater Than</option><option value="lt" ${node.config.operator === 'lt' ? 'selected' : ''}>Less Than</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Value</label><input class="form-input" value="${escapeHtml(node.config.value || '')}" onchange="updateNodeProperty('${node.id}', 'config.value', this.value)"></div>
    `;
  }
  
  if (node.type === 'loop') {
    html += `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Count</label><input class="form-input" type="number" value="${node.config.count || 3}" onchange="updateNodeProperty('${node.id}', 'config.count', parseInt(this.value))"></div>
        <div class="form-group"><label class="form-label">Collection</label><input class="form-input" value="${escapeHtml(node.config.collection || '')}" onchange="updateNodeProperty('${node.id}', 'config.collection', this.value)"></div>
      </div>
    `;
  }
  
  if (node.type === 'transform') {
    html += `
      <div class="form-group"><label class="form-label">Transform Code</label><textarea class="form-textarea" rows="8" style="font-family:var(--font-mono);font-size:12px" onchange="updateNodeProperty('${node.id}', 'config.code', this.value)">${escapeHtml(node.config.code || 'return input;')}</textarea></div>
    `;
  }
  
  if (node.type === 'webhook') {
    html += `
      <div class="form-group"><label class="form-label">URL</label><input class="form-input" value="${escapeHtml(node.config.url || '')}" onchange="updateNodeProperty('${node.id}', 'config.url', this.value)"></div>
      <div class="form-group"><label class="form-label">Method</label><select class="form-select" onchange="updateNodeProperty('${node.id}', 'config.method', this.value)"><option value="POST" ${node.config.method === 'POST' ? 'selected' : ''}>POST</option><option value="GET" ${node.config.method === 'GET' ? 'selected' : ''}>GET</option><option value="PUT" ${node.config.method === 'PUT' ? 'selected' : ''}>PUT</option></select></div>
    `;
  }
  
  html += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:8px">
      <button class="btn btn-danger btn-sm" onclick="deleteNode('${node.id}');closeNodeConfig()">🗑 Delete</button>
      <button class="btn btn-ghost btn-sm" onclick="duplicateNode('${node.id}');closeNodeConfig()">📋 Duplicate</button>
    </div>
  `;
  
  return html;
}

function updateNodeProperty(nodeId, path, value) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  
  const keys = path.split('.');
  let obj = node;
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  renderWorkflow();
}

// Keyboard shortcuts
function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') { e.preventDefault(); undo(); }
    if (e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 's') { e.preventDefault(); saveWorkflow(); }
  }
  
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (workflowState.selectedNode) {
      deleteNode(workflowState.selectedNode);
    } else if (workflowState.selectedEdge) {
      deleteEdge(workflowState.selectedEdge);
    }
  }
  
  if (e.key === 'Escape') {
    closeNodeConfig();
    document.getElementById('nodeContextMenu').style.display = 'none';
  }
}

// Context menu actions
function editNodeConfig() {
  document.getElementById('nodeContextMenu').style.display = 'none';
  if (workflowState.selectedNode) {
    openNodeConfig(workflowState.nodes.find(n => n.id === workflowState.selectedNode));
  }
}

function deleteSelectedNode() {
  document.getElementById('nodeContextMenu').style.display = 'none';
  if (workflowState.selectedNode) {
    deleteNode(workflowState.selectedNode);
  }
}

function addEdgeFromSelected() {
  document.getElementById('nodeContextMenu').style.display = 'none';
  if (workflowState.selectedNode) {
    const node = workflowState.nodes.find(n => n.id === workflowState.selectedNode);
    if (node.outputs > 1) {
      // Show port selector
      showToast('Select output port from node', 'info');
    }
  }
}

// Workflow operations
function newWorkflow() {
  if (workflowState.nodes.length > 0 && !confirm('Create new workflow? Unsaved changes will be lost.')) return;
  saveHistory();
  workflowState.nodes = [];
  workflowState.edges = [];
  renderWorkflow();
  updateStatusBar();
}

async function saveWorkflow() {
  const workflow = {
    nodes: workflowState.nodes,
    edges: workflowState.edges,
    version: '1.0',
    created: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workflow-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Workflow saved', 'success');
}

async function loadWorkflow() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const workflow = JSON.parse(text);
      saveHistory();
      workflowState.nodes = workflow.nodes || [];
      workflowState.edges = workflow.edges || [];
      renderWorkflow();
      updateStatusBar();
      showToast('Workflow loaded', 'success');
    } catch (err) {
      showToast('Failed to load: ' + err.message, 'error');
    }
  };
  input.click();
}

async function runWorkflow() {
  if (workflowState.nodes.length === 0) {
    showToast('No nodes in workflow', 'error');
    return;
  }
  showToast('Workflow execution would start here', 'info');
}

function zoomIn() {
  zoomAt(workflowState.canvas.width / 2, workflowState.canvas.height / 2, 1.2);
}

function zoomOut() {
  zoomAt(workflowState.canvas.width / 2, workflowState.canvas.height / 2, 0.83);
}

function zoomAt(x, y, factor) {
  const rect = workflowState.canvas.getBoundingClientRect();
  const newZoom = Math.max(0.1, Math.min(5, workflowState.zoom * factor));
  const worldX = (x - workflowState.pan.x) / workflowState.zoom;
  const worldY = (y - workflowState.pan.y) / workflowState.zoom;
  workflowState.zoom = newZoom;
  workflowState.pan.x = x - worldX * newZoom;
  workflowState.pan.y = y - worldY * newZoom;
  renderWorkflow();
  updateZoomDisplay();
}

function resetView() {
  workflowState.zoom = 1;
  workflowState.pan = { x: 0, y: 0 };
  renderWorkflow();
  updateZoomDisplay();
}

function updateZoomDisplay() {
  const el = document.getElementById('zoomLevel');
  if (el) el.textContent = Math.round(workflowState.zoom * 100) + '%';
  const zp = document.getElementById('zoomPercent');
  if (zp) zp.textContent = Math.round(workflowState.zoom * 100) + '%';
}

function updateStatusBar() {
  document.getElementById('nodeCount').textContent = workflowState.nodes.length;
  document.getElementById('edgeCount').textContent = workflowState.edges.length;
  
  const selInfo = document.getElementById('selectionInfo');
  if (selInfo) {
    if (workflowState.selectedNode) {
      const node = workflowState.nodes.find(n => n.id === workflowState.selectedNode);
      selInfo.textContent = node ? `Selected: ${node.label}` : '';
    } else if (workflowState.selectedEdge) {
      selInfo.textContent = 'Edge selected';
    } else {
      selInfo.textContent = '';
    }
  }
}

// Export/Import
function exportWorkflow() {
  saveWorkflow();
}

function importWorkflow() {
  loadWorkflow();
}

window.renderWorkflowDesigner = renderWorkflowDesigner;
window.newWorkflow = newWorkflow;
window.saveWorkflow = saveWorkflow;
window.loadWorkflow = loadWorkflow;
window.runWorkflow = runWorkflow;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetView = resetView;
window.undo = undo;
window.redo = redo;
window.updateNodeProperty = updateNodeProperty;
window.openNodeConfig = openNodeConfig;
window.closeNodeConfig = closeNodeConfig;
window.editNodeConfig = editNodeConfig;
window.deleteSelectedNode = deleteSelectedNode;
window.addEdgeFromSelected = addEdgeFromSelected;