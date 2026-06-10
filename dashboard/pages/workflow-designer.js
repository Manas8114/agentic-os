// Workflow Designer — Visual DAG editor for skill chains & multi-agent workflows
let workflowState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  workflows: {},
  activeWorkflow: null,
  draggingNode: null,
  dragOffset: { x: 0, y: 0 },
  isConnecting: false,
  connectionStart: null,
  history: [],
  historyIndex: -1,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
};

const NODE_TYPES = {
  skill: { label: 'Skill', color: '#7c6dff', icon: '⚡' },
  agent: { label: 'Agent', color: '#00e09e', icon: '🤖' },
  condition: { label: 'Condition', color: '#ffa502', icon: '🔀' },
  parallel: { label: 'Parallel', color: '#ff4757', icon: '⚡' },
  handoff: { label: 'Handoff', color: '#c88fff', icon: '🔄' },
  start: { label: 'Start', color: '#00d4aa', icon: '▶️' },
  end: { label: 'End', color: '#ff4757', icon: '⏹' },
};

async function renderWorkflowDesigner() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Workflow Designer</h1>
        <p class="page-subtitle">Visual DAG editor for skill chains & multi-agent workflows</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="executeWorkflow()">▶️ Execute</button>
        <button class="btn btn-warning" onclick="validateWorkflow()">✓ Validate</button>
        <button class="btn btn-ghost" onclick="saveWorkflow()">💾 Save</button>
        <button class="btn btn-primary" onclick="showCreateWorkflowModal()">+ New Workflow</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <!-- Node Palette -->
          <div style="display:flex;align-items:center;gap:8px;border-right:1px solid var(--border);padding-right:16px">
            <strong style="font-size:13px;color:var(--text-secondary)">Nodes:</strong>
            <div class="node-palette" style="display:flex;gap:4px" id="nodePalette"></div>
          </div>

          <!-- Workflow Controls -->
          <div style="display:flex;align-items:center;gap:12px;border-right:1px solid var(--border);padding:0 16px">
            <button class="btn btn-ghost btn-sm" onclick="undo()" id="undoBtn" disabled title="Undo (Ctrl+Z)">↶ Undo</button>
            <button class="btn btn-ghost btn-sm" onclick="redo()" id="redoBtn" disabled title="Redo (Ctrl+Y)">↷ Redo</button>
            <div style="width:1px;height:24px;background:var(--border)"></div>
            <select id="workflowSelect" class="form-select" onchange="loadWorkflow(this.value)" style="width:auto;min-width:200px">
              <option value="">Select or create workflow...</option>
            </select>
          </div>

          <!-- Zoom/Pan Controls -->
          <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
            <span style="font-size:12px;color:var(--text-muted)" id="zoomLevel">100%</span>
            <button class="btn btn-ghost btn-sm" onclick="zoomOut()" title="Zoom Out">🔍⁻</button>
            <button class="btn btn-ghost btn-sm" onclick="zoomIn()" title="Zoom In">🔍⁺</button>
            <button class="btn btn-ghost btn-sm" onclick="resetViewport()" title="Reset View">🎯</button>
            <button class="btn btn-ghost btn-sm" onclick="autoLayout()" title="Auto Layout">⚡ Layout</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Canvas Area -->
    <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div style="position:relative;flex:1;overflow:hidden;background:var(--bg-primary)">
        <!-- Canvas Wrapper -->
        <div id="canvasWrapper" style="width:100%;height:100%;position:relative;cursor:crosshair" 
             onmousedown="onCanvasMouseDown(event)"
             onmousemove="onCanvasMouseMove(event)"
             onmouseup="onCanvasMouseUp(event)"
             onwheel="onCanvasWheel(event)"
             oncontextmenu="event.preventDefault()">
          
          <!-- Grid Background -->
          <canvas id="gridCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1"></canvas>
          
          <!-- SVG for Edges -->
          <svg id="edgesSvg" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none"></svg>
          
          <!-- Nodes Container -->
          <div id="nodesContainer" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:3"></div>
          
          <!-- Connection Preview Line -->
          <svg id="connectionPreview" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none">
            <path id="connectionPath" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5,5" fill="none" marker-end="url(#arrowhead)"></path>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)"></polygon>
              </marker>
            </defs>
          </svg>
          
          <!-- Mini-map -->
          <div id="minimap" style="position:absolute;bottom:20px;right:20px;width:200px;height:150px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;z-index:10;box-shadow:0 4px 20px rgba(0,0,0,0.3)">
            <canvas id="minimapCanvas" width="200" height="150" style="width:100%;height:100%"></canvas>
            <div id="minimapViewportEl" style="position:absolute;border:2px solid var(--accent);background:var(--accent-glow);pointer-events:none"></div>
          </div>
        </div>
      </div>

      <!-- Node Inspector Panel -->
      <div id="nodeInspector" class="card" style="display:none;position:absolute;bottom:20px;left:20px;right:20px;max-height:300px;z-index:20;box-shadow:0 -4px 20px rgba(0,0,0,0.3)">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px">
          <h3 class="card-title" id="inspectorTitle">Node Inspector</h3>
          <button class="btn btn-ghost btn-sm" onclick="closeInspector()">✕</button>
        </div>
        <div class="card-body" id="inspectorContent"></div>
      </div>
    </div>

    <!-- Workflow Select Modal -->
    <div id="workflowModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:100%;max-width:600px;max-height:80vh;overflow:auto">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Workflows</h3>
          <button class="btn btn-ghost" onclick="closeWorkflowModal()">✕</button>
        </div>
        <div class="card-body">
          <div style="margin-bottom:16px">
            <button class="btn btn-primary" onclick="createNewWorkflow()">+ Create New Workflow</button>
          </div>
          <div id="workflowList"></div>
        </div>
      </div>
    </div>
  `;

  // Initialize
  initCanvas();
  loadWorkflows();
  loadHistoryFromStorage();
  setupKeyboardShortcuts();
}

function initCanvas() {
  const wrapper = document.getElementById('canvasWrapper');
  const gridCanvas = document.getElementById('gridCanvas');
  const minimapCanvas = document.getElementById('minimapCanvas');
  
  // Set up resize handler
  window.addEventListener('resize', () => {
    resizeCanvases();
    drawGrid();
    renderNodes();
    drawEdges();
    updateMinimap();
  });
  
  resizeCanvases();
  drawGrid();
  
  // Set up minimap click
  const minimapViewportEl = document.getElementById('minimapViewportEl');
  minimapCanvas.addEventListener('click', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / workflowState.zoom;
    const y = (e.clientY - rect.top) / workflowState.zoom;
    const wrapper = document.getElementById('canvasWrapper');
    workflowState.pan = {
      x: -x + wrapper.clientWidth / 2 / workflowState.zoom,
      y: -y + wrapper.clientHeight / 2 / workflowState.zoom,
    };
    applyTransform();
    drawGrid();
    renderNodes();
    drawEdges();
    updateMinimap();
  });
}

function resizeCanvases() {
  const wrapper = document.getElementById('canvasWrapper');
  const gridCanvas = document.getElementById('gridCanvas');
  const edgesSvg = document.getElementById('edgesSvg');
  const connectionPreview = document.getElementById('connectionPreview');
  
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  
  gridCanvas.width = width;
  gridCanvas.height = height;
  edgesSvg.setAttribute('width', width);
  edgesSvg.setAttribute('height', height);
  connectionPreview.setAttribute('width', width);
  connectionPreview.setAttribute('height', height);
}

function drawGrid() {
  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvasWrapper');
  
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  const zoom = workflowState.zoom;
  const pan = workflowState.pan;
  
  ctx.clearRect(0, 0, width, height);
  
  const gridSize = 40 * zoom;
  const offsetX = (pan.x % gridSize + gridSize) % gridSize;
  const offsetY = (pan.y % gridSize + gridSize) % gridSize;
  
  ctx.strokeStyle = 'rgba(58, 68, 88, 0.15)';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = offsetX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = offsetY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Draw origin crosshair
  const originX = pan.x;
  const originY = pan.y;
  if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
    ctx.strokeStyle = 'rgba(124, 109, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function applyTransform() {
  const container = document.getElementById('nodesContainer');
  const edgesSvg = document.getElementById('edgesSvg');
  const connectionPreview = document.getElementById('connectionPreview');
  
  const transform = `translate(${workflowState.pan.x}px, ${workflowState.pan.y}px) scale(${workflowState.zoom})`;
  container.style.transform = transform;
  container.style.transformOrigin = '0 0';
  edgesSvg.style.transform = transform;
  edgesSvg.style.transformOrigin = '0 0';
  connectionPreview.style.transform = transform;
  connectionPreview.style.transformOrigin = '0 0';
  
  document.getElementById('zoomLevel').textContent = Math.round(workflowState.zoom * 100) + '%';
  drawGrid();
  drawEdges();
  updateMinimap();
}

// Node Management
function addNode(type, x, y) {
  const nodeType = NODE_TYPES[type] || NODE_TYPES.skill;
  const id = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const node = {
    id,
    type,
    x: (x - workflowState.pan.x) / workflowState.zoom,
    y: (y - workflowState.pan.y) / workflowState.zoom,
    label: nodeType.label,
    config: {},
    inputs: [],
    outputs: ['output'],
  };
  
  workflowState.nodes.push(node);
  pushHistory();
  renderNodes();
  drawEdges();
  updateMinimap();
  return node;
}

function renderNodes() {
  const container = document.getElementById('nodesContainer');
  container.innerHTML = workflowState.nodes.map(node => {
    const nodeType = NODE_TYPES[node.type];
    const isSelected = workflowState.selectedNode === node.id;
    
    return `
      <div class="workflow-node ${node.type} ${isSelected ? 'selected' : ''}" 
           id="node-${node.id}"
           style="left:${node.x}px;top:${node.y}px"
           data-node-id="${node.id}"
           onmousedown="onNodeMouseDown(event, '${node.id}')"
           oncontextmenu="showNodeContextMenu(event, '${node.id}')">
        <div class="node-header" style="background:${nodeType.color};color:white">
          <span class="node-icon">${nodeType.icon}</span>
          <span class="node-type-label">${node.label}</span>
          <span class="node-id" style="font-size:9px;opacity:0.7">${node.id.slice(-6)}</span>
        </div>
        <div class="node-body">
          <div class="node-label" contenteditable="true" onblur="updateNodeLabel('${node.id}', this.textContent)">${escapeHtml(node.label)}</div>
          <div class="node-ports">
            <div class="port input-port" data-node="${node.id}" data-port="input" title="Input">●</div>
            <div class="port output-port" data-node="${node.id}" data-port="output" title="Output">●</div>
          </div>
          ${node.config.skill ? `<div class="node-config">Skill: ${escapeHtml(node.config.skill)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Add port event listeners
  document.querySelectorAll('.output-port').forEach(port => {
    port.addEventListener('mousedown', (e) => startConnection(e, port.dataset.node, 'output'));
  });
  document.querySelectorAll('.input-port').forEach(port => {
    port.addEventListener('mousedown', (e) => startConnection(e, port.dataset.node, 'input'));
  });
}

// Edge Management
function startConnection(e, nodeId, portType) {
  e.stopPropagation();
  e.preventDefault();
  
  workflowState.isConnecting = true;
  workflowState.connectionStart = { nodeId, portType };
  
  const preview = document.getElementById('connectionPreview');
  preview.style.display = 'block';
  
  document.addEventListener('mousemove', updateConnectionPreview);
  document.addEventListener('mouseup', endConnection);
}

function updateConnectionPreview(e) {
  if (!workflowState.isConnecting) return;
  
  const wrapper = document.getElementById('canvasWrapper');
  const rect = wrapper.getBoundingClientRect();
  
  const x = (e.clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const y = (e.clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  const startNode = workflowState.nodes.find(n => n.id === workflowState.connectionStart.nodeId);
  if (!startNode) return;
  
  const startPort = startNode.outputs && startNode.outputs.length > 0 ? 'output' : 'output';
  const startX = startNode.x + 200; // Approximate node width
  const startY = startNode.y + 50;  // Approximate port position
  
  const path = document.getElementById('connectionPath');
  const d = getBezierPath(startX, startY, x, y);
  path.setAttribute('d', d);
}

function endConnection(e) {
  if (!workflowState.isConnecting) return;
  
  const targetPort = e.target.closest('.port');
  if (targetPort) {
    const targetNodeId = targetPort.dataset.node;
    const targetPortType = targetPort.dataset.port;
    
    // Prevent self-connection and invalid connections
    if (targetNodeId !== workflowState.connectionStart.nodeId && 
        targetPortType !== workflowState.connectionStart.portType) {
      addEdge(workflowState.connectionStart.nodeId, targetNodeId);
    }
  }
  
  workflowState.isConnecting = false;
  workflowState.connectionStart = null;
  
  document.getElementById('connectionPreview').style.display = 'none';
  document.removeEventListener('mousemove', updateConnectionPreview);
  document.removeEventListener('mouseup', endConnection);
}

function addEdge(fromNodeId, toNodeId) {
  // Check if edge already exists
  const exists = workflowState.edges.some(edge => 
    edge.from === fromNodeId && edge.to === toNodeId
  );
  if (exists) {
    showToast('Connection already exists', 'warning');
    return;
  }
  
  // Prevent cycles (simple check)
  if (wouldCreateCycle(fromNodeId, toNodeId)) {
    showToast('Connection would create a cycle', 'error');
    return;
  }
  
  const edge = {
    id: 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    from: fromNodeId,
    to: toNodeId,
    label: '',
    style: 'solid',
  };
  
  workflowState.edges.push(edge);
  pushHistory();
  drawEdges();
  updateMinimap();
}

function wouldCreateCycle(fromNodeId, toNodeId) {
  // Simple cycle detection using DFS
  const visited = new Set();
  const stack = [toNodeId];
  
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === fromNodeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    
    // Find outgoing edges
    workflowState.edges
      .filter(e => e.from === current)
      .forEach(e => stack.push(e.to));
  }
  
  return false;
}

function drawEdges() {
  const svg = document.getElementById('edgesSvg');
  svg.innerHTML = workflowState.edges.map(edge => {
    const fromNode = workflowState.nodes.find(n => n.id === edge.from);
    const toNode = workflowState.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return '';
    
    const startX = fromNode.x + 200;
    const startY = fromNode.y + 50;
    const endX = toNode.x;
    const endY = toNode.y + 50;
    
    const d = getBezierPath(startX, startY, endX, endY);
    const isSelected = workflowState.selectedEdge === edge.id;
    
    return `
      <path 
        d="${d}" 
        stroke="${isSelected ? 'var(--red)' : 'var(--border-secondary)'}" 
        stroke-width="${isSelected ? 3 : 2}" 
        fill="none" 
        marker-end="url(#arrowhead)"
        stroke-dasharray="${edge.style === 'dashed' ? '5,5' : 'none'}"
        data-edge-id="${edge.id}"
        onclick="selectEdge('${edge.id}', event)"
      ></path>
      ${edge.label ? `
        <text x="${(startX + endX) / 2}" y="${(startY + endY) / 2 - 8}" 
              text-anchor="middle" font-size="11" fill="var(--text-muted)" pointer-events="none">
          ${escapeHtml(edge.label)}
        </text>
      ` : ''}
    `;
  }).join('');
  
  // Add arrowhead marker if not exists
  if (!document.getElementById('arrowhead')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-secondary)"></polygon>
      </marker>
    `;
    document.getElementById('edgesSvg').prepend(defs);
  }
}

function getBezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ctrlDist = Math.min(Math.abs(dx) * 0.5, 100);
  
  const cx1 = x1 + ctrlDist;
  const cy1 = y1;
  const cx2 = x2 - ctrlDist;
  const cy2 = y2;
  
  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
}

function selectEdge(edgeId, e) {
  e.stopPropagation();
  workflowState.selectedEdge = edgeId;
  workflowState.selectedNode = null;
  drawEdges();
  showEdgeInspector(edgeId);
}

function selectNode(nodeId) {
  workflowState.selectedNode = nodeId;
  workflowState.selectedEdge = null;
  renderNodes();
  drawEdges();
  showNodeInspector(nodeId);
}

function closeInspector() {
  document.getElementById('nodeInspector').style.display = 'none';
  workflowState.selectedNode = null;
  workflowState.selectedEdge = null;
  renderNodes();
  drawEdges();
}

function showNodeInspector(nodeId) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  
  const inspector = document.getElementById('nodeInspector');
  inspector.style.display = 'block';
  
  const typeConfig = NODE_TYPES[node.type];
  
  document.getElementById('inspectorTitle').innerHTML = `
    <span style="color:${typeConfig.color}">${typeConfig.icon}</span>
    ${typeConfig.label} Inspector
  `;
  
  document.getElementById('inspectorContent').innerHTML = `
    <div class="form-group">
      <label class="form-label">Node ID</label>
      <code style="font-size:11px;color:var(--text-muted)">${node.id}</code>
    </div>
    
    <div class="form-group">
      <label class="form-label">Type</label>
      <select class="form-select" onchange="changeNodeType('${node.id}', this.value)">
        ${Object.entries(NODE_TYPES).map(([key, cfg]) => 
          `<option value="${key}" ${key === node.type ? 'selected' : ''}>${cfg.icon} ${cfg.label}</option>`
        ).join('')}
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Label</label>
      <input type="text" class="form-input" value="${escapeHtml(node.label)}" 
             onchange="updateNodeLabel('${node.id}', this.value)">
    </div>
    
    ${node.type === 'skill' ? `
      <div class="form-group">
        <label class="form-label">Skill</label>
        <input type="text" class="form-input" value="${escapeHtml(node.config.skill || '')}" 
               placeholder="Enter skill name" onchange="updateNodeConfig('${node.id}', 'skill', this.value)">
      </div>
    ` : ''}
    
    ${node.type === 'agent' ? `
      <div class="form-group">
        <label class="form-label">Agent</label>
        <select class="form-select" onchange="updateNodeConfig('${node.id}', 'agent', this.value)">
          <option value="opencode" ${node.config.agent === 'opencode' ? 'selected' : ''}>🔧 opencode</option>
          <option value="crush" ${node.config.agent === 'crush' ? 'selected' : ''}>🤖 crush</option>
          <option value="hermes" ${node.config.agent === 'hermes' ? 'selected' : ''}>⚡ Hermes</option>
          <option value="gemini" ${node.config.agent === 'gemini' ? 'selected' : ''}>🧠 Gemini CLI</option>
          <option value="claude" ${node.config.agent === 'claude' ? 'selected' : ''}>🤖 Claude</option>
        </select>
      </div>
    ` : ''}
    
    ${node.type === 'condition' ? `
      <div class="form-group">
        <label class="form-label">Condition</label>
        <textarea class="form-input" rows="3" placeholder="e.g., previous_skill_score > 0.8" 
                  onchange="updateNodeConfig('${node.id}', 'condition', this.value)">${escapeHtml(node.config.condition || '')}</textarea>
      </div>
    ` : ''}
    
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:8px">
      <button class="btn btn-danger" onclick="deleteNode('${node.id}')">🗑 Delete Node</button>
      <button class="btn btn-ghost" onclick="duplicateNode('${node.id}')">📋 Duplicate</button>
    </div>
  `;
  
  inspector.style.display = 'block';
}

