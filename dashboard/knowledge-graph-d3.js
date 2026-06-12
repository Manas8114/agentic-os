// D3.js Force-Directed Knowledge Graph Component
// Provides zoom/pan, drag, clustering, and enhanced interaction

const KG_D3_STATE = {
  svg: null,
  g: null,
  simulation: null,
  nodes: [],
  links: [],
  zoom: null,
  container: null,
  width: 0,
  height: 0,
  colors: {
    gcp_service: '#fd79a8',
    tech_stack: '#6c5ce7',
    project: '#fdcb6e',
    proper_noun: '#00cec9',
    quoted: '#fab1a0',
    unknown: '#a29bfe'
  },
  typeColors: {
    gcp_service: 'var(--pink)',
    tech_stack: 'var(--purple)',
    project: 'var(--yellow)',
    proper_noun: 'var(--green)',
    quoted: 'var(--orange)',
    unknown: 'var(--accent)'
  }
};

function initKGD3Graph(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof d3 === 'undefined') {
    console.warn('D3 not available or container not found');
    return null;
  }

  // Dimensions
  const width = container.clientWidth;
  const height = container.clientHeight;
  KG_D3_STATE.width = width;
  KG_D3_STATE.height = height;
  KG_D3_STATE.container = container;

  // Clear existing
  container.innerHTML = '';

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('display', 'block')
    .style('background', 'var(--bg-primary)');

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Main group for zoom/pan
  const g = svg.append('g');

  // Arrowhead marker definitions
  const defs = g.append('defs');
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'rgba(150,150,150,0.6)');

  // Add zoom controls
  const controls = d3.select(container)
    .append('div')
    .attr('class', 'd3-zoom-controls')
    .style('position', 'absolute')
    .style('top', '16px')
    .style('right', '16px')
    .style('display', 'flex')
    .style('gap', '8px')
    .style('z-index', 100)
    .style('pointer-events', 'auto');

  const makeBtn = (icon, title, onClick) => {
    return controls.append('button')
      .attr('class', 'btn btn-sm btn-ghost')
      .attr('title', title)
      .style('padding', '8px 12px')
      .style('font-size', '16px')
      .text(icon)
      .on('click', onClick);
  };

  makeBtn('🔍', 'Zoom In', () => svg.transition().duration(300).call(zoom.scaleBy, 1.5));
  makeBtn('🔎', 'Zoom Out', () => svg.transition().duration(300).call(zoom.scaleBy, 0.75));
  makeBtn('🏠', 'Reset View', () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity));
  makeBtn('⚡', 'Toggle Physics', togglePhysics);
  makeBtn('📍', 'Center Graph', centerGraph);

  // Add legend
  const legend = d3.select(container)
    .append('div')
    .attr('class', 'd3-legend')
    .style('position', 'absolute')
    .style('bottom', '16px')
    .style('left', '16px')
    .style('background', 'var(--bg-card)')
    .style('border', '1px solid var(--border)')
    .style('border-radius', '8px')
    .style('padding', '12px 16px')
    .style('font-size', '11px')
    .style('z-index', 100)
    .style('pointer-events', 'auto')
    .style('display', 'flex')
    .style('flex-wrap', 'wrap')
    .style('gap', '8px')
    .style('max-width', '90%');

  const typeLabels = {
    gcp_service: '☁️ GCP Service',
    tech_stack: '⚙️ Tech Stack',
    project: '📦 Project',
    proper_noun: '🏷️ Proper Noun',
    quoted: '💬 Quoted',
    unknown: '🏷️ Unknown'
  };

  Object.entries(KG_D3_STATE.colors).forEach(([type, color]) => {
    legend.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '6px')
      .style('color', 'var(--text-secondary)')
      .html(`<span style="width:12px;height:12px;border-radius:50%;background:${color}"></span>${typeLabels[type] || type}`);
  });

  KG_D3_STATE.svg = svg;
  KG_D3_STATE.g = g;
  KG_D3_STATE.zoom = zoom;

  // Create force simulation
  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(120).strength(0.7))
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(400))
    .force('center', d3.forceCenter(KG_D3_STATE.width / 2, KG_D3_STATE.height / 2))
    .force('collision', d3.forceCollide().radius(d => (d.radius || 30) + 8).strength(0.8))
    .force('x', d3.forceX(KG_D3_STATE.width / 2).strength(0.02))
    .force('y', d3.forceY(KG_D3_STATE.height / 2).strength(0.02))
    .alphaDecay(0.02)
    .velocityDecay(0.4);

  KG_D3_STATE.simulation = simulation;

  // Handle window resize
  window.addEventListener('resize', () => {
    if (!KG_D3_STATE.container) return;
    const width = KG_D3_STATE.container.clientWidth;
    const height = KG_D3_STATE.container.clientHeight;
    KG_D3_STATE.width = width;
    KG_D3_STATE.height = height;
    d3.select(KG_D3_STATE.container).select('svg')
      .attr('viewBox', `0 0 ${width} ${height}`);
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
  });

  return {
    svg,
    g,
    simulation,
    zoom,
    update: updateGraph,
    setData: setGraphData,
    centerGraph,
    togglePhysics,
    destroy: () => {
      if (simulation) simulation.stop();
      window.removeEventListener('resize', resizeHandler);
      container.innerHTML = '';
      KG_D3_STATE.svg = null;
      KG_D3_STATE.g = null;
      KG_D3_STATE.simulation = null;
      KG_D3_STATE.zoom = null;
    }
  };

  function resizeHandler() {
    const width = KG_D3_STATE.container.clientWidth;
    const height = KG_D3_STATE.container.clientHeight;
    KG_D3_STATE.width = width;
    KG_D3_STATE.height = height;
    d3.select(KG_D3_STATE.container).select('svg').attr('viewBox', `0 0 ${width} ${height}`);
    if (simulation) simulation.force('center', d3.forceCenter(width / 2, height / 2)).alpha(0.3).restart();
  }
}

