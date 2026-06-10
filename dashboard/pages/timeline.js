// Screen Activity & Timeline — Unified chronological browser
let screenState = {
  summary: null,
  timeline: [],
  unifiedTimeline: [],
  viewMode: 'timeline', // 'timeline' | 'screen' | 'summary'
  selectedEvent: null,
  filters: { hours: 168, limit: 200 },
};

async function renderTimeline() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Unified Timeline</h1>
        <p class="page-subtitle">Chronological browser of all events: skills, voice, journal, handoffs, screen activity</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="timelineHours" class="form-select" onchange="loadUnifiedTimeline()" style="width:auto;min-width:120px">
          <option value="24">Last 24 hours</option>
          <option value="72" selected>Last 3 days</option>
          <option value="168">Last 7 days</option>
          <option value="720">Last 30 days</option>
        </select>
        <button class="btn btn-primary" onclick="loadUnifiedTimeline()">🔄 Refresh</button>
        <button class="btn btn-warning" onclick="rebuildTimeline()">🔧 Rebuild</button>
      </div>
    </div>

    <!-- View Tabs -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:8px 16px">
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm ${screenState.viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}" onclick="setViewMode('timeline')">📅 Unified Timeline</button>
          <button class="btn btn-sm ${screenState.viewMode === 'screen' ? 'btn-primary' : 'btn-ghost'}" onclick="setViewMode('screen')">🖥️ Screen Activity</button>
          <button class="btn btn-sm ${screenState.viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}" onclick="setViewMode('summary')">📊 Screen Summary</button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px;display:none" id="screenFilters">
      <div class="card-body" style="padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <strong style="font-size:13px">Filters:</strong>
        <select class="form-select" id="screenHours" onchange="loadScreenActivity()" style="width:auto;min-width:120px">
          <option value="6">Last 6 hours</option>
          <option value="24" selected>Last 24 hours</option>
          <option value="72">Last 3 days</option>
          <option value="168">Last 7 days</option>
        </select>
      </div>
    </div>

    <!-- Screen Summary View -->
    <div id="viewSummary" style="display:none">
      <div class="card" style="margin-bottom:16px" id="screenSummaryCard">
        <div class="loading" style="padding:40px"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Screen Activity Timeline View -->
    <div id="viewScreen" style="display:none">
      <div class="card" style="margin-bottom:16px" id="screenTimelineCard">
        <div class="loading" style="padding:40px"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Unified Timeline View -->
    <div id="viewTimeline" style="display:block">
      <div class="card" id="unifiedTimelineCard">
        <div class="loading" style="padding:40px"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div id="timelineEventModal" style="display:none"></div>
  `;

  await Promise.all([loadUnifiedTimeline(), loadScreenActivitySummary()]);
}

function setViewMode(mode) {
  screenState.viewMode = mode;
  document.getElementById('viewTimeline').style.display = mode === 'timeline' ? 'block' : 'none';
  document.getElementById('viewScreen').style.display = mode === 'screen' ? 'block' : 'none';
  document.getElementById('viewSummary').style.display = mode === 'summary' ? 'block' : 'none';
  document.getElementById('screenFilters').style.display = (mode === 'screen' || mode === 'summary') ? 'flex' : 'none';
  
  document.querySelectorAll('.btn-sm').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-ghost');
  });
  const activeBtn = Array.from(document.querySelectorAll('.btn-sm')).find(b => 
    b.onclick && b.onclick.toString().includes(`setViewMode('${mode}')`)
  );
  if (activeBtn) {
    activeBtn.classList.remove('btn-ghost');
    activeBtn.classList.add('btn-primary');
  }
}

async function loadUnifiedTimeline() {
  const hours = parseInt(document.getElementById('timelineHours')?.value || '168');
  const limit = 200;
  screenState.filters.hours = hours;
  screenState.filters.limit = limit;

  const container = document.getElementById('unifiedTimelineCard');
  if (container) container.innerHTML = '<div class="loading" style="padding:40px"><div class="loading-spinner"></div></div>';

  try {
    const data = await api.getUnifiedTimeline(hours, limit);
    screenState.unifiedTimeline = data.events || [];
    renderUnifiedTimeline();
  } catch (err) {
    showToast('Failed to load timeline: ' + err.message, 'error');
    const container = document.getElementById('unifiedTimelineCard');
    if (container) container.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-title">Failed to load</div><div class="empty-state-desc">' + escapeHtml(err.message) + '</div></div>';
  }
}

async function loadScreenActivitySummary() {
  try {
    const data = await api.getScreenActivitySummary(24);
    screenState.summary = data;
    renderScreenSummary();
  } catch (err) {
    console.error('Failed to load screen summary:', err);
  }
}

async function loadScreenActivity() {
  const hours = parseInt(document.getElementById('screenHours')?.value || '24');
  screenState.filters.hours = hours;

  const container = document.getElementById('screenTimelineCard');
  if (container) container.innerHTML = '<div class="loading" style="padding:40px"><div class="loading-spinner"></div></div>';

  try {
    const [summary, timeline] = await Promise.all([
      api.getScreenActivitySummary(hours),
      api.getScreenActivityTimeline(hours, 100)
    ]);
    screenState.summary = summary;
    screenState.timeline = timeline.activities || [];
    renderScreenSummary();
    renderScreenTimeline();
  } catch (err) {
    showToast('Failed to load screen activity: ' + err.message, 'error');
  }
}

function renderScreenSummary() {
  const container = document.getElementById('screenSummaryCard');
  const data = screenState.summary;
  if (!container || !data) return;

  const totalDur = data.total_duration_formatted || '0s';
  const appUsage = data.app_usage || {};
  const focusSessions = data.focus_sessions || [];

  container.innerHTML = `
    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <h3 class="card-title">📊 Screen Activity Summary (${data.period_hours || 24}h)</h3>
      <div style="display:flex;gap:8px">
        <span class="badge badge-success">${totalDur}</span>
        <span class="badge">${data.activity_count || 0} events</span>
        <span class="badge" style="background:var(--purple-dim);color:var(--purple)">${focusSessions.length} focus sessions</span>
      </div>
    </div>
    <div class="card-body" style="padding:16px">
      ${Object.keys(appUsage).length ? `
        <div style="margin-bottom:24px">
          <strong style="font-size:13px;display:block;margin-bottom:12px">App Usage</strong>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
            ${Object.entries(appUsage).map(([app, info]) => `
              <div class="card" style="padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">
                <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(app)}</div>
                <div style="font-size:12px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap">
                  <span>⏱ ${info.duration_formatted}</span>
                  <span>🔢 ${info.count} windows</span>
                </div>
                ${info.titles && info.titles.length ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted);max-height:60px;overflow:auto">${info.titles.map(t => '• ' + escapeHtml(t)).join('<br>')}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No app usage data</div></div>'}
      
      ${focusSessions.length ? `
        <div>
          <strong style="font-size:13px;display:block;margin-bottom:12px">Focus Sessions (>5min continuous)</strong>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${focusSessions.map(s => `
              <div class="card" style="padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);border-left:3px solid var(--green)">
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                  <span style="font-weight:600">${escapeHtml(s.app)}</span>
                  <span style="font-family:var(--font-mono);color:var(--green)">${formatDuration(s.duration)}</span>
                  <span style="font-size:12px;color:var(--text-muted)">${new Date(s.start * 1000).toLocaleString()} — ${new Date(s.end * 1000).toLocaleString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderScreenTimeline() {
  const container = document.getElementById('screenTimelineCard');
  if (!container) return;

  if (screenState.timeline.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px;text-align:center"><div class="empty-state-icon">🖥️</div><div class="empty-state-title">No screen activity recorded</div><div class="empty-state-desc">Screen activity is recorded via external integration</div></div>';
    return;
  }

  // Group by hour
  const byHour = {};
  for (const act of screenState.timeline) {
    const date = new Date(act.timestamp * 1000);
    const hourKey = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
    if (!byHour[hourKey]) byHour[hourKey] = [];
    byHour[hourKey].push(act);
  }

  container.innerHTML = `
    <div class="card-header"><h3 class="card-title">🖥️ Screen Activity Timeline (${screenState.timeline.length} events)</h3></div>
    <div class="card-body" style="padding:0;max-height:600px;overflow-y:auto">
      ${Object.entries(byHour).sort((a,b) => b[0].localeCompare(a[0])).map(([hourKey, events]) => `
        <div style="border-bottom:1px solid var(--border)">
          <div style="padding:10px 16px;background:var(--bg-secondary);font-weight:600;font-size:13px">${formatHourDisplay(hourKey)} (${events.length} events)</div>
          <div>
            ${events.map(act => `
              <div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;transition:var(--transition)" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
                <span style="min-width:80px;font-size:12px;color:var(--text-muted)">${new Date(act.timestamp * 1000).toLocaleTimeString()}</span>
                <span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:10px;min-width:80px">${escapeHtml(act.app)}</span>
                <span style="flex:1;font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(act.title || '—')}</span>
                <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${formatDuration(act.duration)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderUnifiedTimeline() {
  const container = document.getElementById('unifiedTimelineCard');
  if (!container) return;

  if (screenState.unifiedTimeline.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px;text-align:center"><div class="empty-state-icon">📅</div><div class="empty-state-title">No timeline events</div><div class="empty-state-desc">Click Rebuild to generate timeline from all sources</div></div>';
    return;
  }

  // Group by day
  const byDay = {};
  for (const event of screenState.unifiedTimeline) {
    const date = new Date(event.timestamp);
    const dayKey = date.toISOString().substring(0, 10); // YYYY-MM-DD
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(event);
  }

  const typeColors = {
    voice_capture: { icon: '🎙️', color: 'red' },
    journal: { icon: '📓', color: 'green' },
    skill_run: { icon: '⚡', color: 'purple' },
    handoff: { icon: '🤝', color: 'orange' },
    audit: { icon: '📋', color: 'blue' },
    screen: { icon: '🖥️', color: 'cyan' },
  };

  container.innerHTML = `
    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <h3 class="card-title">📅 Unified Timeline (${screenState.unifiedTimeline.length} events)</h3>
      <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        ${Object.entries(typeColors).map(([t, c]) => `<span class="badge" style="background:var(--${c.color}-dim);color:var(--${c.color})">${c.icon} ${t.replace('_', ' ')}</span>`).join('')}
      </div>
    </div>
    <div class="card-body" style="padding:0;max-height:70vh;overflow-y:auto">
      ${Object.entries(byDay).sort((a,b) => b[0].localeCompare(a[0])).map(([dayKey, events]) => `
        <div style="border-bottom:1px solid var(--border)">
          <div style="padding:10px 16px;background:var(--bg-secondary);font-weight:600;font-size:13px;display:flex;align-items:center;gap:12px">
            <span>${formatDayDisplay(dayKey)}</span>
            <span class="badge">${events.length} events</span>
          </div>
          <div>
            ${events.map(e => {
              const tc = typeColors[e.type] || { icon: '📄', color: 'accent' };
              return `
                <div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start;transition:var(--transition);cursor:pointer" 
                     onclick="showTimelineEventDetail('${e.id}')"
                     onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
                  <span style="font-size:16px;flex-shrink:0">${tc.icon}</span>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
                      <span style="font-weight:600;font-size:13px">${escapeHtml(e.title)}</span>
                      <span class="badge" style="background:var(--${tc.color}-dim);color:var(--${tc.color});font-size:10px">${e.type.replace('_', ' ')}</span>
                      <span style="font-size:11px;color:var(--text-muted)">${new Date(e.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.details || '')}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatHourDisplay(hourKey) {
  const date = new Date(hourKey + ':00:00');
  return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDayDisplay(dayKey) {
  const date = new Date(dayKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '<1s';
  if (seconds < 60) return Math.round(seconds) + 's';
  if (seconds < 3600) return Math.floor(seconds/60) + 'm ' + (seconds%60).toFixed(0) + 's';
  return Math.floor(seconds/3600) + 'h ' + Math.floor((seconds%3600)/60) + 'm';
}

function showTimelineEventDetail(eventId) {
  const event = screenState.unifiedTimeline.find(e => e.id === eventId) || 
                screenState.timeline.find(e => e.id === eventId);
  if (!event) return;

  const tc = { icon: '📄', color: 'accent' };
  const typeColors = {
    voice_capture: { icon: '🎙️', color: 'red' },
    journal: { icon: '📓', color: 'green' },
    skill_run: { icon: '⚡', color: 'purple' },
    handoff: { icon: '🤝', color: 'orange' },
    audit: { icon: '📋', color: 'blue' },
    screen: { icon: '🖥️', color: 'cyan' },
  };
  Object.assign(tc, typeColors[event.type] || {});

  const modal = document.getElementById('timelineEventModal');
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeTimelineModal()">
      <div class="modal" style="max-width:700px;max-height:80vh;overflow-y:auto">
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <span class="modal-title">${tc.icon} ${escapeHtml(event.title)}</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
              <span class="badge" style="background:var(--${tc.color}-dim);color:var(--${tc.color})">${event.type.replace('_', ' ')}</span>
              <span>${new Date(event.timestamp).toLocaleString()}</span>
              ${event.agent ? '<span>Agent: ' + event.agent + '</span>' : ''}
            </div>
          </div>
          <button class="modal-close" onclick="closeTimelineModal()">✕</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${escapeHtml(event.details || 'No details')}</div>
          ${event.source ? '<div style="font-size:12px;color:var(--text-muted)">Source: ' + event.source + '</div>' : ''}
        </div>
        <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:16px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost" onclick="closeTimelineModal()">Close</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" onclick="closeTimelineModal()" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999"></div>
  `;
}

function closeTimelineModal() {
  const modal = document.getElementById('timelineEventModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

async function rebuildTimeline() {
  if (!confirm('Rebuild unified timeline from all sources?')) return;
  showToast('Rebuilding timeline...', 'info');
  try {
    const result = await api.rebuildTimeline();
    showToast(`Timeline rebuilt: ${result.total} events`, 'success');
    await loadUnifiedTimeline();
  } catch (err) {
    showToast('Rebuild failed: ' + err.message, 'error');
  }
}

window.renderTimeline = renderTimeline;
window.setViewMode = setViewMode;
window.loadUnifiedTimeline = loadUnifiedTimeline;
window.loadScreenActivity = loadScreenActivity;
window.loadScreenActivitySummary = loadScreenActivitySummary;
window.rebuildTimeline = rebuildTimeline;
window.showTimelineEventDetail = showTimelineEventDetail;
window.closeTimelineModal = closeTimelineModal;
window.formatDuration = formatDuration;