function showEdgeInspector(edgeId) {
  const edge = workflowState.edges.find(e => e.id === edgeId);
  if (!edge) return;
  
  const fromNode = workflowState.nodes.find(n => n.id === edge.from);
  const toNode = workflowState.nodes.find(n => n.id === edge.to);
  
  const inspector = document.getElementById('nodeInspector');
  inspector.style.display = 'block';
  
  document.getElementById('inspectorTitle').textContent = 'Edge Inspector';
  document.getElementById('inspectorContent').innerHTML = `
    <div class="form-group">
      <label class="form-label">From</label>
      <div style="font-size:13px;color:var(--text-secondary)">${fromNode ? fromNode.label : edge.from}</div>
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <div style="font-size:13px;color:var(--text-secondary)">${toNode ? toNode.label : edge.to}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Label</label>
      <input type="text" class="form-input" value="${escapeHtml(edge.label)}" 
             onchange="updateEdgeLabel('${edge.id}', this.value)">
    </div>
    <div class="form-group">
      <label class="form-label">Style</label>
      <select class="form-select" onchange="updateEdgeStyle('${edge.id}', this.value)">
        <option value="solid" ${edge.style === 'solid' ? 'selected' : ''}>Solid</option>
        <option value="dashed" ${edge.style === 'dashed' ? 'selected' : ''}>Dashed</option>
        <option value="dotted" ${edge.style === 'dotted' ? 'selected' : ''}>Dotted</option>
      </select>
    </div>
    <div style="margin-top:16px">
      <button class="btn btn-danger" onclick="deleteEdge('${edge.id}')">🗑 Delete Connection</button>
    </div>
  `;
  
  inspector.style.display = 'block';
}