function setGraphData(apiData) {
  // Convert KG data to D3 format
  const entities = apiData.entities || [];
  const relations = apiData.relations || [];

  nodes = entities.map(e => ({
    id: e.name,
    label: e.name,
    type: e.type,
    mentions: e.mentions?.length || 0,
    radius: Math.max(20, Math.min(50, 25 + (e.mentions?.length || 0) * 3)),
    color: KG_D3_STATE.colors[e.type] || KG_D3_STATE.colors.unknown,
    type: e.type,
    x: Math.random() * KG_D3_STATE.width,
    y: Math.random() * KG_D3_STATE.height
  }));

  const entityMap = {};
  nodes.forEach(n => entityMap[n.id] = n);

  links = relations
    .filter(r => entityMap[r.source] && entityMap[r.target])
    .map(r => ({
      source: entityMap[r.source],
      target: entityMap[r.target],
      type: r.type || 'co_occurs',
      weight: r.source_count || 1
    }));

  KG_D3_STATE.nodes = nodes;
  KG_D3_STATE.links = links;
}

function updateGraph(nodesData, linksData) {
  if (!KG_D3_STATE.g || !KG_D3_STATE.simulation) return;

  // Update nodes
  const node = KG_D3_STATE.g.selectAll('.node')
    .data(nodesData, d => d.id);

  // Enter new nodes
  const nodeEnter = node.enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded));

  nodeEnter.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => d.color)
    .attr('stroke', 'rgba(255,255,255,0.2)')
    .attr('stroke-width', 2);

  nodeEnter.append('text')
    .attr('dy', d => d.radius + 16)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('font-family', 'Inter, sans-serif')
    .attr('fill', 'white')
    .text(d => d.label)
    .style('pointer-events', 'none');

  nodeEnter.append('title')
    .text(d => `${d.label} (${d.type}) - ${d.mentions} mentions`);

  // Merge
  const nodeMerged = node.merge(nodeEnter);

  // Update existing
  nodeMerged.select('circle')
    .transition().duration(300)
    .attr('r', d => d.radius)
    .attr('fill', d => d.color);

  nodeMerged.select('text')
    .attr('dy', d => d.radius + 16)
    .text(d => d.label);

  // Remove exited
  node.exit().remove();

  // Update links
  const link = KG_D3_STATE.g.selectAll('.link')
    .data(linksData, d => `${d.source.id}-${d.target.id}`);

  const linkEnter = link.enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', 'rgba(150,150,150,0.4)')
    .attr('stroke-width', d => Math.max(1, Math.min(3, d.weight)))
    .attr('marker-end', 'url(#arrowhead)')
    .style('opacity', 0);

  linkEnter.transition().duration(300).style('opacity', 1);

  link.merge(linkEnter)
    .transition().duration(300)
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  link.exit().transition().duration(300).style('opacity', 0).remove();

  // Update simulation
  if (KG_D3_STATE.simulation) {
    KG_D3_STATE.simulation.nodes(nodesData);
    KG_D3_STATE.simulation.force('link').links(linksData);
    KG_D3_STATE.simulation.alpha(0.5).restart();
  }

  // Tick function
  KG_D3_STATE.simulation.on('tick', () => {
    KG_D3_STATE.g.selectAll('.link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    KG_D3_STATE.g.selectAll('.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

function dragStarted(event, d) {
  if (!event.active) KG_D3_STATE.simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnded(event, d) {
  if (!event.active) KG_D3_STATE.simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function togglePhysics() {
  if (!KG_D3_STATE.simulation) return;
  const enabled = KG_D3_STATE.simulation.alpha() > 0.001;
  if (enabled) {
    KG_D3_STATE.simulation.stop();
    showToast('Physics paused', 'info');
  } else {
    KG_D3_STATE.simulation.restart();
    showToast('Physics resumed', 'info');
  }
}

function centerGraph() {
  if (!KG_D3_STATE.zoom || !KG_D3_STATE.svg) return;
  KG_D3_STATE.svg.transition().duration(750).call(
    KG_D3_STATE.zoom.transform,
    d3.zoomIdentity.translate(KG_D3_STATE.width / 2, KG_D3_STATE.height / 2).scale(1)
  );
}

// Export for use in knowledge-graph.js
window.KG_D3 = {
  init: initKGD3Graph,
  setData: setGraphData,
  update: updateGraph,
  togglePhysics,
  centerGraph
};