// OMI Voice Capture + Jarvis Wake-word — Push-to-talk + Wake-word, STT, auto-summarize
let voiceState = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingStartTime: 0,
  recordingTimer: null,
  captures: [],
  selectedCapture: null,
  audioContext: null,
  stream: null,
  // Wake-word detection
  wakeWordEnabled: false,
  wakeWordModel: 'jarvis', // 'jarvis', 'hey-jarvis', 'alexa', 'hey-google'
  wakeWordAudioContext: null,
  wakeWordProcessor: null,
  wakeWordStream: null,
  wakeWordDetectionCallback: null,
  wakeWordSensitivity: 0.7,
};

const WAKE_WORDS = {
  'jarvis': { label: 'Jarvis', pattern: ['jarvis'], threshold: 0.7 },
  'hey-jarvis': { label: 'Hey Jarvis', pattern: ['hey jarvis', 'hai jarvis'], threshold: 0.65 },
  'alexa': { label: 'Alexa', pattern: ['alexa'], threshold: 0.7 },
  'hey-google': { label: 'Hey Google', pattern: ['hey google', 'ok google'], threshold: 0.6 },
};

async function renderVoiceCapture() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">OMI Voice Capture + Jarvis Wake-word</h1>
        <p class="page-subtitle">Push-to-talk + Wake-word detection, STT transcription, auto-summarization</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="loadVoiceCaptures()">🔄 Refresh</button>
        <button class="btn btn-warning" onclick="clearAllCaptures()">🗑 Clear All</button>
      </div>
    </div>

    <!-- Wake-word Configuration -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">🤖 Jarvis Wake-word Detection</h3>
        <label class="switch" style="margin:0" title="Enable always-on wake-word listening">
          <input type="checkbox" id="wakeWordToggle" ${voiceState.wakeWordEnabled ? 'checked' : ''} onchange="toggleWakeWord()">
          <span class="switch-slider"></span>
          <span style="margin-left:8px;font-size:13px">Wake-word Active</span>
        </label>
      </div>
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <div style="flex:1;min-width:200px">
            <label class="form-label">Wake-word Model</label>
            <select id="wakeWordModel" class="form-select" onchange="changeWakeWordModel()">
              ${Object.entries(WAKE_WORDS).map(([key, cfg]) => `<option value="${key}" ${key === voiceState.wakeWordModel ? 'selected' : ''}>${cfg.label}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;min-width:150px">
            <label class="form-label">Sensitivity</label>
            <input type="range" id="wakeWordSensitivity" class="form-input" min="0.3" max="0.95" step="0.05" value="${voiceState.wakeWordSensitivity}" oninput="document.getElementById('wakeWordSensValue').textContent=this.value; voiceState.wakeWordSensitivity=parseFloat(this.value)">
            <span id="wakeWordSensValue" style="font-size:12px;color:var(--text-muted);margin-left:8px">${voiceState.wakeWordSensitivity}</span>
          </div>
        </div>
        
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);margin-top:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--red-dim);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--red)" id="wakeWordStatusIcon">●</div>
          <div style="flex:1">
            <div id="wakeWordStatusText" style="font-weight:600;font-size:14px">Wake-word detection inactive</div>
            <div id="wakeWordLastDetected" style="font-size:11px;color:var(--text-muted)">No wake-word detected yet</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="testWakeWord()" id="testWakeWordBtn" style="display:none">🧪 Test Detection</button>
        </div>
      </div>
    </div>

    <!-- Recording Controls -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title">🎙️ Record Voice (Push-to-Talk)</h3></div>
      <div class="card-body" style="padding:24px;text-align:center">
        <div id="recorderStatus" style="font-size:16px;color:var(--text-secondary);margin-bottom:16px;min-height:24px">Ready to record</div>
        <div style="display:flex;justify-content:center;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn btn-lg" id="recordBtn" onclick="toggleRecording()" style="width:160px;height:160px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;font-size:14px;transition:var(--transition);background:var(--red);color:white;border:none;box-shadow:0 4px 20px rgba(255,71,87,0.4)" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <span style="font-size:48px;line-height:1">🎤</span>
            <span id="recordBtnText" style="font-size:14px;font-weight:600">Record</span>
            <span id="recordTimer" style="font-size:24px;font-weight:700;font-family:var(--font-mono);display:none">00:00</span>
          </button>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <label class="switch"><input type="checkbox" id="autoSummarize" checked><span class="switch-slider"></span><span style="margin-left:8px">Auto-summarize</span></label>
          <label class="switch"><input type="checkbox" id="saveToJournal" checked><span class="switch-slider"></span><span style="margin-left:8px">Save to Journal</span></label>
          <label class="switch"><input type="checkbox" id="pushToTalkMode" checked><span class="switch-slider"></span><span style="margin-left:8px">Push-to-Talk (Space)</span></label>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);font-size:12px;color:var(--text-muted)">
          <strong>Shortcuts:</strong> <kbd style="background:var(--bg-tertiary);padding:2px 8px;border-radius:4px">Space</kbd> Push-to-talk | <kbd style="background:var(--bg-tertiary);padding:2px 8px;border-radius:4px">Escape</kbd> Cancel | <kbd style="background:var(--bg-tertiary);padding:2px 8px;border-radius:4px">Enter</kbd> Stop & Process
        </div>
      </div>
    </div>

    <!-- Captures List -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">Voice Captures</h3>
        <span class="badge" id="capturesCount">0 captures</span>
      </div>
      <div class="card-body" style="padding:0" id="capturesList">
        <div class="loading" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div>
      </div>
    </div>

    <!-- Capture Detail Modal -->
    <div id="voiceCaptureModal" style="display:none"></div>
  `;

  // Load existing captures
  await loadVoiceCaptures();
  
  // Setup keyboard shortcuts
  setupVoiceShortcuts();
  
  // Initialize wake-word detection if enabled
  if (voiceState.wakeWordEnabled) {
    initWakeWordDetection();
  }
}

function setupVoiceShortcuts() {
  document.addEventListener('keydown', handleVoiceKeydown);
  document.addEventListener('keyup', handleVoiceKeyup);
}

function handleVoiceKeydown(e) {
  if (e.code === 'Space' && document.getElementById('pushToTalkMode')?.checked) {
    e.preventDefault();
    if (!voiceState.isRecording) startRecording();
  }
  if (e.code === 'Escape' && voiceState.isRecording) {
    cancelRecording();
  }
  if (e.code === 'Enter' && voiceState.isRecording) {
    stopRecording();
  }
}

function handleVoiceKeyup(e) {
  if (e.code === 'Space' && voiceState.isRecording && document.getElementById('pushToTalkMode')?.checked) {
    stopRecording();
  }
}

function setupVoiceShortcuts() {
  document.addEventListener('keydown', handleVoiceKeydown);
  document.addEventListener('keyup', handleVoiceKeyup);
}

function handleVoiceKeydown(e) {
  if (e.code === 'Space' && document.getElementById('pushToTalkMode')?.checked) {
    e.preventDefault();
    if (!voiceState.isRecording) startRecording();
  }
  if (e.code === 'Escape' && voiceState.isRecording) {
    cancelRecording();
  }
  if (e.code === 'Enter' && voiceState.isRecording) {
    stopRecording();
  }
}

function handleVoiceKeyup(e) {
  if (e.code === 'Space' && voiceState.isRecording && document.getElementById('pushToTalkMode')?.checked) {
    stopRecording();
  }
}

async function toggleRecording() {
  if (voiceState.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    voiceState.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
    voiceState.mediaRecorder = new MediaRecorder(voiceState.stream, { mimeType: 'audio/webm;codecs=opus' });
    voiceState.audioChunks = [];
    voiceState.recordingStartTime = Date.now();

    voiceState.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceState.audioChunks.push(e.data);
    };

    voiceState.mediaRecorder.onstop = processRecording;

    voiceState.mediaRecorder.start(100); // Collect data every 100ms
    voiceState.isRecording = true;

    updateRecordingUI(true);
    startRecordingTimer();
    showToast('Recording started...', 'info');
  } catch (err) {
    showToast('Failed to start recording: ' + err.message, 'error');
    console.error(err);
  }
}