function updateNodeLabel(nodeId, label) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (node) {
    node.label = label;
    pushHistory();
    renderNodes();
  }
}

function changeNodeType(nodeId, type) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (node) {
    node.type = type;
    node.label = NODE_TYPES[type].label;
    pushHistory();
    renderNodes();
    showNodeInspector(nodeId);
  }
}

function updateNodeConfig(nodeId, key, value) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (node) {
    node.config[key] = value;
    pushHistory();
  }
}

function updateEdgeLabel(edgeId, label) {
  const edge = workflowState.edges.find(e => e.id === edgeId);
  if (edge) {
    edge.label = label;
    pushHistory();
    drawEdges();
  }
}

function updateEdgeStyle(edgeId, style) {
  const edge = workflowState.edges.find(e => e.id === edgeId);
  if (edge) {
    edge.style = style;
    pushHistory();
    drawEdges();
  }
}

function deleteNode(nodeId) {
  workflowState.nodes = workflowState.nodes.filter(n => n.id !== nodeId);
  workflowState.edges = workflowState.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  pushHistory();
  renderNodes();
  drawEdges();
  closeInspector();
  updateMinimap();
}

function duplicateNode(nodeId) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (node) {
    const newNode = {
      ...node,
      id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      x: node.x + 40,
      y: node.y + 40,
    };
    workflowState.nodes.push(newNode);
    pushHistory();
    renderNodes();
    drawEdges();
    updateMinimap();
  }
}

