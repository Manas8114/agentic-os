// Chart registry to prevent canvas reuse memory leaks
const _laCharts = {};

function _laDestroyCharts() {
  Object.values(_laCharts).forEach(c => { try { c.destroy(); } catch {} });
  Object.keys(_laCharts).forEach(k => delete _laCharts[k]);
}

// Cleanup on navigation
(function _laSetupCleanup() {
  const prev = window._laHashHandler;
  if (prev) window.removeEventListener('hashchange', prev);
  window._laHashHandler = _laDestroyCharts;
  window.addEventListener('hashchange', window._laHashHandler);
})();

async function renderLearningAnalytics() {
  _laDestroyCharts(); // destroy existing charts before re-render
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-title">Learning Analytics</div>
        <div class="page-subtitle">Skill evaluation scores and performance trends</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-ghost" onclick="renderLearningAnalytics()">🔄 Refresh</button>
      </div>
    </div>
    <div class="grid grid-3 mb-4" id="learningStats"></div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Score Distribution</span></div>
        <div class="chart-container"><canvas id="scoreDistributionChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Average Score Trend</span></div>
        <div class="chart-container"><canvas id="avgScoreTrendChart"></canvas></div>
      </div>
    </div>
    <div class="section-title" style="margin-top: 24px;">Individual Skill Trends</div>
    <div id="skillTrendCharts" class="grid grid-2" style="margin-top: 8px;"></div>
    <div class="section-title" style="margin-top: 24px;">Skill Details</div>
    <div id="skillDetailsList"></div>
  `;
  try {
    const [skillData, trendData] = await Promise.all([api.getSkillAnalytics(), api.getTrendAnalytics()]);
    const skills = skillData.skills || [];
    const trends = trendData.trends || [];

    const grid = document.getElementById('learningStats');
    if (grid) {
      if (skills.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📊</div><div class="empty-state-title">No skill data yet</div><div class="empty-state-desc">Skill evaluations will appear here as they accumulate</div></div>`;
      } else {
        const totalRuns = skills.reduce((s, k) => s + (k.total_runs || 0), 0);
        const avgScore = skills.length > 0 ? skills.reduce((s, k) => s + (k.avg_score || 0), 0) / skills.length : 0;
        const improvingSkills = skills.filter(k => k.trend === 'up').length;
        grid.innerHTML = `
          <div class="card stat-card"><div class="stat-icon purple">📈</div><div class="stat-value">${avgScore.toFixed(1)}</div><div class="stat-label">Avg Score</div></div>
          <div class="card stat-card"><div class="stat-icon blue">🔄</div><div class="stat-value">${totalRuns}</div><div class="stat-label">Total Evaluations</div></div>
          <div class="card stat-card"><div class="stat-icon ${improvingSkills > 0 ? 'green' : 'yellow'}">${improvingSkills > 0 ? '↗' : '→'}</div><div class="stat-value">${improvingSkills}</div><div class="stat-label">Improving</div></div>
        `;
      }
    }

    // Build distribution chart (doughnut: score ranges)
    if (skills.length > 0) {
      const distribution = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
      skills.forEach(s => {
        const pct = (s.avg_score || 0) * 100;
        if (pct <= 20) distribution['0-20%']++;
        else if (pct <= 40) distribution['21-40%']++;
        else if (pct <= 60) distribution['41-60%']++;
        else if (pct <= 80) distribution['61-80%']++;
        else distribution['81-100%']++;
      });

      _laCharts['scoreDistribution'] = new Chart(document.getElementById('scoreDistributionChart'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(distribution),
          datasets: [{
            data: Object.values(distribution),
            backgroundColor: [
              'rgba(255, 71, 87, 0.8)',
              'rgba(255, 165, 2, 0.8)',
              'rgba(255, 221, 89, 0.8)',
              'rgba(0, 212, 170, 0.8)',
              'rgba(69, 170, 242, 0.8)'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(), font: { size: 11 } } }
          }
        }
      });

      // Build average score trend chart (line chart showing average score over time across all skills)
      // We'll aggregate all score history points by date
      const allScoresByDate = {};
      trends.forEach(t => {
        (t.scores || []).forEach((score, i) => {
          const label = t.labels && t.labels[i] ? t.labels[i] : `Run ${i + 1}`;
          if (!allScoresByDate[label]) allScoresByDate[label] = [];
          allScoresByDate[label].push(score);
        });
      });

      const trendLabels = Object.keys(allScoresByDate).sort();
      const trendDataPoints = trendLabels.map(l => {
        const vals = allScoresByDate[l];
        return vals.reduce((a, b) => a + b, 0) / vals.length * 100;
      });

      _laCharts['avgScoreTrend'] = new Chart(document.getElementById('avgScoreTrendChart'), {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Avg Score %',
            data: trendDataPoints,
            borderColor: 'rgba(108, 92, 231, 0.9)',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(108, 92, 231, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { 
              ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 10 } }, 
              grid: { color: 'rgba(255,255,255,0.05)' },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }
      });
    }

    // Individual skill trend charts
    const trendSection = document.getElementById('skillTrendCharts');
    if (trendSection) {
      const skillsWithTrends = trends.filter(t => (t.scores || []).length > 0).slice(0, 4);
      if (skillsWithTrends.length === 0) {
        trendSection.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📈</div><div class="empty-state-title">No trend data</div><div class="empty-state-desc">Trends will appear after multiple evaluations</div></div>`;
      } else {
        // Create canvas elements first
        trendSection.innerHTML = skillsWithTrends.map((t, idx) => `
          <div class="card chart-card">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;text-transform:capitalize">${escapeHtml(t.name)}</div>
            <div class="chart-container" style="height:180px"><canvas id="trendChart_${idx}"></canvas></div>
            <div style="display:flex;justify-content:space-between;margin-top:4px">
              <span class="text-xs text-muted">${(t.scores || []).length} data points</span>
              <span class="text-xs text-muted">Avg: ${((t.scores || []).reduce((a, b) => a + b, 0) / (t.scores || [1]).length * 100).toFixed(0)}%</span>
            </div>
          </div>
        `).join('');

        // Initialize charts after DOM insertion
        skillsWithTrends.forEach((t, idx) => {
          const canvas = document.getElementById(`trendChart_${idx}`);
          if (!canvas) return;
          const vals = (t.scores || []).slice(-10);
          const labels = (t.labels || []).slice(-10);
          _laCharts[`trend_${idx}`] = new Chart(canvas, {
            type: 'line',
            data: {
              labels: labels.map(l => l ? l.slice(0, 10) : ''),
              datasets: [{
                label: 'Score %',
                data: vals.map(v => v * 100),
                borderColor: 'rgba(0, 212, 170, 0.9)',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: 'rgba(0, 212, 170, 1)'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 9 } }, grid: { display: false } },
                y: { 
                  ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 9 } }, 
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  suggestedMin: 0,
                  suggestedMax: 100
                }
              }
            }
          });
        });
      }
    }

    // Skill details table
    const details = document.getElementById('skillDetailsList');
    if (details) {
      if (skills.length === 0) {
        details.innerHTML = '';
      } else {
        details.innerHTML = `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Skill</th><th>Runs</th><th>Avg Score</th><th>Last Score</th><th>Best Score</th><th>Trend</th></tr></thead>
              <tbody>
                ${skills.map(s => {
                  const avgPct = Math.round((s.avg_score || 0) * 100);
                  const lastPct = Math.round((s.last_score || 0) * 100);
                  const trendIcon = s.trend === 'up' ? '📈' : s.trend === 'down' ? '📉' : '➡️';
                  const trendColor = s.trend === 'up' ? 'var(--green)' : s.trend === 'down' ? 'var(--red)' : 'var(--text-muted)';
                  return `
                    <tr>
                      <td><span style="font-weight:600;text-transform:capitalize">${escapeHtml(s.name)}</span></td>
                      <td>${s.total_runs || 0}</td>
                      <td><span class="badge" style="background:${avgPct >= 70 ? 'var(--green)' : avgPct >= 40 ? 'var(--yellow)' : 'var(--red)'}">${avgPct}%</span></td>
                      <td>${lastPct}%</td>
                      <td>${Math.round((s.best_score || (s.last_score || 0)) * 100)}%</td>
                      <td><span style="color:${trendColor}">${trendIcon}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } catch (err) {
    showToast('Failed to load analytics: ' + err.message, 'error');
  }
}