// Video Generator — Multi-provider video generation with job management
let videoGenState = {
  // Generation form
  vidPrompt: '',
  vidModel: 'gen-2',
  vidDuration: 4,
  vidFps: 8,
  vidAspect: '16:9',
  vidModels: {},
  vidGenerating: false,
  vidResults: [],
  vidHistory: [],

  // Job management
  activeJobs: {},
  pollingInterval: null,
};

const VIDEO_MODEL_CONFIG = {
  'gen-2': { maxDuration: 16, fps: [8, 12, 24], aspects: ['16:9', '9:16', '1:1', '4:3'], key: 'RUNWAY_API_KEY' },
  'pika': { maxDuration: 10, fps: [24], aspects: ['16:9', '9:16', '1:1'], key: 'PIKA_API_KEY' },
  'luma-dream-machine': { maxDuration: 5, fps: [24], aspects: ['16:9', '9:16', '1:1'], key: 'LUMA_API_KEY' },
  'stable-video-diffusion': { maxDuration: 4, fps: [8, 12], aspects: ['16:9', '9:16', '1:1', '4:3'], key: 'REPLICATE_API_TOKEN' },
};

async function renderVideoGenerator() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Video Generator</h1>
        <p class="page-subtitle">Multi-provider video generation with job management & history</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="loadVideoModels()">🔄 Refresh Models</button>
        <button class="btn btn-ghost" onclick="clearVideoHistory()">🗑 Clear History</button>
      </div>
    </div>

    <div class="grid grid-2" style="gap:24px;align-items:start">
      <!-- Generation Form -->
      <div class="card" style="flex:1">
        <div class="card-header"><h3 class="card-title">Generate Video</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Prompt</label>
            <textarea id="vidPrompt" class="form-input" rows="4" placeholder="Describe the video... (e.g., 'A drone flying over a cyberpunk city at night, neon reflections on wet streets, smooth camera movement, cinematic lighting')"></textarea>
            <div class="form-hint">Be specific about camera movement, lighting, style, and motion</div>
          </div>

          <div class="form-row" style="display:flex;gap:16px;margin-top:16px">
            <div class="form-group" style="flex:1">
              <label class="form-label">Model</label>
              <select id="vidModel" class="form-select" onchange="updateVideoModelConfig()"></select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Duration (seconds)</label>
              <input type="number" id="vidDuration" class="form-input" value="4" min="1" max="16">
            </div>
          </div>

          <div class="form-row" style="display:flex;gap:16px;margin-top:16px">
            <div class="form-group" style="flex:1">
              <label class="form-label">FPS</label>
              <select id="vidFps" class="form-select"></select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Aspect Ratio</label>
              <select id="vidAspect" class="form-select">
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait/TikTok)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:3">4:3 (Standard)</option>
              </select>
            </div>
          </div>

          <div class="form-row" style="display:flex;gap:16px;margin-top:16px">
            <div class="form-group" style="flex:1">
              <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="vidSaveHistory" checked>
                <span>Save to history</span>
              </label>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="vidAutoPoll" checked>
                <span>Auto-poll job status</span>
              </label>
            </div>
          </div>

          <div style="margin-top:20px;display:flex;gap:12px">
            <button class="btn btn-primary" onclick="generateVideo()" id="vidGenerateBtn" style="flex:1">
              <span id="vidGenerateText">🎬 Generate Video</span>
              <span id="vidGenerateSpinner" class="loading-spinner" style="width:16px;height:16px;display:none;margin-left:8px"></span>
            </button>
            <button class="btn btn-ghost" onclick="loadVideoModels()">🔄 Refresh Models</button>
          </div>

          <div id="vidError" class="card" style="margin-top:16px;display:none;background:var(--red-dim);color:var(--red);padding:12px;border-radius:var(--radius)"></div>
          <div id="vidJobInfo" class="card" style="margin-top:16px;display:none;background:var(--accent-glow);border-color:var(--accent);padding:12px;border-radius:var(--radius)">
            <div style="font-weight:600;margin-bottom:4px">Job Submitted</div>
            <div style="font-size:11px;color:var(--accent)" id="vidJobId"></div>
            <div style="margin-top:8px;display:flex;gap:8px">
              <button class="btn btn-sm btn-primary" onclick="pollJobStatus()" id="vidPollBtn">🔄 Check Status</button>
              <button class="btn btn-sm btn-ghost" onclick="cancelVideoJob()">✕ Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Results & History -->
      <div class="card" style="flex:1;display:flex;flex-direction:column">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3 class="card-title">Generated Videos</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="showVideoHistory()">📋 History</button>
            <button class="btn btn-ghost btn-sm" onclick="clearVideoHistory()">🗑 Clear</button>
          </div>
        </div>
        <div class="card-body" style="flex:1;overflow-y:auto;padding:0">
          <div id="vidResults" class="grid grid-3" style="gap:16px;padding:16px;min-height:400px">
            <div class="empty-state" style="grid-column:1/-1;padding:40px">
              <div class="empty-state-icon">🎬</div>
              <div class="empty-state-title">No videos yet</div>
              <div class="empty-state-desc">Enter a prompt and click Generate to create videos</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Jobs Panel -->
    <div id="activeJobsPanel" class="card" style="margin-top:16px;display:none">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Active Jobs</h3>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('activeJobsPanel').style.display='none'">✕ Hide</button>
      </div>
      <div class="card-body" id="activeJobsList"></div>
    </div>

    <!-- History Modal (reuses modal container) -->
  `;

  // Load initial data
  await loadVideoModels();
  loadVideoHistory();
  startJobPolling();
}

function loadVideoModels() {
  const btn = document.querySelector('button[onclick="loadVideoModels()"]');
  if (btn) { btn.disabled = true; btn.textContent = '🔄 Loading...'; }
  
  api.listVideoModels()
    .then(data => {
      videoGenState.vidModels = data.models || {};
      populateVideoModelSelect();
      updateVideoModelConfig();
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Refresh Models'; }
      showToast('Video models loaded', 'success');
    })
    .catch(err => {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Refresh Models'; }
      showToast('Failed to load models: ' + err.message, 'error');
    });
}

function populateVideoModelSelect() {
  const select = document.getElementById('vidModel');
  select.innerHTML = Object.entries(videoGenState.vidModels).map(([key, model]) =>
    `<option value="${key}" ${!modelConfig?.requires_key || checkApiKey(modelConfig.requires_key) ? '' : 'disabled'} title="${modelConfig?.requires_key ? 'Requires: ' + modelConfig.requires_key : ''}">${model.name} (${model.provider})${modelConfig?.requires_key && !checkApiKey(modelConfig.requires_key) ? ' ⚠️ No API Key' : ''}</option>`
  ).join('');
  select.value = videoGenState.vidModel;
}

function checkApiKey(keyName) {
  // Check if we have a way to know if key is configured - simplified for now
  return true; // Let the API handle the error
}

function updateVideoModelConfig() {
  videoGenState.vidModel = document.getElementById('vidModel').value;
  const config = VIDEO_MODEL_CONFIG[videoGenState.vidModel] || { maxDuration: 4, fps: [8, 12, 24], aspects: ['16:9', '9:16', '1:1'] };

  const durationInput = document.getElementById('vidDuration');
  durationInput.max = config.maxDuration;
  if (videoGenState.vidDuration > config.maxDuration) {
    videoGenState.vidDuration = config.maxDuration;
    durationInput.value = config.maxDuration;
  }

  const fpsSelect = document.getElementById('vidFps');
  fpsSelect.innerHTML = config.fps.map(f => `<option value="${f}" ${f === videoGenState.vidFps ? 'selected' : ''}>${f} fps</option>`).join('');

  const aspectSelect = document.getElementById('vidAspect');
  aspectSelect.innerHTML = config.aspects.map(a => `<option value="${a}" ${a === videoGenState.vidAspect ? 'selected' : ''}>${a === '16:9' ? '16:9 (Landscape)' : a === '9:16' ? '9:16 (Portrait/TikTok)' : a === '1:1' ? '1:1 (Square)' : '4:3 (Standard)'}</option>`).join('');
}

async function generateVideo() {
  const prompt = document.getElementById('vidPrompt').value.trim();
  if (!prompt) {
    showToast('Please enter a prompt', 'warning');
    return;
  }

  const btn = document.getElementById('vidGenerateBtn');
  const text = document.getElementById('vidGenerateText');
  const spinner = document.getElementById('vidGenerateSpinner');
  const errorDiv = document.getElementById('vidError');
  const jobInfoDiv = document.getElementById('vidJobInfo');
  const jobIdEl = document.getElementById('vidJobId');

  errorDiv.style.display = 'none';
  btn.disabled = true;
  text.textContent = 'Generating...';
  spinner.style.display = 'inline-block';

  try {
    videoGenState.vidPrompt = prompt;
    videoGenState.vidModel = document.getElementById('vidModel').value;
    videoGenState.vidDuration = parseInt(document.getElementById('vidDuration').value) || 4;
    videoGenState.vidFps = parseInt(document.getElementById('vidFps').value) || 8;
    videoGenState.vidAspect = document.getElementById('vidAspect').value;

    const data = {
      prompt: prompt,
      model: videoGenState.vidModel,
      duration: videoGenState.vidDuration,
      fps: videoGenState.vidFps,
      aspect_ratio: videoGenState.vidAspect,
    };

    const result = await api.generateVideo(data);
    handleVideoResult(result);

    // Save to history
    if (document.getElementById('vidSaveHistory').checked) {
      videoGenState.vidHistory.unshift({
        ...data,
        result: result,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('video_gen_history', JSON.stringify(videoGenState.vidHistory.slice(0, 50)));
    }

    showToast('Video generation started!', 'success');
  } catch (err) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = err.message;
    showToast('Generation failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    text.textContent = '🎬 Generate Video';
    spinner.style.display = 'none';
  }
}

function handleVideoResult(result) {
  errorDiv.style.display = 'none';
  
  if (result.status === 'completed' && result.url) {
    renderVideoResult(result);
    showToast('Video generated successfully!', 'success');
  } else if (result.status === 'pending' || result.job_id) {
    // Job submitted, show job info
    const jobInfoDiv = document.getElementById('vidJobInfo');
    const jobIdEl = document.getElementById('vidJobId');
    const jobId = result.job_id;
    
    jobIdEl.textContent = `Job ID: ${jobId}`;
    jobInfoDiv.style.display = 'block';
    
    // Track active job
    videoGenState.activeJobs[result.job_id] = {
      ...result,
      startTime: Date.now(),
      model: videoGenState.vidModel,
      prompt: videoGenState.vidPrompt,
    };
    updateActiveJobsPanel();
    showActiveJobsPanel();
    
    // Start polling if auto-poll enabled
    if (document.getElementById('vidAutoPoll')?.checked) {
      startJobPolling();
    }
    
    showToast('Video generation queued (Job ID: ' + result.job_id + ')', 'info');
  } else {
    showToast('Unexpected response: ' + JSON.stringify(result), 'warning');
  }
}

function renderVideoResult(result) {
  const container = document.getElementById('vidResults');
  
  // Remove empty state if present
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  const card = document.createElement('div');
  card.className = 'skill-card video-result-card';
  card.style.position = 'relative';
  
  const videoUrl = result.url;
  const model = result.model || videoGenState.vidModel;
  const prompt = result.prompt || videoGenState.vidPrompt;
  const jobId = result.job_id || 'N/A';
  const timestamp = new Date().toLocaleString();
  
  card.innerHTML = `
    <div style="position:absolute;top:8px;right:8px;z-index:10;display:flex;gap:4px">
      <button class="btn btn-ghost btn-sm" onclick="downloadVideo('${videoUrl}', 'studio-vid-${Date.now()}.mp4')" title="Download">📥</button>
      <button class="btn btn-ghost btn-sm" onclick="copyVideoUrl('${videoUrl}')" title="Copy URL">📋</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.video-result-card').remove()" title="Remove">✕</button>
    </div>
    <div class="video-preview" style="height:256px;overflow:hidden;border-radius:var(--radius);background:#000;position:relative">
      <video src="${videoUrl}" controls style="width:100%;height:100%;object-fit:cover" poster="${videoUrl}#t=0.5"></video>
    </div>
    <div class="skill-card-header" style="padding:12px 12px 8px">
      <div class="skill-card-name">${escapeHtml(prompt.slice(0, 60))}${prompt.length > 60 ? '...' : ''}</div>
    </div>
    <div class="skill-card-desc" style="padding:0 12px 12px;font-size:11px;color:var(--text-muted);line-height:1.5">
      <div>Model: <span class="badge badge-info">${model}</span></div>
      <div>Job ID: <code style="font-size:10px">${escapeHtml(jobId)}</code></div>
      <div>Generated: ${timestamp}</div>
    </div>
  `;
  container.prepend(card);
}

function downloadVideo(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Download started', 'success');
}

function copyVideoUrl(url) {
  navigator.clipboard.writeText(url);
  showToast('Video URL copied to clipboard', 'success');
}

function loadVideoHistory() {
  try {
    const stored = localStorage.getItem('video_gen_history');
    if (stored) {
      videoGenState.vidHistory = JSON.parse(stored);
    }
  } catch (e) {}
}

function showVideoHistory() {
  const container = document.getElementById('vidResults');
  container.innerHTML = videoGenState.vidHistory.map(h => `
    <div class="skill-card">
      <div class="skill-card-header"><div class="skill-card-icon">🕐</div><div class="skill-card-name">${new Date(h.timestamp).toLocaleString()}</div></div>
      <div class="skill-card-desc" style="padding:12px;font-size:12px;color:var(--text-muted)">${escapeHtml(h.prompt.slice(0, 100))}...</div>
      <div class="skill-card-footer"><span class="badge badge-info">${h.model}</span></div>
    </div>
  `).join('');
}

function clearVideoHistory() {
  document.getElementById('vidResults').innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;padding:40px">
      <div class="empty-state-icon">🎬</div>
      <div class="empty-state-title">No videos yet</div>
      <div class="empty-state-desc">Enter a prompt and click Generate to create videos</div>
    </div>
  `;
  localStorage.removeItem('video_gen_history');
  showToast('History cleared', 'success');
}