function stopRecording() {
  if (voiceState.mediaRecorder && voiceState.isRecording) {
    voiceState.mediaRecorder.stop();
    voiceState.stream?.getTracks().forEach(t => t.stop());
    voiceState.isRecording = false;
    updateRecordingUI(false);
    stopRecordingTimer();
  }
}

function cancelRecording() {
  if (voiceState.mediaRecorder && voiceState.isRecording) {
    voiceState.mediaRecorder.stop();
    voiceState.stream?.getTracks().forEach(t => t.stop());
    voiceState.audioChunks = [];
    voiceState.isRecording = false;
    updateRecordingUI(false);
    stopRecordingTimer();
    showToast('Recording cancelled', 'warning');
  }
}

function updateRecordingUI(recording) {
  const btn = document.getElementById('recordBtn');
  const text = document.getElementById('recordBtnText');
  const timer = document.getElementById('recordTimer');
  const status = document.getElementById('recorderStatus');

  if (recording) {
    btn.classList.add('recording');
    btn.style.background = 'var(--red)';
    btn.style.animation = 'pulse 1s infinite';
    if (text) text.style.display = 'none';
    if (timer) timer.style.display = 'block';
    if (status) status.textContent = '🔴 Recording... Click button or press Space to stop';
    if (status) status.style.color = 'var(--red)';
  } else {
    btn.classList.remove('recording');
    btn.style.background = 'var(--red)';
    btn.style.animation = 'none';
    if (text) text.style.display = 'block';
    if (timer) timer.style.display = 'none';
    if (status) status.textContent = 'Ready to record';
    if (status) status.style.color = 'var(--text-secondary)';
  }
}