function deleteEdge(edgeId) {
  workflowState.edges = workflowState.edges.filter(e => e.id !== edgeId);
  pushHistory();
  drawEdges();
  closeInspector();
}

function deleteSelected() {
  if (workflowState.selectedNode) {
    deleteNode(workflowState.selectedNode);
  } else if (workflowState.selectedEdge) {
    deleteEdge(workflowState.selectedEdge);
  }
}

// Mouse Event Handlers
function onCanvasMouseDown(e) {
  if (e.target.closest('.workflow-node, .port, .node-header, .node-body, .node-label, .node-ports, .port')) return;
  
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    // Middle mouse or Alt+click for panning
    workflowState.isPanning = true;
    workflowState.panStart = { x: e.clientX, y: e.clientY };
    document.getElementById('canvasWrapper').style.cursor = 'grabbing';
    e.preventDefault();
  }
}

function onCanvasMouseMove(e) {
  if (workflowState.isPanning) {
    const dx = e.clientX - workflowState.panStart.x;
    const dy = e.clientY - workflowState.panStart.y;
    
    workflowState.pan.x += dx;
    workflowState.pan.y += dy;
    workflowState.panStart = { x: e.clientX, y: e.clientY };
    
    applyTransform();
  }
}

function onCanvasMouseUp(e) {
  if (workflowState.isPanning) {
    workflowState.isPanning = false;
    document.getElementById('canvasWrapper').style.cursor = 'crosshair';
  }
}

function onCanvasWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAtPoint(e.clientX, e.clientY, delta);
  }
}

function zoomAtPoint(clientX, clientY, factor) {
  const wrapper = document.getElementById('canvasWrapper');
  const rect = wrapper.getBoundingClientRect();
  
  const mouseX = (clientX - rect.left - workflowState.pan.x) / workflowState.zoom;
  const mouseY = (clientY - rect.top - workflowState.pan.y) / workflowState.zoom;
  
  const newZoom = Math.max(0.1, Math.min(3, workflowState.zoom * factor));
  
  workflowState.pan.x = clientX - rect.left - mouseX * newZoom;
  workflowState.pan.y = clientY - rect.top - mouseY * newZoom;
  workflowState.zoom = newZoom;
  
  applyTransform();
}

function zoomIn() {
  const wrapper = document.getElementById('canvasWrapper');
  const rect = wrapper.getBoundingClientRect();
  zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
}

function zoomOut() {
  const wrapper = document.getElementById('canvasWrapper');
  const rect = wrapper.getBoundingClientRect();
  zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.83);
}

function resetViewport() {
  workflowState.zoom = 1;
  workflowState.pan = { x: 0, y: 0 };
  applyTransform();
}

function autoLayout() {
  // Simple force-directed layout
  const nodes = workflowState.nodes;
  if (nodes.length === 0) return;
  
  const centerX = 0;
  const centerY = 0;
  const radius = Math.max(nodes.length * 50, 300);
  
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
  });
  
  pushHistory();
  renderNodes();
  drawEdges();
  updateMinimap();
}