function showActiveJobsPanel() {
  document.getElementById('activeJobsPanel').style.display = 'block';
}

function updateActiveJobsPanel() {
  const container = document.getElementById('activeJobsList');
  const jobs = Object.entries(videoGenState.activeJobs);
  
  if (jobs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No active jobs</div>';
    return;
  }
  
  container.innerHTML = jobs.map(([jobId, job]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);margin-bottom:8px">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${escapeHtml(job.prompt?.slice(0, 60))}${job.prompt?.length > 60 ? '...' : ''}</div>
        <div style="font-size:11px;color:var(--text-muted)">${job.model} · ${new Date(job.startTime).toLocaleTimeString()} · Job: ${jobId.slice(0, 12)}...</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-primary" onclick="pollSpecificJob('${jobId}')">🔄 Poll</button>
        <button class="btn btn-sm btn-ghost" onclick="cancelVideoJob('${jobId}')">Cancel</button>
      </div>
    </div>
  `).join('');
}

async function pollJobStatus() {
  const jobIdEl = document.getElementById('vidJobId');
  const jobIdText = jobIdEl?.textContent?.replace('Job ID: ', '').trim();
  
  if (!jobIdText) {
    showToast('No active job to poll', 'warning');
    return;
  }
  
  await pollSpecificJob(jobIdText);
}

async function pollSpecificJob(jobId) {
  try {
    const result = await api.getVideoJobStatus(jobId);
    if (result.status === 'completed' && result.url) {
      handleVideoResult({ ...result, model: videoGenState.activeJobs[jobId]?.model, prompt: videoGenState.activeJobs[jobId]?.prompt });
      delete videoGenState.activeJobs[jobId];
      updateActiveJobsPanel();
      if (Object.keys(videoGenState.activeJobs).length === 0) {
        document.getElementById('activeJobsPanel').style.display = 'none';
      }
      showToast('Video generation completed!', 'success');
    } else if (result.status === 'failed') {
      delete videoGenState.activeJobs[jobId];
      updateActiveJobsPanel();
      showToast('Video generation failed: ' + (result.error || 'Unknown error'), 'error');
    } else {
      showToast(`Job status: ${result.status || 'pending'}`, 'info');
    }
  } catch (err) {
    showToast('Polling failed: ' + err.message, 'error');
  }
}

function startJobPolling() {
  if (videoGenState.pollingInterval) {
    clearInterval(videoGenState.pollingInterval);
  }
  
  videoGenState.pollingInterval = setInterval(async () => {
    const jobIds = Object.keys(videoGenState.activeJobs);
    if (jobIds.length === 0) {
      clearInterval(videoGenState.pollingInterval);
      videoGenState.pollingInterval = null;
      return;
    }
    
    for (const jobId of jobIds) {
      try {
        const result = await api.getVideoJobStatus(jobId);
        if (result.status === 'completed' && result.url) {
          handleVideoResult({ ...result, model: videoGenState.activeJobs[jobId]?.model, prompt: videoGenState.activeJobs[jobId]?.prompt });
          delete videoGenState.activeJobs[jobId];
        } else if (result.status === 'failed') {
          delete videoGenState.activeJobs[jobId];
        }
      } catch (e) {
        console.warn('Polling error for', jobId, e);
      }
    }
    updateActiveJobsPanel();
    
    if (Object.keys(videoGenState.activeJobs).length === 0) {
      document.getElementById('activeJobsPanel').style.display = 'none';
      clearInterval(videoGenState.pollingInterval);
      videoGenState.pollingInterval = null;
    }
  }, 10000); // Poll every 10 seconds
}

async function cancelVideoJob(jobId) {
  const btn = document.getElementById('vidGenerateBtn');
  try {
    const result = await api.cancelVideoJob(jobId);
    delete videoGenState.activeJobs[jobId];
    updateActiveJobsPanel();
    if (Object.keys(videoGenState.activeJobs).length === 0) {
      document.getElementById('activeJobsPanel').style.display = 'none';
    }
    showToast('Job cancelled', 'success');
  } catch (err) {
    showToast('Failed to cancel: ' + err.message, 'error');
  }
}

function clearVideoHistory() {
  document.getElementById('vidResults').innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;padding:40px">
      <div class="empty-state-icon">🎬</div>
      <div class="empty-state-title">No videos yet</div>
      <div class="empty-state-desc">Enter a prompt and click Generate to create videos</div>
    </div>
  `;
  localStorage.removeItem('video_gen_history');
  showToast('History cleared', 'success');
}

function loadVideoHistory() {
  try {
    const stored = localStorage.getItem('video_gen_history');
    if (stored) {
      videoGenState.vidHistory = JSON.parse(stored);
    }
  } catch (e) {}
}


// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash === '#video-generator') {
    renderVideoGenerator();
  }
});

window.VideoGenerator = {
  render: renderVideoGenerator,
  state: videoGenState,
  VIDEO_MODEL_CONFIG,
};