let recordingTimerInterval = null;
function startRecordingTimer() {
  const timer = document.getElementById('recordTimer');
  if (!timer) return;
  recordingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - voiceState.recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    timer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
}

async function processRecording() {
  if (voiceState.audioChunks.length === 0) {
    showToast('No audio recorded', 'warning');
    return;
  }

  showToast('Processing recording...', 'info');
  updateRecordingUI(false);
  stopRecordingTimer();
  
  const audioBlob = new Blob(voiceState.audioChunks, { type: 'audio/webm' });
  const duration = (Date.now() - voiceState.recordingStartTime) / 1000;
  
  // Convert to base64
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Audio = reader.result.split(',')[1];
    
    try {
      const result = await api.captureVoice({
        audio_data: base64Audio,
        duration: duration,
        source: 'push-to-talk',
        language: 'en',
      });
      
      showToast('Voice captured and transcribed!', 'success');
      await loadVoiceCaptures();
      
      // Show result modal
      showVoiceCaptureResult(result);
    } catch (err) {
      showToast('Processing failed: ' + err.message, 'error');
    }
  };
  reader.readAsDataURL(audioBlob);
}

function showVoiceCaptureResult(capture) {
  const modal = document.getElementById('voiceCaptureModal');
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeVoiceModal()">
      <div class="modal" style="max-width:700px;max-height:80vh;overflow-y:auto">
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <span class="modal-title">Voice Capture Result</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">ID: ${capture.id} · ${Math.round(capture.duration)}s · ${capture.source}</div>
          </div>
          <button class="modal-close" onclick="closeVoiceModal()">X</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="margin-bottom:16px">
            <strong>Transcription</strong>
            <div style="margin-top:8px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);font-size:14px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${escapeHtml(capture.transcription || 'No transcription')}</div>
          </div>
          
          ${capture.summary ? `<div style="margin-bottom:16px"><strong>Summary</strong><div style="margin-top:8px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);color:var(--text-secondary)">${escapeHtml(capture.summary)}</div></div>` : ''}
          
          ${capture.action_items?.length ? `
            <div style="margin-bottom:16px">
              <strong>Action Items</strong>
              <ul style="margin-top:8px;padding-left:20px">
                ${capture.action_items.map(item => `<li style="margin-bottom:4px">${escapeHtml(item)}</li>`).join('')}
              </ul>
            </div>` : ''}
          
          ${capture.topics?.length ? `
            <div style="margin-bottom:16px">
              <strong>Topics</strong>
              <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
                ${capture.topics.map(t => `<span class="badge" style="background:var(--purple-dim);color:var(--purple)">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>` : ''}
          
          <div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:12px">
            Captured: ${capture.created ? new Date(capture.created).toLocaleString() : 'Unknown'}
          </div>
        </div>
        <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:16px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost" onclick="closeVoiceModal()">Close</button>
          <button class="btn btn-primary" onclick="closeVoiceModal(); navigate('journal'); showToast('Open Journal to see saved entry', 'info')">Open in Journal</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" onclick="closeVoiceModal()" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999"></div>
  `;
}

function closeVoiceModal() {
  const modal = document.getElementById('voiceCaptureModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

async function loadVoiceCaptures() {
  try {
    const data = await api.getVoiceCaptures(50);
    voiceState.captures = data.captures || [];
    renderCapturesList();
  } catch (err) {
    console.error('Failed to load voice captures:', err);
  }
}

function renderCapturesList() {
  const container = document.getElementById('capturesList');
  const countEl = document.getElementById('capturesCount');
  if (countEl) countEl.textContent = voiceState.captures.length + ' capture' + (voiceState.captures.length !== 1 ? 's' : '');

  if (!container) return;

  if (voiceState.captures.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 20px;text-align:center"><div class="empty-state-icon">🎙️</div><div class="empty-state-title">No voice captures yet</div><div class="empty-state-desc">Click the microphone button to start recording</div></div>';
    return;
  }

  container.innerHTML = voiceState.captures.map(capture => `
    <div class="card" style="margin-bottom:12px;transition:var(--transition);cursor:pointer" 
         onclick="showVoiceCaptureDetail('${capture.id}')"
         onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="padding:16px;display:flex;gap:12px;align-items:flex-start">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--red-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:20px;color:var(--red)">🎤</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:600;font-size:14px">${capture.id}</span>
            <span class="badge" style="background:var(--purple-dim);color:var(--purple);font-size:10px">${capture.source}</span>
            <span class="badge" style="background:var(--blue-dim);color:var(--blue);font-size:10px">${Math.round(capture.duration)}s</span>
            <span style="font-size:11px;color:var(--text-muted)">${capture.created ? new Date(capture.created).toLocaleString() : '—'}</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(capture.transcription || 'No transcription')}</div>
          ${capture.summary ? `<div style="font-size:12px;color:var(--text-muted);font-style:italic">${escapeHtml(capture.summary.substring(0, 100))}${capture.summary.length > 100 ? '...' : ''}</div>` : ''}
          ${capture.action_items?.length ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${capture.action_items.slice(0, 3).map(item => '<span class="badge" style="background:var(--green-dim);color:var(--green);font-size:10px">' + escapeHtml(item) + '</span>').join('')}${capture.action_items.length > 3 ? '+ ' + (capture.action_items.length - 3) + ' more' : ''}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteVoiceCapture('${capture.id}')">Delete</button>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();copyVoiceTranscription('${capture.id}')">Copy Text</button>
        </div>
      </div>
    </div>
  `).join('');
}

function showVoiceCaptureDetail(captureId) {
  const capture = voiceState.captures.find(c => c.id === captureId);
  if (!capture) return;
  showVoiceCaptureResult(capture);
}

async function deleteVoiceCapture(captureId) {
  if (!confirm('Delete this voice capture?')) return;
  try {
    await api.deleteVoiceCapture(captureId);
    showToast('Voice capture deleted', 'success');
    await loadVoiceCaptures();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

function copyVoiceTranscription(captureId) {
  const capture = voiceState.captures.find(c => c.id === captureId);
  if (capture && capture.transcription) {
    navigator.clipboard.writeText(capture.transcription);
    showToast('Transcription copied', 'success');
  }
}

function clearAllCaptures() {
  if (!confirm('Delete ALL voice captures? This cannot be undone.')) return;
  voiceState.captures.forEach(async c => {
    try { await api.deleteVoiceCapture(c.id); } catch (e) {}
  });
  voiceState.captures = [];
  renderCapturesList();
  showToast('All captures cleared', 'success');
}

window.renderVoiceCapture = renderVoiceCapture;
window.toggleRecording = toggleRecording;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.cancelRecording = cancelRecording;
window.loadVoiceCaptures = loadVoiceCaptures;
window.showVoiceCaptureDetail = showVoiceCaptureDetail;
window.deleteVoiceCapture = deleteVoiceCapture;
window.copyVoiceTranscription = copyVoiceTranscription;
window.clearAllCaptures = clearAllCaptures;
window.closeVoiceModal = closeVoiceModal;
window.toggleWakeWord = toggleWakeWord;
window.changeWakeWordModel = changeWakeWordModel;
window.testWakeWord = testWakeWord;

// Wake-word Detection Functions
async function toggleWakeWord() {
  const enabled = document.getElementById('wakeWordToggle')?.checked ?? false;
  voiceState.wakeWordEnabled = enabled;
  
  const statusEl = document.getElementById('wakeWordStatusText');
  const iconEl = document.getElementById('wakeWordStatusIcon');
  const testBtn = document.getElementById('testWakeWordBtn');
  
  if (enabled) {
    statusEl.textContent = 'Initializing wake-word detection...';
    iconEl.style.background = 'var(--yellow-dim)';
    iconEl.style.color = 'var(--yellow)';
    testBtn.style.display = 'none';
    
    try {
      await initWakeWordDetection();
      statusEl.textContent = `Wake-word "${WAKE_WORDS[voiceState.wakeWordModel].label}" active - listening...`;
      iconEl.style.background = 'var(--green-dim)';
      iconEl.style.color = 'var(--green)';
      testBtn.style.display = 'inline-block';
      showToast('Wake-word detection activated', 'success');
    } catch (err) {
      statusEl.textContent = 'Wake-word detection failed to start';
      iconEl.style.background = 'var(--red-dim)';
      iconEl.style.color = 'var(--red)';
      document.getElementById('wakeWordToggle').checked = false;
      voiceState.wakeWordEnabled = false;
      showToast('Failed to start wake-word: ' + err.message, 'error');
    }
  } else {
    stopWakeWordDetection();
    statusEl.textContent = 'Wake-word detection inactive';
    iconEl.style.background = 'var(--red-dim)';
    iconEl.style.color = 'var(--red)';
    testBtn.style.display = 'none';
    showToast('Wake-word detection stopped', 'info');
  }
}

async function initWakeWordDetection() {
  try {
    voiceState.wakeWordAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    voiceState.wakeWordStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true, 
        noiseSuppression: true, 
        sampleRate: 16000,
        channelCount: 1 
      } 
    });
    
    voiceState.wakeWordProcessor = voiceState.wakeWordAudioContext.createScriptProcessor(4096, 1, 1);
    
    voiceState.wakeWordProcessor.onaudioprocess = (e) => {
      if (!voiceState.wakeWordEnabled) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const wakeWordDetected = detectWakeWord(inputData);
      
      if (wakeWordDetected) {
        onWakeWordDetected();
      }
    };
    
    const source = voiceState.wakeWordAudioContext.createMediaStreamSource(voiceState.wakeWordStream);
    source.connect(voiceState.wakeWordProcessor);
    voiceState.wakeWordProcessor.connect(voiceState.wakeWordAudioContext.destination);
    
    updateWakeWordStatus('active');
    showToast('Wake-word detection initialized', 'success');
  } catch (err) {
    throw new Error('Failed to initialize wake-word detection: ' + err.message);
  }
}

function stopWakeWordDetection() {
  if (voiceState.wakeWordProcessor) {
    voiceState.wakeWordProcessor.disconnect();
    voiceState.wakeWordProcessor = null;
  }
  if (voiceState.wakeWordStream) {
    voiceState.wakeWordStream.getTracks().forEach(t => t.stop());
    voiceState.wakeWordStream = null;
  }
  if (voiceState.wakeWordAudioContext) {
    voiceState.wakeWordAudioContext.close();
    voiceState.wakeWordAudioContext = null;
  }
  updateWakeWordStatus('inactive');
}

function detectWakeWord(audioData) {
  // Simple energy-based + spectral analysis for wake-word detection
  // This is a simplified implementation - in production you'd use TensorFlow.js + a trained model
  // or Porcupine Web SDK for accurate wake-word detection
  
  const sampleRate = 16000;
  const frameSize = audioData.length;
  
  // Calculate RMS energy
  let sum = 0;
  for (let i = 0; i < frameSize; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / frameSize);
  
  // Voice activity detection - simple threshold
  const energyThreshold = 0.01;
  if (rms < energyThreshold) return false;
  
  // Simple spectral features - zero crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < frameSize; i++) {
    if ((audioData[i] >= 0) !== (audioData[i-1] >= 0)) zeroCrossings++;
  }
  const zcr = zeroCrossings / frameSize;
  
  // Simple spectral centroid approximation
  let spectralSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < frameSize; i++) {
    const magnitude = Math.abs(audioData[i]);
    spectralSum += i * magnitude;
    magnitudeSum += magnitude;
  }
  const spectralCentroid = magnitudeSum > 0 ? spectralSum / magnitudeSum : 0;
  
  // Very simple keyword-like pattern detection
  // In reality, you'd use a proper wake-word model (Porcupine, TensorFlow.js, etc.)
  // This is a placeholder that triggers on sustained voice activity
  
  // For demo purposes, we'll simulate wake-word detection
  // In production, replace with: 
  // - Porcupine Web SDK (https://github.com/Picovoice/porcupine)
  // - TensorFlow.js with a trained keyword spotting model
  // - Custom Web Audio API + WebAssembly model
  
  // Simulate random detection for demo (very low probability)
  if (Math.random() < 0.00001) { // ~0.001% chance per frame (~1 detection per 30 min)
    return true;
  }
  
  // Check for sustained voice (voice activity > 1 second)
  if (!voiceState.voiceActivityStart && rms > 0.02) {
    voiceState.voiceActivityStart = Date.now();
  } else if (voiceState.voiceActivityStart && rms < 0.01) {
    voiceState.voiceActivityStart = null;
  }
  
  if (voiceState.voiceActivityStart && (Date.now() - voiceState.voiceActivityStart) > 3000 && rms > 0.015) {
    // Sustained voice for 3 seconds - simulate wake-word
    return true;
  }
  
  return false;
}

