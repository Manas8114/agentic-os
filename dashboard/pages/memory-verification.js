// Memory Verification Center — Health checks, initialization, and repair
let memoryVerifyState = {
  checks: [],
  overallStatus: 'unknown',
  summary: { passed: 0, warnings: 0, failed: 0, total: 0 },
  lastRun: null,
  initializing: false,
  repairing: false,
};

async function renderMemoryVerification() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Memory Verification Center</h1>
        <p class="page-subtitle">Health checks, initialization, and repair for the shared memory system</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="runVerification()" id="runVerifyBtn" style="padding:0 20px;height:42px">
          <span id="verifyBtnText">🔄 Run Verification</span>
          <span id="verifyBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
        </button>
        <button class="btn btn-warning" onclick="runInitialization()" id="initBtn" style="padding:0 20px;height:42px">
          <span id="initBtnText">🚀 Initialize</span>
          <span id="initBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
        </button>
        <button class="btn btn-danger" onclick="runRepair()" id="repairBtn" style="padding:0 20px;height:42px">
          <span id="repairBtnText">🔧 Repair</span>
          <span id="repairBtnSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
        </button>
      </div>
    </div>

    <!-- Overall Status Card -->
    <div class="card" style="margin-bottom:16px" id="overallStatusCard">
      <div class="loading" style="padding:20px;text-align:center"><div class="loading-spinner"></div></div>
    </div>

    <!-- Verification Checks Grid -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Verification Checks</h3>
        <div style="font-size:12px;color:var(--text-muted)" id="lastRunLabel">Last run: —</div>
      </div>
      <div class="card-body" style="padding:0" id="checksContainer">
        <div class="loading" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3 class="card-title">Quick Actions</h3></div>
      <div class="card-body" style="padding:16px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="reindexVectorDB()">📊 Re-index Vector DB</button>
        <button class="btn btn-ghost" onclick="rebuildKnowledgeGraph()">🕸️ Rebuild Knowledge Graph</button>
        <button class="btn btn-ghost" onclick="rebuildTimeline()">📅 Rebuild Timeline</button>
        <button class="btn btn-ghost" onclick="openMemoryBrain()">🧠 Open Brain Files</button>
        <button class="btn btn-ghost" onclick="openJournal()">📓 Open Journal</button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div id="verifyDetailModal" style="display:none"></div>
  `;

  // Auto-run verification on load
  await runVerification();
}

async function runVerification() {
  const btn = document.getElementById('runVerifyBtn');
  const btnText = document.getElementById('verifyBtnText');
  const btnSpinner = document.getElementById('verifyBtnSpinner');
  
  btn.disabled = true;
  btnText.textContent = 'Running...';
  btnSpinner.style.display = 'inline-block';

  try {
    const data = await api.verifyMemory();
    memoryVerifyState.checks = data.checks || [];
    memoryVerifyState.overallStatus = data.overall_status || 'unknown';
    memoryVerifyState.summary = data.summary || { passed: 0, warnings: 0, failed: 0, total: 0 };
    memoryVerifyState.lastRun = data.timestamp;
    
    renderOverallStatus();
    renderChecks();
  } catch (err) {
    showToast('Verification failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🔄 Run Verification';
    btnSpinner.style.display = 'none';
  }
}

function renderOverallStatus() {
  const container = document.getElementById('overallStatusCard');
  const summary = memoryVerifyState.summary;
  const status = memoryVerifyState.overallStatus;
  
  const statusColors = {
    healthy: { bg: '--green-dim', border: '--green', text: '--green', icon: '✅' },
    degraded: { bg: '--yellow-dim', border: '--yellow', text: '--yellow', icon: '⚠️' },
    critical: { bg: '--red-dim', border: '--red', text: '--red', icon: '❌' },
    unknown: { bg: '--blue-dim', border: '--blue', text: '--blue', icon: '❓' },
  };
  
  const colors = statusColors[status] || statusColors.unknown;
  
  const lastRun = memoryVerifyState.lastRun 
    ? new Date(memoryVerifyState.lastRun).toLocaleString() 
    : 'Never';
  
  container.innerHTML = `
    <div style="padding:16px;border:1px solid var(${colors.border});border-radius:var(--radius);background:var(${colors.bg})">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <span style="font-size:28px">${colors.icon}</span>
        <div>
          <div style="font-weight:700;font-size:18px;color:var(${colors.text})">
            ${status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
          <div style="font-size:12px;color:var(--text-muted)">Last checked: ${lastRun}</div>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:80px;padding:8px;background:var(--bg-primary);border-radius:var(--radius);text-align:center">
          <div style="font-weight:700;font-size:20px;color:var(--green)">${summary.passed}</div>
          <div style="font-size:11px;color:var(--text-muted)">Passed</div>
        </div>
        <div style="flex:1;min-width:80px;padding:8px;background:var(--bg-primary);border-radius:var(--radius);text-align:center">
          <div style="font-weight:700;font-size:20px;color:var(--yellow)">${summary.warnings}</div>
          <div style="font-size:11px;color:var(--text-muted)">Warnings</div>
        </div>
        <div style="flex:1;min-width:80px;padding:8px;background:var(--bg-primary);border-radius:var(--radius);text-align:center">
          <div style="font-weight:700;font-size:20px;color:var(--red)">${summary.failed}</div>
          <div style="font-size:11px;color:var(--text-muted)">Failed</div>
        </div>
        <div style="flex:1;min-width:80px;padding:8px;background:var(--bg-primary);border-radius:var(--radius);text-align:center">
          <div style="font-weight:700;font-size:20px;color:var(--text-secondary)">${summary.total}</div>
          <div style="font-size:11px;color:var(--text-muted)">Total Checks</div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('lastRunLabel').textContent = 'Last run: ' + lastRun;
}

