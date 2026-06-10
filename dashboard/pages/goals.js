// Goals & OKR Tracking — Enhanced goals with Key Results, Revenue tracking, Weekly reviews
let goalsState = {
  goals: [],
  activeTab: 'goals', // 'goals', 'okrs', 'revenue', 'reviews'
  filters: { status: 'all', category: 'all', timeframe: 'quarter' },
};

const GOAL_CATEGORIES = [
  'general', 'development', 'study', 'devops', 'personal', 
  'revenue', 'marketing', 'product', 'health', 'finance'
];

const OKR_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Monthly', 'Weekly'];

async function renderGoals() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-title">Goals & OKRs</div>
        <div class="page-subtitle">Track goals, key results, revenue targets, and weekly reviews</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="showCreateGoalModal()">+ New Goal</button>
        <button class="btn btn-ghost" onclick="showCreateOKRModal()">+ New OKR</button>
        <button class="btn btn-ghost" onclick="renderGoals()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:0;overflow-x:auto">
        <div class="goals-tabs" style="display:flex;border-bottom:1px solid var(--border)">
          <button class="goals-tab active" data-tab="goals" onclick="switchGoalsTab('goals')">🎯 Goals</button>
          <button class="goals-tab" data-tab="okrs" onclick="switchGoalsTab('okrs')">📊 OKRs</button>
          <button class="goals-tab" data-tab="revenue" onclick="switchGoalsTab('revenue')">💰 Revenue</button>
          <button class="goals-tab" data-tab="reviews" onclick="switchGoalsTab('reviews')">📝 Reviews</button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px;display:none" id="goalsFilters">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <select id="filterStatus" class="form-select" onchange="filterGoals()" style="width:auto">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
          <select id="filterCategory" class="form-select" onchange="filterGoals()" style="width:auto">
            <option value="all">All Categories</option>
            ${GOAL_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <select id="filterTimeframe" class="form-select" onchange="filterGoals()" style="width:auto">
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <div style="flex:1"></div>
          <div class="metric-tile" style="min-width:150px">
            <div class="metric-tile-value" id="kpiTotalGoals">0</div>
            <div class="metric-tile-label">Total Goals</div>
          </div>
          <div class="metric-tile" style="min-width:150px">
            <div class="metric-tile-value" id="kpiCompleted">0</div>
            <div class="metric-tile-label">Completed</div>
          </div>
          <div class="metric-tile" style="min-width:150px">
            <div class="metric-tile-value" id="kpiAvgProgress">0%</div>
            <div class="metric-tile-label">Avg Progress</div>
          </div>
          <div class="metric-tile" style="min-width:150px">
            <div class="metric-tile-value" id="kpiRevenue">$0</div>
            <div class="metric-tile-label">Revenue Target</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Goals Tab -->
    <div id="tab-goals" class="goals-tab-content" style="display:block">
      <div class="grid grid-3" id="goalList"></div>
    </div>

    <!-- OKRs Tab -->
    <div id="tab-okrs" class="goals-tab-content" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Objectives & Key Results</h3>
          <button class="btn btn-primary" onclick="showCreateOKRModal()">+ New OKR</button>
        </div>
        <div class="card-body">
          <div style="margin-bottom:16px">
            <select id="okrPeriodFilter" class="form-select" onchange="filterOKRs()" style="width:auto">
              <option value="all">All Periods</option>
              <option value="Q1">Q1</option>
              < option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div id="okrList"></div>
        </div>
      </div>
    </div>

    <!-- Revenue Tab -->
    <div id="tab-revenue" class="goals-tab-content" style="display:none">
      <div class="grid grid-4" style="margin-bottom:16px" id="revenueKPIs"></div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Revenue Goals</h3>
          <button class="btn btn-primary" onclick="showCreateRevenueGoalModal()">+ Add Revenue Goal</button>
        </div>
        <div class="card-body">
          <div class="grid grid-2" id="revenueGoalsList"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Revenue Projection</h3></div>
        <div class="card-body">
          <div class="chart-container" style="height:250px"><canvas id="revenueChart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- Reviews Tab -->
    <div id="tab-reviews" class="goals-tab-content" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Weekly Reviews</h3>
          <button class="btn btn-primary" onclick="showCreateReviewModal()">+ New Review</button>
        </div>
        <div class="card-body">
          <div style="margin-bottom:16px">
            <select id="reviewPeriodFilter" class="form-select" onchange="filterReviews()" style="width:auto">
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          <div id="reviewList"></div>
        </div>
      </div>
    </div>
  `;

  try {
    await loadGoalsData();
    await loadOKRData();
    await loadRevenueData();
    await loadReviewsData();
  } catch (err) {
    showToast('Failed to load goals data: ' + err.message, 'error');
  }
}

function switchGoalsTab(tab) {
  document.querySelectorAll('.goals-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.goals-tab-content').forEach(c => c.style.display = 'none');
  document.querySelector(`.goals-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  goalsState.activeTab = tab;
  
  if (tab === 'okrs') filterOKRs();
  else if (tab === 'revenue') { renderRevenueKPIs(); renderRevenueGoals(); renderRevenueChart(); }
  else if (tab === 'reviews') filterReviews();
}