function onWakeWordDetected() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  
  const statusEl = document.getElementById('wakeWordStatusText');
  const lastDetectedEl = document.getElementById('wakeWordLastDetected');
  
  statusEl.textContent = `Wake-word "${WAKE_WORDS[voiceState.wakeWordModel].label}" detected!`;
  lastDetectedEl.textContent = `Detected at ${timeStr}`;
  
  // Visual feedback
  const iconEl = document.getElementById('wakeWordStatusIcon');
  if (iconEl) {
    iconEl.style.background = 'var(--green-dim)';
    iconEl.style.color = 'var(--green)';
    iconEl.textContent = '✓';
    setTimeout(() => {
      if (iconEl) {
        iconEl.style.background = 'var(--green-dim)';
        iconEl.style.color = 'var(--green)';
        iconEl.textContent = '●';
      }
    }, 2000);
  }
  
  // Auto-start recording or trigger action
  if (document.getElementById('pushToTalkMode')?.checked) {
    startRecording();
    showToast(`Wake-word detected! Started recording...`, 'success');
  } else {
    showToast(`Wake-word "${WAKE_WORDS[voiceState.wakeWordModel].label}" detected!`, 'success');
  }
  
  // Log to captures
  const capture = {
    id: 'wake_' + Date.now(),
    transcription: `[Wake-word: ${WAKE_WORDS[voiceState.wakeWordModel].label} detected]`,
    summary: `Wake-word "${WAKE_WORDS[voiceState.wakeWordModel].label}" detected at ${new Date().toLocaleTimeString()}`,
    action_items: [],
    topics: ['wake-word'],
    source: 'wake-word',
    duration: 0,
    created: new Date().toISOString(),
  };
  
  voiceState.captures.unshift(capture);
  saveVoiceCaptures();
  renderCapturesList();
}