function updateMinimap() {
  const minimapCanvas = document.getElementById('minimapCanvas');
  const ctx = minimapCanvas.getContext('2d');
  const viewport = document.getElementById('minimapViewportEl');
  const wrapper = document.getElementById('canvasWrapper');
  
  const width = minimapCanvas.width;
  const height = minimapCanvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  // Draw nodes
  const scaleX = width / 4000;
  const scaleY = height / 4000;
  
  workflowState.nodes.forEach(node => {
    const nx = width / 2 + node.x * scaleX;
    const ny = height / 2 + node.y * scaleY;
    
    const typeConfig = NODE_TYPES[node.type];
    ctx.fillStyle = typeConfig.color;
    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw viewport rectangle
  const vw = wrapper.clientWidth;
  const vh = wrapper.clientHeight;
  const vx = width / 2 - workflowState.pan.x * scaleX;
  const vy = height / 2 - workflowState.pan.y * scaleY;
  const vww = vw * scaleX / workflowState.zoom;
  const vhh = vh * scaleY / workflowState.zoom;
  
  const minimapViewportEl = document.getElementById('minimapViewportEl');
  minimapViewportEl.style.left = vx + 'px';
  minimapViewportEl.style.top = vy + 'px';
  minimapViewportEl.style.width = vww + 'px';
  minimapViewportEl.style.height = vhh + 'px';
}

// History Management
function pushHistory() {
  const state = {
    nodes: JSON.parse(JSON.stringify(workflowState.nodes)),
    edges: JSON.parse(JSON.stringify(workflowState.edges)),
  };
  
  workflowState.history = workflowState.history.slice(0, workflowState.historyIndex + 1);
  workflowState.history.push(state);
  workflowState.historyIndex = workflowState.history.length - 1;
  
  // Limit history size
  if (workflowState.history.length > 50) {
    workflowState.history.shift();
    workflowState.historyIndex--;
  }
  
  updateHistoryButtons();
  saveHistoryToStorage();
}

function undo() {
  if (workflowState.historyIndex > 0) {
    workflowState.historyIndex--;
    const state = workflowState.history[workflowState.historyIndex];
    workflowState.nodes = JSON.parse(JSON.stringify(state.nodes));
    workflowState.edges = JSON.parse(JSON.stringify(state.edges));
    renderNodes();
    drawEdges();
    updateMinimap();
    updateHistoryButtons();
  }
}

function redo() {
  if (workflowState.historyIndex < workflowState.history.length - 1) {
    workflowState.historyIndex++;
    const state = workflowState.history[workflowState.historyIndex];
    workflowState.nodes = JSON.parse(JSON.stringify(state.nodes));
    workflowState.edges = JSON.parse(JSON.stringify(state.edges));
    renderNodes();
    drawEdges();
    updateMinimap();
    updateHistoryButtons();
  }
}

function updateHistoryButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = workflowState.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = workflowState.historyIndex >= workflowState.history.length - 1;
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem('workflow_history', JSON.stringify({
      history: workflowState.history,
      index: workflowState.historyIndex,
    }));
  } catch (e) {}
}

function loadHistoryFromStorage() {
  try {
    const stored = localStorage.getItem('workflow_history');
    if (stored) {
      const data = JSON.parse(stored);
      workflowState.history = data.history || [];
      workflowState.historyIndex = data.index || 0;
      updateHistoryButtons();
      
      // Restore current state
      if (workflowState.history.length > 0 && workflowState.historyIndex >= 0) {
        const state = workflowState.history[workflowState.historyIndex];
        workflowState.nodes = JSON.parse(JSON.stringify(state.nodes));
        workflowState.edges = JSON.parse(JSON.stringify(state.edges));
        renderNodes();
        drawEdges();
        updateMinimap();
      }
    }
  } catch (e) {}
}

// Workflow Persistence
async function loadWorkflows() {
  try {
    const stored = localStorage.getItem('workflow_designer_workflows');
    if (stored) {
      workflowState.workflows = JSON.parse(stored);
    }
    updateWorkflowSelect();
  } catch (e) {}
}

function updateWorkflowSelect() {
  const select = document.getElementById('workflowSelect');
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select or create workflow...</option>';
  
  Object.entries(workflowState.workflows).forEach(([id, wf]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = wf.name;
    if (id === currentValue) opt.selected = true;
    select.appendChild(opt);
  });
}

function saveWorkflows() {
  try {
    localStorage.setItem('workflow_designer_workflows', JSON.stringify(workflowState.workflows));
  } catch (e) {}
}