async function loadGoalsData() {
  try {
    const data = await api.getGoals();
    goalsState.goals = data.goals || [];
    renderGoalsList();
    updateGoalsKPIs();
  } catch (err) {
    console.warn('Goals API not available, using localStorage fallback');
    loadGoalsFromStorage();
  }
}

function loadGoalsFromStorage() {
  try {
    const stored = localStorage.getItem('goals_data');
    if (stored) {
      goalsState.goals = JSON.parse(stored);
      renderGoalsList();
      updateGoalsKPIs();
    }
  } catch (e) {}
}

function saveGoalsToStorage() {
  try {
    localStorage.setItem('goals_data', JSON.stringify(goalsState.goals));
  } catch (e) {}
}

function renderGoalsList() {
  const list = document.getElementById('goalList');
  if (!list) return;
  
  let filtered = goalsState.goals.filter(g => {
    if (goalsState.filters.status !== 'all' && g.status !== goalsState.filters.status) return false;
    if (goalsState.filters.category !== 'all' && g.category !== goalsState.filters.category) return false;
    return true;
  });
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No goals found</div><div class="empty-state-desc">Create your first goal or adjust filters</div></div>`;
    return;
  }
  
  list.innerHTML = filtered.map(g => `
    <div class="goal-card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="badge badge-${g.status === 'completed' ? 'success' : g.status === 'active' ? 'info' : 'warning'}">${g.status}</span>
        <span class="badge badge-accent">${g.category}</span>
        ${g.target_date ? `<span class="text-muted text-xs">🎯 ${g.target_date}</span>` : ''}
      </div>
      <div class="goal-card-title">${escapeHtml(g.title)}</div>
      ${g.description ? `<div class="text-muted text-sm" style="margin-bottom:8px">${escapeHtml(g.description)}</div>` : ''}
      <div class="goal-card-progress">
        <div class="goal-card-progress-bar"><div class="goal-card-progress-fill" style="width:${g.progress || 0}%"></div></div>
        <div class="goal-card-progress-text">${g.progress || 0}%</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
        <button class="btn btn-sm ${g.status !== 'completed' ? 'btn-primary' : 'btn-ghost'}" onclick="updateGoalProgress('${g.id}', ${Math.min((g.progress || 0) + 25, 100)})">
          ${g.status !== 'completed' ? '+25%' : '✅ Done'}
        </button>
        ${g.status !== 'completed' ? `<button class="btn btn-sm btn-ghost" onclick="completeGoal('${g.id}')">Mark Complete</button>` : ''}
        <button class="btn btn-sm btn-ghost" onclick="editGoal('${g.id}')" style="margin-left:auto;">✏️ Edit</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteGoal('${g.id}')" style="margin-left:8px;color:var(--red)">🗑</button>
      </div>
    </div>
  `).join('');
  
  updateGoalsKPIs();
}

function updateGoalsKPIs() {
  const total = goalsState.goals.length;
  const active = goalsState.goals.filter(g => g.status === 'active').length;
  const completed = goalsState.goals.filter(g => g.status === 'completed').length;
  const avgProg = total > 0 ? Math.round(goalsState.goals.reduce((s, g) => s + (g.progress || 0), 0) / total) : 0;
  const totalRevenue = goalsState.goals
    .filter(g => g.category === 'revenue')
    .reduce((s, g) => s + (g.target_value || 0), 0);
  
  const els = {
    total: document.getElementById('goalTotalCount'),
    active: document.getElementById('goalActiveCount'),
    complete: document.getElementById('goalCompleteCount'),
    avg: document.getElementById('goalAvgProgress'),
    kpiTotal: document.getElementById('kpiTotalGoals'),
    kpiCompleted: document.getElementById('kpiCompleted'),
    kpiAvg: document.getElementById('kpiAvgProgress'),
    kpiRevenue: document.getElementById('kpiRevenue'),
  };
  
  if (els.total) els.total.textContent = total;
  if (els.active) els.active.textContent = active;
  if (els.complete) els.complete.textContent = completed;
  if (els.avg) els.avg.textContent = avgProg + '%';
  if (els.kpiTotal) els.kpiTotal.textContent = total;
  if (els.kpiCompleted) els.kpiCompleted.textContent = completed;
  if (els.kpiAvg) els.kpiAvg.textContent = avgProg + '%';
  if (els.kpiRevenue) els.kpiRevenue.textContent = '$' + totalRevenue.toLocaleString();
}

function filterGoals() {
  goalsState.filters.status = document.getElementById('filterStatus').value;
  goalsState.filters.category = document.getElementById('filterCategory').value;
  goalsState.filters.timeframe = document.getElementById('filterTimeframe').value;
  renderGoalsList();
}

// OKR Management
async function loadOKRData() {
  try {
    const stored = localStorage.getItem('okr_data');
    if (stored) {
      goalsState.okrs = JSON.parse(stored);
    } else {
      goalsState.okrs = [];
    }
    filterOKRs();
  } catch (e) {
    goalsState.okrs = [];
  }
}

function filterOKRs() {
  const period = document.getElementById('okrPeriodFilter')?.value || 'all';
  let filtered = goalsState.okrs || [];
  if (period !== 'all') {
    filtered = filtered.filter(o => o.period === period);
  }
  
  const container = document.getElementById('okrList');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="empty-state-icon">📊</div><div class="empty-state-title">No OKRs yet</div><div class="empty-state-desc">Create your first OKR to start tracking objectives</div></div>';
    return;
  }
  
  container.innerHTML = filtered.map(okr => `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="badge badge-${okr.period === 'Q1' ? 'info' : okr.period === 'Q2' ? 'warning' : okr.period === 'Q3' ? 'success' : 'purple'}">${okr.period}</span>
            <span class="text-sm text-muted">${okr.owner || 'Unassigned'}</span>
          </div>
          <h4 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px">${escapeHtml(okr.objective)}</h4>
        </div>
        <button class="btn btn-primary btn-sm" onclick="editOKR('${okr.id}')">Edit</button>
      </div>
      <div style="margin-top:12px">
        ${okr.keyResults.map((kr, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-weight:600;font-size:13px">KR${i+1}: ${escapeHtml(kr.title)}</span>
                <span class="badge badge-${kr.target_type === 'percentage' ? 'info' : 'warning'}">${kr.target_type}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-secondary)">
                <span>Target: ${kr.target} ${kr.unit || ''}</span>
                <span>Current: ${kr.current || 0} ${kr.unit || ''}</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin:0 12px">
                  <div style="width:${Math.min(100, (kr.current || 0) / (kr.target || 1) * 100)}%;height:100%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>
                </div>
                <span style="font-weight:600;color:${(kr.current || 0) >= kr.target ? 'var(--green)' : 'var(--accent)'}">${Math.round((kr.current || 0) / (kr.target || 1) * 100)}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function showCreateOKRModal() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <span class="modal-title">Create New OKR</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          <div class="form-group">
            <label class="form-label">Objective *</label>
            <input class="form-input" id="okrObjective" placeholder="e.g., Become the leading AI agent platform in the market">
          </div>
          <div class="form-row" style="display:flex;gap:16px;margin-top:12px">
            <div class="form-group" style="flex:1">
              <label class="form-label">Period</label>
              <select class="form-select" id="okrPeriod">
                <option value="Q1">Q1</option>
                <option value="Q2" selected>Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Owner</label>
              <input class="form-input" id="okrOwner" placeholder="Team or person name">
            </div>
          </div>
          <div style="margin-top:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius)">
            <div style="font-weight:600;margin-bottom:8px">Key Results (add at least 2)</div>
            <div id="krContainer"></div>
            <button class="btn btn-ghost btn-sm" onclick="addKR()" style="margin-top:8px">+ Add Key Result</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveOKR()">Save OKR</button>
        </div>
      </div>
    </div>
  `;
  
  addKR();
}

function addKR() {
  const container = document.getElementById('krContainer');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius)';
  div.innerHTML = `
    <input type="text" class="form-input" placeholder="Key Result title (e.g., Achieve $1M ARR)" style="flex:1" id="krTitle_${idx}">
    <select class="form-select" style="width:auto" id="krType_${idx}">
      <option value="percentage">Percentage (0-100%)</option>
      <option value="currency">Revenue ($)</option>
      <option value="count">Count/Number</option>
      <option value="metric">Custom Metric</option>
    </select>
    <input type="number" class="form-input" placeholder="Target" style="width:100px" id="krTarget_${idx}">
    <select class="form-select" style="width:auto" id="krUnit_${idx}">
      <option value="">Unit</option>
      <option value="%">%</option>
      <option value="$">$</option>
      <option value="users">users</option>
      <option value="sessions">sessions</option>
      <option value="leads">leads</option>
    </select>
    <button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
}

function saveOKR() {
  const objective = document.getElementById('okrObjective').value.trim();
  const period = document.getElementById('okrPeriod').value;
  const owner = document.getElementById('okrOwner').value.trim();
  
  if (!objective) { showToast('Objective is required', 'error'); return; }
  
  const krs = [];
  document.querySelectorAll('#krContainer > div').forEach(div => {
    const idx = div.id?.split('_')[1] || Date.now();
    const title = div.querySelector('[id^="krTitle_"]').value.trim();
    const type = div.querySelector('[id^="krType_"]').value;
    const target = parseFloat(div.querySelector('[id^="krTarget_"]').value) || 0;
    const unit = div.querySelector('[id^="krUnit_"]').value;
    if (title) krs.push({ id: 'kr_' + idx, title, type, target, unit, current: 0, progress: 0 });
  });
  
  if (krs.length < 2) { showToast('Add at least 2 Key Results', 'error'); return; }
  
  const okr = {
    id: 'okr_' + Date.now(),
    objective,
    period,
    owner,
    keyResults: krs,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  
  if (!goalsState.okrs) goalsState.okrs = [];
  goalsState.okrs.push(okr);
  saveOKRData();
  closeModal();
  filterOKRs();
  showToast('OKR created!', 'success');
}

function saveOKRData() {
  try {
    localStorage.setItem('okr_data', JSON.stringify(goalsState.okrs));
  } catch (e) {}
}

function editOKR(id) {
  // Implementation for editing OKR
  showToast('Edit OKR - coming soon', 'info');
}

function deleteOKR(id) {
  if (!confirm('Delete this OKR?')) return;
  goalsState.okrs = goalsState.okrs.filter(o => o.id !== id);
  saveOKRData();
  filterOKRs();
  showToast('OKR deleted', 'success');
}

// Revenue Management
async function loadRevenueData() {
  try {
    const stored = localStorage.getItem('revenue_goals');
    if (stored) {
      goalsState.revenueGoals = JSON.parse(stored);
    } else {
      goalsState.revenueGoals = [];
    }
    renderRevenueKPIs();
    renderRevenueGoals();
    renderRevenueChart();
  } catch (e) {
    goalsState.revenueGoals = [];
  }
}

function renderRevenueKPIs() {
  const container = document.getElementById('revenueKPIs');
  if (!container) return;
  
  const goals = goalsState.revenueGoals || [];
  const currentRevenue = goals.reduce((s, g) => s + (g.current_value || 0), 0);
  const targetRevenue = goals.reduce((s, g) => s + (g.target_value || 0), 0);
  const projectedRevenue = targetRevenue * 1.2; // Simple projection
  const avgGrowth = goals.length > 0 ? goals.reduce((s, g) => s + (g.growth_rate || 0), 0) / goals.length : 0;
  
  container.innerHTML = `
    <div class="metric-tile"><div class="metric-tile-value">$${currentRevenue.toLocaleString()}</div><div class="metric-tile-label">Current Revenue</div></div>
    <div class="metric-tile"><div class="metric-tile-value">$${targetRevenue.toLocaleString()}</div><div class="metric-tile-label">Target Revenue</div></div>
    <div class="metric-tile"><div class="metric-tile-value">${targetRevenue > 0 ? Math.round((currentRevenue / targetRevenue) * 100) : 0}%</div><div class="metric-tile-label">Achievement</div></div>
    <div class="metric-tile"><div class="metric-tile-value">${projectedRevenue > 0 ? '$' + Math.round(projectedRevenue / 1000) + 'K' : '$0'}</div><div class="metric-tile-label">Projected (120%)</div></div>
  `;
}

function renderRevenueGoals() {
  const container = document.getElementById('revenueGoalsList');
  if (!container) return;
  
  const goals = goalsState.revenueGoals || [];
  if (goals.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px;text-align:center"><div class="empty-state-icon">💰</div><div class="empty-state-title">No revenue goals</div><div class="empty-state-desc">Create your first revenue goal</div></div>';
    return;
  }
  
  container.innerHTML = goals.map(g => `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-weight:600">${escapeHtml(g.name)}</div>
          <div class="text-sm text-muted">${g.category || 'General'} · ${g.period || 'Monthly'}</div>
        </div>
        <span class="badge badge-${g.current_value >= g.target_value ? 'success' : 'info'}">$${g.current_value?.toLocaleString() || 0} / $${g.target_value?.toLocaleString() || 0}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="width:${Math.min(100, (g.current_value || 0) / (g.target_value || 1) * 100)}%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.3s"></div>
        </div>
        <span style="font-weight:600;font-size:12px">${Math.round((g.current_value || 0) / (g.target_value || 1) * 100)}%</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-sm btn-primary" onclick="updateRevenueProgress('${g.id}')">Update</button>
        <button class="btn btn-sm btn-ghost" onclick="editRevenueGoal('${g.id}')">Edit</button>
        <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="deleteRevenueGoal('${g.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderRevenueChart() {
  const ctx = document.getElementById('revenueChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart
  if (window.revenueChart) window.revenueChart.destroy();
  
  // Generate sample data for chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const current = months.map((_, i) => Math.random() * 50000 + 10000 * (i + 1));
  const target = months.map((_, i) => 200000 + i * 15000);
  
  window.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Actual Revenue',
          data: current,
          borderColor: 'var(--green)',
          backgroundColor: 'rgba(0, 224, 158, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: 'Target Revenue',
          data: target,
          borderColor: 'var(--accent)',
          backgroundColor: 'rgba(124, 109, 255, 0.1)',
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: 'var(--text-secondary)' } },
        tooltip: { backgroundColor: 'var(--bg-card)', titleColor: 'var(--text-primary)', bodyColor: 'var(--text-secondary)' }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-muted)' } },
        y: { 
          grid: { color: 'rgba(255,255,255,0.05)' }, 
          ticks: { 
            color: 'var(--text-muted)',
            callback: value => '$' + (value / 1000).toFixed(0) + 'K'
          }
        }
      }
    }
  });
}

function showCreateRevenueGoalModal() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <span class="modal-title">Create Revenue Goal</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Goal Name *</label>
            <input class="form-input" id="revName" placeholder="e.g., Q2 Subscription Revenue">
          </div>
          <div class="form-row" style="display:flex;gap:16px;margin-top:12px">
            <div class="form-group" style="flex:1">
              <label class="form-label">Category</label>
              <select class="form-select" id="revCategory">
                <option value="subscription">Subscription</option>
                <option value="one-time">One-time</option>
                <option value="enterprise">Enterprise</option>
                <option value="marketplace">Marketplace</option>
                <option value="services">Services</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Period</label>
              <select class="form-select" id="revPeriod">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div class="form-row" style="display:flex;gap:16px;margin-top:12px">
            <div class="form-group" style="flex:1">
              <label class="form-label">Target Revenue ($)</label>
              <input type="number" class="form-input" id="revTarget" placeholder="100000">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Current Revenue ($)</label>
              <input type="number" class="form-input" id="revCurrent" value="0">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Growth Rate (%/month)</label>
            <input type="number" class="form-input" id="revGrowth" placeholder="15" step="0.1">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveRevenueGoal()">Create Goal</button>
        </div>
      </div>
    </div>
  `;
}

function saveRevenueGoal() {
  const name = document.getElementById('revName').value.trim();
  const category = document.getElementById('revCategory').value;
  const period = document.getElementById('revPeriod').value;
  const target = parseFloat(document.getElementById('revTarget').value) || 0;
  const current = parseFloat(document.getElementById('revCurrent').value) || 0;
  const growth = parseFloat(document.getElementById('revGrowth').value) || 0;
  
  if (!name || !target) { showToast('Name and target are required', 'error'); return; }
  
  const goal = {
    id: 'rev_' + Date.now(),
    name,
    category,
    period,
    target_value: target,
    current_value: current,
    growth_rate: growth,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  
  if (!goalsState.revenueGoals) goalsState.revenueGoals = [];
  goalsState.revenueGoals.push(goal);
  saveRevenueData();
  closeModal();
  renderRevenueGoals();
  renderRevenueKPIs();
  renderRevenueChart();
  showToast('Revenue goal created!', 'success');
}

function saveRevenueData() {
  try {
    localStorage.setItem('revenue_goals', JSON.stringify(goalsState.revenueGoals));
  } catch (e) {}
}

function editRevenueGoal(id) {
  showToast('Edit revenue goal - coming soon', 'info');
}

function deleteRevenueGoal(id) {
  if (!confirm('Delete this revenue goal?')) return;
  goalsState.revenueGoals = goalsState.revenueGoals.filter(g => g.id !== id);
  saveRevenueData();
  renderRevenueGoals();
  renderRevenueKPIs();
  renderRevenueChart();
  showToast('Revenue goal deleted', 'success');
}

function updateRevenueProgress(id) {
  showToast('Update progress - coming soon', 'info');
}

// Reviews Management
async function loadReviewsData() {
  try {
    const stored = localStorage.getItem('weekly_reviews');
    if (stored) {
      goalsState.reviews = JSON.parse(stored);
    } else {
      goalsState.reviews = [];
    }
    filterReviews();
  } catch (e) {
    goalsState.reviews = [];
  }
}

function filterReviews() {
  const period = document.getElementById('reviewPeriodFilter')?.value || 'all';
  let filtered = goalsState.reviews || [];
  if (period !== 'all') {
    const now = new Date();
    const cutoff = new Date();
    switch (period) {
      case 'week': cutoff.setDate(now.getDate() - 7); break;
      case 'month': cutoff.setMonth(now.getMonth() - 1); break;
      case 'quarter': cutoff.setMonth(now.getMonth() - 3); break;
    }
    filtered = filtered.filter(r => new Date(r.date) >= cutoff);
  }
  
  const container = document.getElementById('reviewList');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="empty-state-icon">📝</div><div class="empty-state-title">No reviews yet</div><div class="empty-state-desc">Start your weekly review practice</div></div>';
    return;
  }
  
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  container.innerHTML = filtered.map(r => `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="badge badge-info">${r.type || 'Weekly'}</span>
            <span class="text-sm text-muted">${new Date(r.date).toLocaleDateString()}</span>
          </div>
          <h4 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px">${escapeHtml(r.title || 'Weekly Review')}</h4>
        </div>
        <button class="btn btn-primary btn-sm" onclick="viewReview('${r.id}')">View</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px">
        ${r.accomplishments ? `<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius)"><div style="font-weight:600;margin-bottom:4px">✅ Accomplishments</div><div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(r.accomplishments)}</div></div>` : ''}
        ${r.challenges ? `<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius)"><div style="font-weight:600;margin-bottom:4px">🔴 Challenges</div><div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(r.challenges)}</div></div>` : ''}
        ${r.learnings ? `<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius)"><div style="font-weight:600;margin-bottom:4px">💡 Learnings</div><div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(r.learnings)}</div></div>` : ''}
        ${r.nextWeek ? `<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius)"><div style="font-weight:600;margin-bottom:4px">🎯 Next Week Focus</div><div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(r.nextWeek)}</div></div>` : ''}
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm btn-ghost" onclick="editReview('${r.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="deleteReview('${r.id}')">🗑 Delete</button>
      </div>
    </div>
  `).join('');
}

function showCreateReviewModal() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:700px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="modal-title">Create Weekly Review</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="revTitle" placeholder="Weekly Review - Week of ${new Date().toLocaleDateString()}">
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-input" id="revDate" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-select" id="revType">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="retrospective">Retrospective</option>
            </select>
          </div>
          
          <div class="form-group" style="margin-top:16px">
            <label class="form-label">✅ Accomplishments</label>
            <textarea class="form-input" id="revAccomplishments" rows="4" placeholder="What did you achieve this period?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">🔴 Challenges</label>
            <textarea class="form-input" id="revChallenges" rows="3" placeholder="What blocked you or went wrong?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">💡 Learnings</label>
            <textarea class="form-input" id="revLearnings" rows="3" placeholder="What did you learn?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">🎯 Next Period Focus</label>
            <textarea class="form-input" id="revNextFocus" rows="3" placeholder="What will you focus on next?"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveReview()">Save Review</button>
        </div>
      </div>
    </div>
  `;
}

function saveReview() {
  const title = document.getElementById('revTitle').value.trim() || `Review ${new Date().toLocaleDateString()}`;
  const date = document.getElementById('revDate').value;
  const type = document.getElementById('revType').value;
  
  const review = {
    id: 'rev_' + Date.now(),
    title,
    date,
    type,
    accomplishments: document.getElementById('revAccomplishments').value.trim(),
    challenges: document.getElementById('revChallenges').value.trim(),
    learnings: document.getElementById('revLearnings').value.trim(),
    nextWeek: document.getElementById('revNextFocus').value.trim(),
    created: new Date().toISOString(),
  };
  
  if (!goalsState.reviews) goalsState.reviews = [];
  goalsState.reviews.push(review);
  saveReviewsData();
  closeModal();
  filterReviews();
  showToast('Review saved!', 'success');
}

function saveReviewsData() {
  try {
    localStorage.setItem('weekly_reviews', JSON.stringify(goalsState.reviews));
  } catch (e) {}
}

function viewReview(id) {
  const review = goalsState.reviews.find(r => r.id === id);
  if (!review) return;
  
  showModal('Review Details', `
    <div style="line-height:1.6;font-size:13px">
      <div><strong>Date:</strong> ${new Date(review.date).toLocaleDateString()}</div>
      <div><strong>Type:</strong> ${review.type}</div>
      <hr style="margin:12px 0">
      <div><strong>✅ Accomplishments</strong><br>${escapeHtml(review.accomplishments || '—')}</div>
      <div style="margin-top:12px"><strong>🔴 Challenges</strong><br>${escapeHtml(review.challenges || '—')}</div>
      <div style="margin-top:12px"><strong>💡 Learnings</strong><br>${escapeHtml(review.learnings || '—')}</div>
      <div style="margin-top:12px"><strong>🎯 Next Focus</strong><br>${escapeHtml(review.nextWeek || '—')}</div>
    </div>
  `, `<button class="btn btn-primary" onclick="closeModal()">Close</button>`);
}

function editReview(id) {
  showToast('Edit review - coming soon', 'info');
}

function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  goalsState.reviews = goalsState.reviews.filter(r => r.id !== id);
  saveReviewsData();
  filterReviews();
  showToast('Review deleted', 'success');
}

function saveReviewsData() {
  try {
    localStorage.setItem('weekly_reviews', JSON.stringify(goalsState.reviews));
  } catch (e) {}
}

function editGoal(id) {
  const goal = goalsState.goals.find(g => g.id === id);
  if (!goal) return;
  
  // Populate modal with existing data
  showCreateGoalModal();
  setTimeout(() => {
    document.getElementById('goalTitle').value = goal.title;
    document.getElementById('goalDesc').value = goal.description || '';
    document.getElementById('goalCategory').value = goal.category || 'general';
    document.getElementById('goalDate').value = goal.target_date || '';
    
    // Change button to update
    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) {
      btn.textContent = 'Update Goal';
      btn.onclick = () => updateGoal(goal.id);
    }
  }, 100);
}

async function updateGoal(id) {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }
  
  try {
    await api.updateGoal(id, {
      title,
      description: document.getElementById('goalDesc').value.trim(),
      category: document.getElementById('goalCategory').value,
      target_date: document.getElementById('goalDate').value,
    });
    showToast('Goal updated!', 'success');
    closeModal();
    renderGoals();
  } catch (err) {
    showToast('Failed to update goal: ' + err.message, 'error');
  }
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  goalsState.goals = goalsState.goals.filter(g => g.id !== id);
  saveGoalsToStorage();
  renderGoals();
  showToast('Goal deleted', 'success');
}

// Global functions for modals
window.switchGoalsTab = switchGoalsTab;
window.showCreateGoalModal = showCreateGoalModal;
window.showCreateOKRModal = showCreateOKRModal;
window.showCreateRevenueGoalModal = showCreateRevenueGoalModal;
window.showCreateReviewModal = showCreateReviewModal;
window.createGoal = createGoal;
window.saveOKR = saveOKR;
window.addKR = addKR;
window.saveRevenueGoal = saveRevenueGoal;
window.saveReview = saveReview;
window.filterGoals = filterGoals;
window.filterOKRs = filterOKRs;
window.filterReviews = filterReviews;
window.renderRevenueChart = renderRevenueChart;
window.updateGoalProgress = updateGoalProgress;
window.completeGoal = completeGoal;
window.editGoal = editGoal;
window.updateGoal = updateGoal;
window.deleteGoal = deleteGoal;
window.editOKR = editOKR;
window.deleteOKR = deleteOKR;
window.editRevenueGoal = editRevenueGoal;
window.deleteRevenueGoal = deleteRevenueGoal;
window.updateRevenueProgress = updateRevenueProgress;
window.viewReview = viewReview;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.editGoal = editGoal;
window.updateGoal = updateGoal;