function renderChecks() {
  const container = document.getElementById('checksContainer');
  if (!container) return;
  
  if (memoryVerifyState.checks.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="empty-state-title">No checks run yet</div><div class="empty-state-desc">Click "Run Verification" to start</div></div>';
    return;
  }
  
  const statusIcons = {
    pass: { icon: '✅', color: 'var(--green)', bg: 'var(--green-dim)' },
    warning: { icon: '⚠️', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
    fail: { icon: '❌', color: 'var(--red)', bg: 'var(--red-dim)' },
  };
  
  container.innerHTML = memoryVerifyState.checks.map(check => {
    const s = statusIcons[check.status] || statusIcons.fail;
    return `
      <div class="card" style="margin-bottom:12px;transition:var(--transition);border-left:3px solid ${s.color}"
           onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
        <div style="padding:16px;display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:20px;flex-shrink:0">${s.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:600;font-size:14px">${escapeHtml(check.check)}</span>
              <span class="badge" style="background:${s.bg};color:${s.color};font-size:10px">${check.status.toUpperCase()}</span>
              <span style="font-size:11px;color:var(--text-muted)">${new Date(check.timestamp).toLocaleString()}</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${escapeHtml(check.message)}</div>
            ${check.details ? `<button class="btn btn-ghost btn-sm" onclick="showCheckDetail('${check.check}')" style="font-size:11px">Details</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showCheckDetail(checkName) {
  const check = memoryVerifyState.checks.find(c => c.check === checkName);
  if (!check) return;
  
  const modal = document.getElementById('verifyDetailModal');
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeVerifyModal()">
      <div class="modal" style="max-width:700px;max-height:80vh;overflow-y:auto">
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <span class="modal-title">${escapeHtml(check.check)}</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${new Date(check.timestamp).toLocaleString()}</div>
          </div>
          <button class="modal-close" onclick="closeVerifyModal()">✕</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              ${['pass','warning','fail'].map(s => `<span class="badge" style="background:${s==='pass'?'var(--green-dim)':s==='warning'?'var(--yellow-dim)':'var(--red-dim)'};color:${s==='pass'?'var(--green)':s==='warning'?'var(--yellow)':'var(--red)'};font-size:10px">${s.toUpperCase()}</span>`).join('')}
            </div>
            <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(check.message)}</div>
          </div>
          ${check.details ? `
            <div>
              <strong style="font-size:12px;color:var(--text-muted)">Details</strong>
              <pre style="margin-top:8px;font-size:11px;background:var(--bg-secondary);padding:12px;border-radius:var(--radius);overflow:auto;max-height:300px">${escapeHtml(JSON.stringify(check.details, null, 2))}</pre>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:16px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost" onclick="closeVerifyModal()">Close</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" onclick="closeVerifyModal()" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999"></div>
  `;
}

function closeVerifyModal() {
  const modal = document.getElementById('verifyDetailModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

async function runInitialization() {
  const btn = document.getElementById('initBtn');
  const btnText = document.getElementById('initBtnText');
  const btnSpinner = document.getElementById('initBtnSpinner');
  
  if (!confirm('Initialize memory system? This will create missing files and directories.')) return;
  
  btn.disabled = true;
  btnText.textContent = 'Initializing...';
  btnSpinner.style.display = 'inline-block';

  try {
    const result = await api.initializeMemory({ force_reindex: false, create_missing: true });
    showToast('Memory initialized: ' + result.actions.join(', '), 'success');
    await runVerification();
  } catch (err) {
    showToast('Initialization failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🚀 Initialize';
    btnSpinner.style.display = 'none';
  }
}

async function runRepair() {
  const btn = document.getElementById('repairBtn');
  const btnText = document.getElementById('repairBtnText');
  const btnSpinner = document.getElementById('repairBtnSpinner');
  
  if (!confirm('Run memory repair? This will fix common issues.')) return;
  
  btn.disabled = true;
  btnText.textContent = 'Repairing...';
  btnSpinner.style.display = 'inline-block';

  try {
    const result = await api.repairMemory();
    showToast('Memory repair completed: ' + result.actions.join(', '), 'success');
    await runVerification();
  } catch (err) {
    showToast('Repair failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '🔧 Repair';
    btnSpinner.style.display = 'none';
  }
}

async function reindexVectorDB() {
  if (!confirm('Re-index entire vector database? This may take a moment.')) return;
  showToast('Re-indexing vector DB...', 'info');
  try {
    const result = await api.reindexMemory();
    showToast(`Vector DB re-indexed: ${result.indexed || 0} items`, 'success');
    await runVerification();
  } catch (err) {
    showToast('Re-index failed: ' + err.message, 'error');
  }
}

async function rebuildKnowledgeGraph() {
  if (!confirm('Rebuild knowledge graph?')) return;
  showToast('Rebuilding knowledge graph...', 'info');
  try {
    const result = await api.reindexKnowledgeGraph();
    showToast(`Knowledge graph rebuilt: ${result.indexed || 0} items`, 'success');
    await runVerification();
  } catch (err) {
    showToast('Rebuild failed: ' + err.message, 'error');
  }
}

async function rebuildTimeline() {
  if (!confirm('Rebuild unified timeline?')) return;
  showToast('Rebuilding timeline...', 'info');
  try {
    const result = await api.rebuildTimeline();
    showToast(`Timeline rebuilt: ${result.total || 0} events`, 'success');
    await runVerification();
  } catch (err) {
    showToast('Rebuild failed: ' + err.message, 'error');
  }
}

function openMemoryBrain() {
  navigate('memory');
}

function openJournal() {
  navigate('journal');
}

window.renderMemoryVerification = renderMemoryVerification;
window.runVerification = runVerification;
window.runInitialization = runInitialization;
window.runRepair = runRepair;
window.reindexVectorDB = reindexVectorDB;
window.rebuildKnowledgeGraph = rebuildKnowledgeGraph;
window.rebuildTimeline = rebuildTimeline;
window.openMemoryBrain = openMemoryBrain;
window.openJournal = openJournal;
window.showCheckDetail = showCheckDetail;
window.closeVerifyModal = closeVerifyModal;