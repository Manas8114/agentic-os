// Dockable Panels - Resizable/collapsible split panes with localStorage persistence
// Provides draggable splitters, min/max enforcement, and state persistence

const DockablePanels = (function() {
  const STORAGE_KEY = 'agentic_os_dockable_panels';
  const MIN_SIZE = 120; // minimum pixels for panel
  const SPLITTER_SIZE = 8; // drag handle size
  let instances = new Map();

  // ─── Core State Management ───────────────────────────────────────
  function saveState() {
    const state = {};
    instances.forEach((instance, id) => {
      state[id] = {
        orientation: instance.orientation,
        sizes: instance.panels.map(p => p.size),
        collapsed: instance.panels.map(p => p.collapsed || false),
        order: instance.panels.map(p => p.id)
      };
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save panel state:', e);
    }
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  // ─── Panel Instance ────────────────────────────────────────────────
  class PanelInstance {
    constructor(container, options = {}) {
      this.id = options.id || 'dockable-' + Math.random().toString(36).substr(2, 9);
      this.container = container;
      this.orientation = options.orientation || 'horizontal'; // 'horizontal' | 'vertical'
      this.panels = [];
      this.splitters = [];
      this._dragState = null;
      this._initialized = false;

      // Apply stored state
      const saved = loadState()[this.id];
      if (saved) {
        this.orientation = saved.orientation || this.orientation;
      }

      this._init();
      instances.set(this.id, this);
    }

    _init() {
      if (this._initialized) return;
      this._initialized = true;

      // Setup container
      this.container.style.display = 'flex';
      this.container.style.overflow = 'hidden';
      this.container.style.position = 'relative';
      this.container.classList.add('dockable-container');
      this.container.dataset.dockableId = this.id;

      if (this.orientation === 'horizontal') {
        this.container.style.flexDirection = 'row';
        this.container.style.height = '100%';
      } else {
        this.container.style.flexDirection = 'column';
        this.container.style.width = '100%';
      }

      // Process existing children as panels
      const children = Array.from(this.container.children);
      children.forEach((child, index) => {
        if (child.classList.contains('dockable-splitter')) return; // skip splitters
        this.addPanel(child, { id: child.id || `panel-${index}` });
      });

      // Restore saved sizes
      const saved = loadState()[this.id];
      if (saved && saved.sizes) {
        saved.sizes.forEach((size, i) => {
          if (this.panels[i]) this.panels[i].size = size;
        });
        if (saved.collapsed) {
          saved.collapsed.forEach((collapsed, i) => {
            if (this.panels[i]) this.panels[i].collapsed = collapsed;
          });
        }
        this._applySizes();
      }
    }

    addPanel(element, options = {}) {
      const panel = {
        id: options.id || `panel-${this.panels.length}`,
        element,
        size: options.size || null, // null = auto (flex: 1)
        minSize: options.minSize || MIN_SIZE,
        maxSize: options.maxSize || null,
        collapsed: false,
        order: this.panels.length
      };

      // Style the panel
      element.style.flex = '0 0 auto';
      element.style.overflow = 'auto';
      element.style.position = 'relative';
      element.dataset.dockablePanel = panel.id;

      // Add collapse button if not present
      if (!element.querySelector('.dockable-collapse-btn')) {
        this._addCollapseButton(element, panel);
      }

      this.panels.push(panel);
      this._insertSplitterIfNeeded();
      this._applySizes();
      return panel;
    }

    removePanel(panelId) {
      const index = this.panels.findIndex(p => p.id === panelId);
      if (index === -1) return;

      const panel = this.panels[index];
      panel.element.remove();
      this.panels.splice(index, 1);

      // Remove associated splitter
      if (index < this.splitters.length) {
        this.splitters[index].remove();
        this.splitters.splice(index, 1);
      } else if (this.splitters.length > 0) {
        this.splitters[this.splitters.length - 1].remove();
        this.splitters.pop();
      }

      // Re-index
      this.panels.forEach((p, i) => { p.order = i; });
      this._applySizes();
      saveState();
    }

    _addCollapseButton(element, panel) {
      const btn = document.createElement('button');
      btn.className = 'dockable-collapse-btn';
      btn.innerHTML = '◀';
      btn.style.cssText = `
        position:absolute; top:8px; right:8px; z-index:10;
        width:24px; height:24px; border-radius:4px;
        background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1);
        color:var(--text-secondary); font-size:12px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        opacity:0; transition:opacity 0.2s;
      `;
      btn.title = 'Collapse panel';
      element.style.position = 'relative';
      element.appendChild(btn);

      element.addEventListener('mouseenter', () => btn.style.opacity = '1');
      element.addEventListener('mouseleave', () => btn.style.opacity = '0');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse(panel.id);
      });

      panel.collapseBtn = btn;
    }

    _insertSplitterIfNeeded() {
      // Add splitters between panels
      while (this.splitters.length < this.panels.length - 1) {
        const splitterIndex = this.splitters.length;
        const splitter = document.createElement('div');
        splitter.className = 'dockable-splitter';
        splitter.dataset.splitterIndex = splitterIndex;
        splitter.style.cssText = `
          flex: 0 0 ${SPLITTER_SIZE}px;
          background: transparent;
          cursor: ${this.orientation === 'horizontal' ? 'col-resize' : 'row-resize'};
          position: relative;
          z-index: 100;
          transition: background 0.15s;
        `;

        // Visual handle
        const handle = document.createElement('div');
        handle.style.cssText = `
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 2px; height: 40px; border-radius: 1px;
          background: var(--border); opacity: 0.5;
          transition: opacity 0.2s, width 0.2s, background 0.2s;
        `;
        if (this.orientation === 'vertical') {
          handle.style.width = '40px';
          handle.style.height = '2px';
        }
        splitter.appendChild(handle);

        // Hover effect
        splitter.addEventListener('mouseenter', () => {
          handle.style.opacity = '1';
          handle.style.width = this.orientation === 'horizontal' ? '4px' : '40px';
          handle.style.height = this.orientation === 'horizontal' ? '40px' : '4px';
          handle.style.background = 'var(--accent)';
        });
        splitter.addEventListener('mouseleave', () => {
          if (!this._dragState || this._dragState.splitterIndex !== splitterIndex) {
            handle.style.opacity = '0.5';
            handle.style.width = this.orientation === 'horizontal' ? '2px' : '40px';
            handle.style.height = this.orientation === 'horizontal' ? '40px' : '2px';
            handle.style.background = 'var(--border)';
          }
        });

        // Drag events
        splitter.addEventListener('mousedown', (e) => this._startDrag(e, splitterIndex));
        document.addEventListener('mousemove', (e) => this._onDrag(e));
        document.addEventListener('mouseup', () => this._endDrag());

        this.container.insertBefore(splitter, this.panels[splitterIndex + 1].element);
        this.splitters.push(splitter);
      }
    }

    _startDrag(e, splitterIndex) {
      if (this.panels[splitterIndex].collapsed || this.panels[splitterIndex + 1].collapsed) return;

      this._dragState = {
        splitterIndex,
        startX: e.clientX,
        startY: e.clientY,
        leftSize: this.panels[splitterIndex].element.offsetWidth || this.panels[splitterIndex].element.offsetHeight,
        rightSize: this.panels[splitterIndex + 1].element.offsetWidth || this.panels[splitterIndex + 1].element.offsetHeight,
        orientation: this.orientation,
        containerSize: this.orientation === 'horizontal'
          ? this.container.offsetWidth
          : this.container.offsetHeight
      };

      // Visual feedback
      const splitter = this.splitters[splitterIndex];
      splitter.style.background = 'var(--accent-glow)';
      splitter.querySelector('div').style.opacity = '1';
      splitter.querySelector('div').style.background = 'var(--accent)';
      document.body.style.cursor = this.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      e.preventDefault();
    }

    _onDrag(e) {
      if (!this._dragState) return;

      const delta = this.orientation === 'horizontal'
        ? e.clientX - this._dragState.startX
        : e.clientY - this._dragState.startY;

      const leftPanel = this.panels[this._dragState.splitterIndex];
      const rightPanel = this.panels[this._dragState.splitterIndex + 1];

      const newLeftSize = Math.max(leftPanel.minSize, this._dragState.leftSize + delta);
      const newRightSize = Math.max(rightPanel.minSize, this._dragState.rightSize - delta);

      // Check max constraints
      if (leftPanel.maxSize && newLeftSize > leftPanel.maxSize) return;
      if (rightPanel.maxSize && newRightSize > rightPanel.maxSize) return;

      // Check container bounds
      const total = newLeftSize + newRightSize;
      if (total > this._dragState.containerSize - SPLITTER_SIZE) return;

      leftPanel.size = newLeftSize;
      rightPanel.size = newRightSize;
      this._applySizes();
    }

    _endDrag() {
      if (!this._dragState) return;

      const splitter = this.splitters[this._dragState.splitterIndex];
      if (splitter) {
        splitter.style.background = 'transparent';
        const handle = splitter.querySelector('div');
        handle.style.opacity = '0.5';
        handle.style.width = this.orientation === 'horizontal' ? '2px' : '40px';
        handle.style.height = this.orientation === 'horizontal' ? '40px' : '2px';
        handle.style.background = 'var(--border)';
      }

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this._dragState = null;
      saveState();
    }

    toggleCollapse(panelId) {
      const panel = this.panels.find(p => p.id === panelId);
      if (!panel) return;

      if (panel.collapsed) {
        // Expand
        panel.collapsed = false;
        panel.element.style.display = '';
        panel.element.style.flex = `0 0 ${panel.size || 300}px`;
        if (panel.collapseBtn) panel.collapseBtn.innerHTML = this.orientation === 'horizontal' ? '◀' : '▲';
      } else {
        // Collapse
        panel.collapsed = true;
        panel.size = panel.element.offsetWidth || panel.element.offsetHeight;
        panel.element.style.display = 'none';
        panel.element.style.flex = '0 0 0';
        if (panel.collapseBtn) panel.collapseBtn.innerHTML = this.orientation === 'horizontal' ? '▶' : '▼';
      }

      // Also hide/show associated splitter
      const index = this.panels.indexOf(panel);
      if (index > 0 && this.splitters[index - 1]) {
        this.splitters[index - 1].style.display = panel.collapsed ? 'none' : '';
      }
      if (index < this.splitters.length && this.splitters[index]) {
        this.splitters[index].style.display = panel.collapsed ? 'none' : '';
      }

      this._applySizes();
      saveState();
    }

    setOrientation(orientation) {
      if (orientation === this.orientation) return;
      this.orientation = orientation;
      this.container.style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
      this.splitters.forEach(s => {
        s.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
        const handle = s.querySelector('div');
        handle.style.width = orientation === 'horizontal' ? '2px' : '40px';
        handle.style.height = orientation === 'horizontal' ? '40px' : '2px';
      });
      this._applySizes();
      saveState();
    }

    _applySizes() {
      this.panels.forEach((panel, i) => {
        if (panel.collapsed) {
          panel.element.style.flex = '0 0 0';
          panel.element.style.display = 'none';
        } else if (panel.size) {
          panel.element.style.flex = `0 0 ${panel.size}px`;
          panel.element.style.display = '';
        } else {
          // Auto size (remaining space)
          panel.element.style.flex = '1 1 auto';
          panel.element.style.display = '';
        }
      });

      // Update splitter visibility
      this.splitters.forEach((splitter, i) => {
        const leftCollapsed = this.panels[i]?.collapsed;
        const rightCollapsed = this.panels[i + 1]?.collapsed;
        splitter.style.display = (leftCollapsed || rightCollapsed) ? 'none' : '';
      });

      // Update collapse button icons
      this.panels.forEach(panel => {
        if (panel.collapseBtn) {
          panel.collapseBtn.innerHTML = panel.collapsed
            ? (this.orientation === 'horizontal' ? '▶' : '▼')
            : (this.orientation === 'horizontal' ? '◀' : '▲');
        }
      });
    }

    destroy() {
      this.splitters.forEach(s => s.remove());
      this.panels.forEach(p => {
        if (p.collapseBtn) p.collapseBtn.remove();
      });
      instances.delete(this.id);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────
  function create(container, options) {
    return new PanelInstance(container, options);
  }

  function get(id) {
    return instances.get(id);
  }

  function destroy(id) {
    const instance = instances.get(id);
    if (instance) instance.destroy();
  }

  function saveAll() {
    saveState();
  }

  // Auto-initialize containers with data-dockable attribute
  function autoInit() {
    document.querySelectorAll('[data-dockable]').forEach(container => {
      if (!instances.has(container.dataset.dockable)) {
        const orientation = container.dataset.dockableOrientation || 'horizontal';
        create(container, { id: container.dataset.dockable, orientation });
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  return {
    create,
    get,
    destroy,
    saveAll,
    autoInit
  };
})();

// Global exposure
window.DockablePanels = DockablePanels;

// Also expose a simple function for creating dockable panels anywhere
window.makeDockable = function(container, options) {
  return DockablePanels.create(container, options);
};