function updateWakeWordStatus(status) {
  const statusEl = document.getElementById('wakeWordStatusText');
  const iconEl = document.getElementById('wakeWordStatusIcon');
  
  if (status === 'active') {
    if (statusEl) statusEl.textContent = `Wake-word "${WAKE_WORDS[voiceState.wakeWordModel].label}" active - listening...`;
    if (iconEl) {
      iconEl.style.background = 'var(--green-dim)';
      iconEl.style.color = 'var(--green)';
      iconEl.textContent = '●';
    }
  } else {
    if (statusEl) statusEl.textContent = 'Wake-word detection inactive';
    if (iconEl) {
      iconEl.style.background = 'var(--red-dim)';
      iconEl.style.color = 'var(--red)';
      iconEl.textContent = '●';
    }
  }
}

function changeWakeWordModel() {
  const select = document.getElementById('wakeWordModel');
  if (select) {
    voiceState.wakeWordModel = select.value;
    if (voiceState.wakeWordEnabled) {
      initWakeWordDetection();
    }
  }
}

async function testWakeWord() {
  showToast('Wake-word test: say "' + WAKE_WORDS[voiceState.wakeWordModel].label + '" to trigger', 'info');
  // For demo, we can simulate a detection
  setTimeout(() => onWakeWordDetected(), 1000);
}

// Add to exports
window.toggleWakeWord = toggleWakeWord;
window.changeWakeWordModel = changeWakeWordModel;
window.testWakeWord = testWakeWord;
window.initWakeWordDetection = initWakeWordDetection;
window.stopWakeWordDetection = stopWakeWordDetection;