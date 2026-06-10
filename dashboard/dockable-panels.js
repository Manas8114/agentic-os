// Dockable Panels — Resizable, collapsible, draggable split panes with layout persistence
const DockablePanels = (function() {
  const STORAGE_KEY = 'agentic_panel_layouts';
  const MIN_PANEL_SIZE = 180; // pixels
  const HANDLE_SIZE = 6; // pixels

  let layouts = {};
  let activePanels = new Map(); // containerId -> panel data
  let resizeObserver = null;

  // Load layouts from localStorage
  function loadLayouts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) layouts = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load panel layouts:', e);
      layouts = {};
    }
  }

  // Save layouts to localStorage
  function saveLayouts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch (e) {
      console.warn('Failed to save panel layouts:', e);
    }
  }

  // Get saved layout for a container
  function getSavedLayout(containerId) {
    return layouts[containerId] || null;
  }

  // Save layout for a container
  function saveLayout(containerId, layout) {
    layouts[containerId] = layout;
    saveLayouts();
  }

  // Initialize a split container
  function init(container, options = {}) {
    const containerId = options.id || container.id || 'split-' + Math.random().toString(36).substr(2, 9);
    container.id = containerId;
    container.classList.add('dockable-split');

    const {
      direction = 'horizontal', // 'horizontal' or 'vertical'
      panels = [], // array of { id, element, minSize, maxSize, collapsed, collapsedSize }
      defaultSizes = [], // percentages or pixels
      onResize = null,
      onCollapse = null,
      persist = true,
    } = options;

    // Apply direction
    container.style.flexDirection = direction === 'horizontal' ? 'row' : 'column';

    // Load saved layout
    const saved = persist ? getSavedLayout(containerId) : null;

    // Build panel data
    const panelData = panels.map((p, i) => {
      const savedPanel = saved?.panels?.[i];
      return {
        id: p.id || `panel-${i}`,
        element: p.element,
        minSize: p.minSize || MIN_PANEL_SIZE,
        maxSize: p.maxSize || Infinity,
        collapsed: savedPanel?.collapsed ?? p.collapsed ?? false,
        collapsedSize: p.collapsedSize || 32,
        size: savedPanel?.size ?? (defaultSizes[i] || (100 / panels.length)),
        isPixel: typeof (savedPanel?.size ?? defaultSizes[i]) === 'number' && (savedPanel?.size ?? defaultSizes[i]) > 100,
      };
    });

    activePanels.set(containerId, {
      container,
      direction,
      panels: panelData,
      onResize,
      onCollapse,
      persist,
    });

    // Wrap panels and add handles
    buildUI(container, panelData, direction, containerId);

    // Apply initial sizes
    setTimeout(() => applySizes(containerId), 0);

    // Setup resize observer for responsive behavior
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const cid = entry.target.id;
          if (activePanels.has(cid)) {
            applySizes(cid);
          }
        }
      });
    }
    resizeObserver.observe(container);

    return {
      containerId,
      setSizes: (sizes) => setSizes(containerId, sizes),
      getSizes: () => getSizes(containerId),
      collapse: (panelId) => toggleCollapse(containerId, panelId, true),
      expand: (panelId) => toggleCollapse(containerId, panelId, false),
      toggleCollapse: (panelId) => toggleCollapse(containerId, panelId),
      destroy: () => destroy(containerId),
    };
  }

  function buildUI(container, panels, direction, containerId) {
    container.innerHTML = '';

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const wrapper = document.createElement('div');
      wrapper.className = 'dockable-panel-wrapper';
      wrapper.dataset.panelId = panel.id;
      wrapper.style.flex = '0 0 auto';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.overflow = 'hidden';
      wrapper.style.minWidth = '0';
      wrapper.style.minHeight = '0';

      // Add header with collapse button
      const header = document.createElement('div');
      header.className = 'dockable-panel-header';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '8px 12px';
      header.style.background = 'var(--bg-secondary)';
      header.style.borderBottom = '1px solid var(--border)';
      header.style.flexShrink = '0';
      header.innerHTML = `
        <span class="dockable-panel-title" style="font-weight:600;font-size:13px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${panel.element.dataset.panelTitle || panel.id}</span>
        <button class="dockable-collapse-btn" aria-label="Collapse panel" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:var(--radius-sm);font-size:14px;line-height:1;transition:var(--transition)" title="Collapse/Expand">
          ${direction === 'horizontal' ? '◀' : '▲'}
        </button>
      `;
      wrapper.appendChild(header);

      // Panel content area
      const content = document.createElement('div');
      content.className = 'dockable-panel-content';
      content.style.flex = '1';
      content.style.overflow = 'auto';
      content.style.minHeight = '0';
      content.style.minWidth = '0';
      content.appendChild(panel.element);
      wrapper.appendChild(content);

      container.appendChild(wrapper);

      // Add handle between panels (except after last)
      if (i < panels.length - 1) {
        const handle = document.createElement('div');
        handle.className = 'dockable-handle';
        handle.dataset.containerId = containerId;
        handle.dataset.index = i;
        handle.style.flex = '0 0 ' + HANDLE_SIZE + 'px';
        handle.style.background = 'var(--border)';
        handle.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        handle.style.position = 'relative';
        handle.style.transition = 'background 0.2s';
        handle.style.zIndex = '10';

        // Handle hover effect
        handle.innerHTML = `
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;background:var(--accent-glow);border-radius:50%;opacity:0;transition:opacity 0.2s;pointer-events:none"></div>
        `;
        handle.addEventListener('mouseenter', () => {
          handle.style.background = 'var(--accent)';
          handle.querySelector('div').style.opacity = '1';
        });
        handle.addEventListener('mouseleave', () => {
          if (!handle.classList.contains('dragging')) {
            handle.style.background = 'var(--border)';
            handle.querySelector('div').style.opacity = '0';
          }
        });

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });

        container.appendChild(handle);
      }
    }

    // Collapse button handlers
    container.querySelectorAll('.dockable-collapse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = e.target.closest('.dockable-panel-wrapper');
        const panelId = wrapper.dataset.panelId;
        toggleCollapse(containerId, panelId);
      });
    });
  }

  function startResize(e) {
    e.preventDefault();
    const handle = e.target.closest('.dockable-handle');
    if (!handle) return;

    const containerId = handle.dataset.containerId;
    const index = parseInt(handle.dataset.index);
    const data = activePanels.get(containerId);
    if (!data) return;

    const isHorizontal = data.direction === 'horizontal';
    const startPos = isHorizontal ? e.clientX : e.clientY;
    const panels = data.panels;

    // Get current sizes in pixels
    const container = data.container;
    const rect = container.getBoundingClientRect();
    const containerSize = isHorizontal ? rect.width : rect.height;

    const panel1 = panels[index];
    const panel2 = panels[index + 1];
    const wrapper1 = container.querySelector(`[data-panel-id="${panel1.id}"]`);
    const wrapper2 = container.querySelector(`[data-panel-id="${panel2.id}"]`);

    const startSize1 = isHorizontal ? wrapper1.offsetWidth : wrapper1.offsetHeight;
    const startSize2 = isHorizontal ? wrapper2.offsetWidth : wrapper2.offsetHeight;

    handle.classList.add('dragging');
    handle.style.background = 'var(--accent)';
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const delta = currentPos - startPos;

      let newSize1 = startSize1 + delta;
      let newSize2 = startSize2 - delta;

      // Enforce min sizes
      if (newSize1 < panel1.minSize) {
        newSize1 = panel1.minSize;
        newSize2 = startSize1 + startSize2 - newSize1;
      }
      if (newSize2 < panel2.minSize) {
        newSize2 = panel2.minSize;
        newSize1 = startSize1 + startSize2 - newSize2;
      }

      // Enforce max sizes
      if (newSize1 > panel1.maxSize) {
        newSize1 = panel1.maxSize;
        newSize2 = startSize1 + startSize2 - newSize1;
      }
      if (newSize2 > panel2.maxSize) {
        newSize2 = panel2.maxSize;
        newSize1 = startSize1 + startSize2 - newSize2;
      }

      // Apply sizes
      applyPixelSizes(containerId, index, newSize1, newSize2);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      handle.classList.remove('dragging');
      handle.style.background = 'var(--border)';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save layout
      if (data.persist) saveCurrentLayout(containerId);

      if (data.onResize) data.onResize(getSizes(containerId));
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  function applyPixelSizes(containerId, index, size1, size2) {
    const data = activePanels.get(containerId);
    if (!data) return;

    const container = data.container;
    const isHorizontal = data.direction === 'horizontal';
    const rect = container.getBoundingClientRect();
    const containerSize = isHorizontal ? rect.width : rect.height;

    const pct1 = (size1 / containerSize) * 100;
    const pct2 = (size2 / containerSize) * 100;

    data.panels[index].size = pct1;
    data.panels[index].isPixel = false;
    data.panels[index + 1].size = pct2;
    data.panels[index + 1].isPixel = false;

    const wrapper1 = container.querySelector(`[data-panel-id="${data.panels[index].id}"]`);
    const wrapper2 = container.querySelector(`[data-panel-id="${data.panels[index + 1].id}"]`);

    if (isHorizontal) {
      wrapper1.style.flex = `0 0 ${pct1}%`;
      wrapper2.style.flex = `0 0 ${pct2}%`;
    } else {
      wrapper1.style.flex = `0 0 ${pct1}%`;
      wrapper2.style.flex = `0 0 ${pct2}%`;
    }
  }

  function applySizes(containerId) {
    const data = activePanels.get(containerId);
    if (!data) return;

    const container = data.container;
    const isHorizontal = data.direction === 'horizontal';
    const rect = container.getBoundingClientRect();
    const containerSize = isHorizontal ? rect.width : rect.height;

    if (containerSize < 50) return; // Not rendered yet

    data.panels.forEach((panel, i) => {
      const wrapper = container.querySelector(`[data-panel-id="${panel.id}"]`);
      if (!wrapper) return;

      let size = panel.size;
      if (panel.isPixel) {
        size = (panel.size / containerSize) * 100;
        panel.size = size;
        panel.isPixel = false;
      }

      // Handle collapsed panels
      if (panel.collapsed) {
        const collapsedPct = (panel.collapsedSize / containerSize) * 100;
        wrapper.style.flex = `0 0 ${collapsedPct}%`;
        wrapper.classList.add('collapsed');
        const btn = wrapper.querySelector('.dockable-collapse-btn');
        if (btn) btn.textContent = isHorizontal ? '▶' : '▼';
      } else {
        wrapper.style.flex = `0 0 ${size}%`;
        wrapper.classList.remove('collapsed');
        const btn = wrapper.querySelector('.dockable-collapse-btn');
        if (btn) btn.textContent = isHorizontal ? '◀' : '▲';
      }

      // Enforce min/max
      const currentSize = isHorizontal ? wrapper.offsetWidth : wrapper.offsetHeight;
      if (currentSize < panel.minSize && !panel.collapsed) {
        const minPct = (panel.minSize / containerSize) * 100;
        wrapper.style.flex = `0 0 ${minPct}%`;
        // Redistribute from siblings
        redistributeSpace(containerId, i, minPct);
      }
    });
  }

  function redistributeSpace(containerId, fixedIndex, fixedSize) {
    const data = activePanels.get(containerId);
    if (!data) return;

    const container = data.container;
    const isHorizontal = data.direction === 'horizontal';
    const rect = container.getBoundingClientRect();
    const containerSize = isHorizontal ? rect.width : rect.height;

    const fixedPct = fixedSize;
    const remainingPct = 100 - fixedPct;

    // Count flexible panels
    let flexibleCount = 0;
    let flexibleTotal = 0;
    data.panels.forEach((p, i) => {
      if (i !== fixedIndex && !p.collapsed) {
        flexibleCount++;
        flexibleTotal += p.size;
      }
    });

    if (flexibleCount === 0) return;

    const scale = remainingPct / flexibleTotal;

    data.panels.forEach((p, i) => {
      if (i === fixedIndex || p.collapsed) return;
      p.size = p.size * scale;
      const wrapper = container.querySelector(`[data-panel-id="${p.id}"]`);
      if (wrapper) wrapper.style.flex = `0 0 ${p.size}%`;
    });
  }

  function toggleCollapse(containerId, panelId, force = null) {
    const data = activePanels.get(containerId);
    if (!data) return;

    const panel = data.panels.find(p => p.id === panelId);
    if (!panel) return;

    const newState = force !== null ? force : !panel.collapsed;
    if (newState === panel.collapsed) return;

    panel.collapsed = newState;
    applySizes(containerId);

    if (data.persist) saveCurrentLayout(containerId);
    if (data.onCollapse) data.onCollapse(panelId, newState);
  }

  function setSizes(containerId, sizes) {
    const data = activePanels.get(containerId);
    if (!data) return;

    const total = sizes.reduce((a, b) => a + b, 0);
    data.panels.forEach((p, i) => {
      p.size = (sizes[i] / total) * 100;
      p.isPixel = false;
    });
    applySizes(containerId);

    if (data.persist) saveCurrentLayout(containerId);
    if (data.onResize) data.onResize(getSizes(containerId));
  }

  function getSizes(containerId) {
    const data = activePanels.get(containerId);
    if (!data) return [];

    const container = data.container;
    const isHorizontal = data.direction === 'horizontal';
    const rect = container.getBoundingClientRect();
    const containerSize = isHorizontal ? rect.width : rect.height;

    return data.panels.map(p => {
      const wrapper = container.querySelector(`[data-panel-id="${p.id}"]`);
      if (!wrapper) return Math.round(p.size / 100 * containerSize);
      return isHorizontal ? wrapper.offsetWidth : wrapper.offsetHeight;
    });
  }

  function saveCurrentLayout(containerId) {
    const data = activePanels.get(containerId);
    if (!data || !data.persist) return;

    const layout = {
      direction: data.direction,
      panels: data.panels.map(p => ({
        id: p.id,
        size: p.size,
        isPixel: p.isPixel,
        collapsed: p.collapsed,
        minSize: p.minSize,
        maxSize: p.maxSize,
      })),
    };
    saveLayout(containerId, layout);
  }

  function destroy(containerId) {
    const data = activePanels.get(containerId);
    if (data && resizeObserver) {
      resizeObserver.unobserve(data.container);
    }
    activePanels.delete(containerId);
  }

  // Initialize on load
  loadLayouts();

  // Public API
  return {
    init,
    loadLayouts,
    saveLayouts,
    getSavedLayout,
  };
})();

// Auto-initialize on elements with data-dockable attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-dockable]').forEach(el => {
    const options = {};
    try {
      options.direction = el.dataset.dockableDirection || 'horizontal';
      options.defaultSizes = el.dataset.dockableSizes ? JSON.parse(el.dataset.dockableSizes) : [];
      options.persist = el.dataset.dockablePersist !== 'false';
    } catch (e) {}

    // Find panel children
    const panels = Array.from(el.children).filter(c => c.classList.contains('dockable-panel') || c.dataset.panelId);
    if (panels.length >= 2) {
      DockablePanels.init(el, {
        direction: options.direction,
        panels: panels.map((p, i) => ({
          id: p.dataset.panelId || `panel-${i}`,
          element: p,
          minSize: parseInt(p.dataset.minSize) || 180,
          maxSize: parseInt(p.dataset.maxSize) || Infinity,
          collapsed: p.dataset.collapsed === 'true',
        })),
        defaultSizes: options.defaultSizes,
        persist: options.persist,
      });
    }
  });
});

// Expose globally
window.DockablePanels = DockablePanels;