async function saveWorkflow() {
  const name = prompt('Workflow name:', workflowState.activeWorkflow ? workflowState.workflows[workflowState.activeWorkflow]?.name : 'New Workflow');
  if (!name) return;
  
  const id = workflowState.activeWorkflow || 'wf_' + Date.now();
  const workflow = {
    id,
    name,
    nodes: JSON.parse(JSON.stringify(workflowState.nodes)),
    edges: JSON.parse(JSON.stringify(workflowState.edges)),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  
  workflowState.workflows[id] = workflow;
  workflowState.activeWorkflow = id;
  saveWorkflows();
  updateWorkflowSelect();
  showToast('Workflow saved: ' + name, 'success');
}

async function loadWorkflow(id) {
  if (!id || !workflowState.workflows[id]) {
    // Clear canvas for new workflow
    workflowState.nodes = [];
    workflowState.edges = [];
    workflowState.activeWorkflow = null;
    pushHistory();
    renderNodes();
    drawEdges();
    updateMinimap();
    return;
  }
  
  const wf = workflowState.workflows[id];
  workflowState.nodes = JSON.parse(JSON.stringify(wf.nodes));
  workflowState.edges = JSON.parse(JSON.stringify(wf.edges));
  workflowState.activeWorkflow = id;
  
  pushHistory();
  renderNodes();
  drawEdges();
  updateMinimap();
  showToast('Loaded workflow: ' + wf.name, 'success');
}

function showCreateWorkflowModal() {
  document.getElementById('workflowModal').style.display = 'flex';
  renderWorkflowList();
}

function closeWorkflowModal() {
  document.getElementById('workflowModal').style.display = 'none';
}

function renderWorkflowList() {
  const container = document.getElementById('workflowList');
  const workflows = Object.entries(workflowState.workflows);
  
  if (workflows.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="empty-state-icon">📁</div><div class="empty-state-title">No workflows yet</div><div class="empty-state-desc">Create your first workflow to get started</div></div>';
    return;
  }
  
  container.innerHTML = workflows.map(([id, wf]) => `
    <div class="card" style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
      <div style="flex:1">
        <div style="font-weight:600">${escapeHtml(wf.name)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${wf.nodes?.length || 0} nodes, ${wf.edges?.length || 0} edges · ${new Date(wf.updated).toLocaleString()}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="loadWorkflow('${id}'); closeWorkflowModal()">Load</button>
        <button class="btn btn-ghost btn-sm" onclick="renameWorkflow('${id}')">✏️ Rename</button>
        <button class="btn btn-danger btn-sm" onclick="deleteWorkflow('${id}')">🗑 Delete</button>
      </div>
    `).join('');
}

function createNewWorkflow() {
  workflowState.nodes = [];
  workflowState.edges = [];
  workflowState.activeWorkflow = null;
  pushHistory();
  renderNodes();
  drawEdges();
  updateMinimap();
  closeWorkflowModal();
  showToast('New workflow created', 'success');
}

function renameWorkflow(id) {
  const wf = workflowState.workflows[id];
  const name = prompt('New name:', wf.name);
  if (name) {
    wf.name = name;
    wf.updated = new Date().toISOString();
    saveWorkflows();
    renderWorkflowList();
  }
}

function deleteWorkflow(id) {
  if (confirm('Delete this workflow?')) {
    delete workflowState.workflows[id];
    if (workflowState.activeWorkflow === id) {
      workflowState.activeWorkflow = null;
      workflowState.nodes = [];
      workflowState.edges = [];
      pushHistory();
      renderNodes();
      drawEdges();
    }
    saveWorkflows();
    renderWorkflowList();
    updateWorkflowSelect();
  }
}

async function validateWorkflow() {
  const errors = [];
  const warnings = [];
  
  if (workflowState.nodes.length === 0) {
    errors.push('No nodes in workflow');
  }
  
  // Check for start node
  const startNodes = workflowState.nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    warnings.push('No start node - workflow may not execute properly');
  } else if (startNodes.length > 1) {
    warnings.push('Multiple start nodes - only first will be used');
  }
  
  // Check for disconnected nodes
  const connectedNodes = new Set();
  workflowState.edges.forEach(e => {
    connectedNodes.add(e.from);
    connectedNodes.add(e.to);
  });
  
  workflowState.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && workflowState.nodes.length > 1) {
      warnings.push(`Node "${node.label}" is not connected`);
    }
  });
  
  // Check for cycles
  if (hasCycles()) {
    errors.push('Workflow contains cycles');
  }
  
  // Check for unreachable end nodes
  const endNodes = workflowState.nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    warnings.push('No end node defined');
  }
  
  let message = '';
  if (errors.length > 0) message += '❌ Errors:\n' + errors.map(e => '  • ' + e).join('\n') + '\n\n';
  if (warnings.length > 0) message += '⚠️ Warnings:\n' + warnings.map(w => '  • ' + w).join('\n');
  if (errors.length === 0 && warnings.length === 0) message = '✅ Workflow is valid!';
  
  showModal('Workflow Validation', `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(message)}</pre>`, 
    `<button class="btn btn-primary" onclick="closeModal()">Close</button>`);
}

function hasCycles() {
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const edges = workflowState.edges.filter(e => e.from === nodeId);
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        if (dfs(edge.to)) return true;
      } else if (recursionStack.has(edge.to)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const node of workflowState.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  
  return false;
}

async function executeWorkflow() {
  if (workflowState.nodes.length === 0) {
    showToast('No nodes to execute', 'warning');
    return;
  }
  
  if (hasCycles()) {
    showToast('Cannot execute: workflow has cycles', 'error');
    return;
  }
  
  // Find start node
  const startNodes = workflowState.nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    showToast('No start node found', 'error');
    return;
  }
  
  // Topological sort for execution order
  const executionOrder = topologicalSort();
  if (!executionOrder) {
    showToast('Cannot determine execution order (cycles?)', 'error');
    return;
  }
  
  showToast('Executing workflow...', 'info');
  
  // Execute each node in order
  const results = {};
  for (const nodeId of executionOrder) {
    const node = workflowState.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    try {
      let result;
      switch (node.type) {
        case 'skill':
          result = await executeSkillNode(node);
          break;
        case 'agent':
          result = await executeAgentNode(node);
          break;
        case 'condition':
          result = await evaluateCondition(node, results);
          break;
        case 'parallel':
          // Parallel execution would need special handling
          result = { status: 'parallel_placeholder' };
          break;
        case 'handoff':
          result = await executeHandoff(node, results);
          break;
        default:
          result = { status: 'completed' };
      }
      results[nodeId] = { node, result };
      
      // Highlight executing node
      highlightNode(nodeId, 'executing');
      await new Promise(r => setTimeout(r, 500));
      highlightNode(nodeId, 'completed');
    } catch (err) {
      results[nodeId] = { node, error: err.message };
      highlightNode(nodeId, 'error');
      showToast(`Node ${node.label} failed: ${err.message}`, 'error');
      break;
    }
  }
  
  showToast('Workflow execution completed', 'success');
}

function topologicalSort() {
  const inDegree = new Map();
  const adjList = new Map();
  
  workflowState.nodes.forEach(node => {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  });
  
  workflowState.edges.forEach(edge => {
    adjList.get(edge.from).push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });
  
  const queue = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });
  
  const result = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    result.push(nodeId);
    
    for (const neighbor of adjList.get(nodeId) || []) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }
  
  return result.length === workflowState.nodes.length ? result : null;
}

async function executeSkillNode(node) {
  const skillName = node.config.skill;
  if (!skillName) throw new Error('No skill configured');
  
  const agent = node.config.agent || 'auto';
  const input = node.config.input || '';
  
  const result = await api.runSkill(skillName, { input, agent });
  return result;
}

async function executeAgentNode(node) {
  const agent = node.config.agent || 'opencode';
  const prompt = node.config.prompt || 'Continue the workflow';
  
  const result = await api.chat(agent, prompt);
  return result;
}

async function evaluateCondition(node, results) {
  const condition = node.config.condition;
  if (!condition) return false;
  
  // Simple condition evaluation (in production, use a proper expression evaluator)
  try {
    // Replace variable references with actual values
    let expr = condition;
    Object.entries(results).forEach(([id, data]) => {
      if (data.result) {
        const val = JSON.stringify(data.result);
        expr = expr.replace(new RegExp(`\\$\{${id}\}`, 'g'), val);
        expr = expr.replace(new RegExp(`\\$${id}`, 'g'), val);
      }
    });
    
    // Simple eval (in production, use a safe evaluator)
    return eval(expr);
  } catch (e) {
    return false;
  }
}

async function executeHandoff(node, results) {
  // Handoff execution would create a handoff record
  return { status: 'handoff_created' };
}

function highlightNode(nodeId, status) {
  const el = document.getElementById(`node-${nodeId}`);
  if (!el) return;
  
  el.classList.remove('executing', 'completed', 'error');
  el.classList.add(status);
}

function topologicalSort() {
  const inDegree = new Map();
  const adjList = new Map();
  
  workflowState.nodes.forEach(node => {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  });
  
  workflowState.edges.forEach(edge => {
    adjList.get(edge.from).push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });
  
  const queue = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });
  
  const result = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    result.push(nodeId);
    
    for (const neighbor of adjList.get(nodeId) || []) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }
  
  return result.length === workflowState.nodes.length ? result : null;
}

function highlightNode(nodeId, status) {
  const el = document.getElementById(`node-${nodeId}`);
  if (!el) return;
  
  el.classList.remove('executing', 'completed', 'error');
  el.classList.add(status);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          if (e.shiftKey) { e.preventDefault(); redo(); }
          else { e.preventDefault(); undo(); }
          break;
        case 'y':
          e.preventDefault(); redo();
          break;
        case 's':
          e.preventDefault(); saveWorkflow();
          break;
        case 'a':
          // Select all - not implemented
          break;
      }
    } else {
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
        case 'Escape':
          closeInspector();
          closeWorkflowModal();
          break;
      }
    }
  });
}
  
  function onNodeMouseDown(e, nodeId) {
  
  if (e.button === 0) {
    selectNode(nodeId);
    
    const node = workflowState.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Drag handling
    const startX = e.clientX;
    const startY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;
    
    function onMouseMove(moveEvent) {
      const dx = (moveEvent.clientX - startX) / workflowState.zoom;
      const dy = (moveEvent.clientY - startY) / workflowState.zoom;
      
      node.x = startNodeX + dx;
      node.y = startNodeY + dy;
      
      renderNodes();
      drawEdges();
      updateMinimap();
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      pushHistory();
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}

function showNodeContextMenu(e, nodeId) {
  e.preventDefault();
  e.stopPropagation();
  
  selectNode(nodeId);
  
  const menu = document.createElement('div');
  menu.style.cssText = `
    position:fixed;top:${e.clientY}px;left:${e.clientX}px;
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius);padding:8px;z-index:1000;
    min-width:180px;box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `;
  menu.innerHTML = `
    <div onclick="duplicateNode('${nodeId}')" style="padding:8px 12px;cursor:pointer">📋 Duplicate</div>
    <div onclick="deleteNode('${nodeId}')" style="padding:8px 12px;cursor:pointer;color:var(--red)">🗑 Delete</div>
    <hr style="margin:8px 0;border-color:var(--border)">
    <div onclick="showNodeInspector('${nodeId}')" style="padding:8px 12px;cursor:pointer">⚙️ Inspect</div>
  `;
  document.body.appendChild(menu);
  
  function closeMenu() {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function showModal(title, bodyHtml, footerHtml) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

function closeWorkflowModal() {
  document.getElementById('workflowModal').style.display = 'none';
}


// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash === '#workflow-designer') {
    renderWorkflowDesigner();
  }
});

// Export for global access
window.WorkflowDesigner = {
  render: renderWorkflowDesigner,
  state: workflowState,
  NODE_TYPES,
};