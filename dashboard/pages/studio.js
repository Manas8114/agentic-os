const STUDIO_KEY = 'agentic_os_studio';

const STUDIO_STATE = {
  prompts: [],
  assets: [],
  generations: [],
  history: [],
  batchQueue: [],
  activeTab: 'prompts',
  selectedPrompt: null,
};

function studioLoadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDIO_KEY) || '{}');
    STUDIO_STATE.assets = saved.assets || [];
    STUDIO_STATE.generations = saved.generations || [];
    STUDIO_STATE.history = saved.history || [];
    STUDIO_STATE.batchQueue = saved.batchQueue || [];
  } catch {
    STUDIO_STATE.assets = [];
    STUDIO_STATE.generations = [];
    STUDIO_STATE.history = [];
    STUDIO_STATE.batchQueue = [];
  }
}

function studioSaveLocal() {
  localStorage.setItem(STUDIO_KEY, JSON.stringify({
    assets: STUDIO_STATE.assets,
    generations: STUDIO_STATE.generations,
    history: STUDIO_STATE.history,
    batchQueue: STUDIO_STATE.batchQueue,
  }));
}

async function renderStudio() {
  studioLoadLocal();
  await studioLoadPrompts();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="mc-header">
      <div class="mc-header-left">
        <h1 class="mc-title">Studio</h1>
        <p class="mc-subtitle">Prompts, assets, generation queue, and reusable creative outputs</p>
      </div>
      <div class="mc-header-right" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="mc-btn mc-btn-ghost" onclick="studioExportHistory()">Export History</button>
        <button class="mc-btn mc-btn-primary" onclick="studioSwitchTab('generate')">New Generation</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid var(--mc-border);padding-bottom:16px">
      ${['prompts', 'assets', 'generate', 'batch', 'history'].map(tab => `
        <button class="mc-btn mc-btn-sm ${STUDIO_STATE.activeTab === tab ? 'mc-btn-primary' : 'mc-btn-ghost'}" onclick="studioSwitchTab('${tab}')">${studioTitle(tab)}</button>
      `).join('')}
    </div>

    <div id="studioBody"></div>
  `;
  studioRenderActiveTab();
}

async function studioLoadPrompts() {
  try {
    const data = await api.getPrompts();
    STUDIO_STATE.prompts = Object.entries(data || {}).map(([id, content]) => ({
      id,
      title: id.replace(/[-_]/g, ' '),
      category: 'template',
      content: String(content || ''),
      updated: new Date().toISOString(),
    }));
  } catch {
    STUDIO_STATE.prompts = [];
  }
}

function studioTitle(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function studioSwitchTab(tab) {
  STUDIO_STATE.activeTab = tab;
  renderStudio();
}

function studioRenderActiveTab() {
  const body = document.getElementById('studioBody');
  if (!body) return;
  if (STUDIO_STATE.activeTab === 'prompts') body.innerHTML = studioPromptsView();
  if (STUDIO_STATE.activeTab === 'assets') body.innerHTML = studioAssetsView();
  if (STUDIO_STATE.activeTab === 'generate') body.innerHTML = studioGenerateView();
  if (STUDIO_STATE.activeTab === 'batch') body.innerHTML = studioBatchView();
  if (STUDIO_STATE.activeTab === 'history') body.innerHTML = studioHistoryView();
}

function studioPromptsView() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
      <div class="mc-card">
        <div class="mc-card-header" style="display:flex;justify-content:space-between;align-items:center">
          <h3 class="mc-card-title">Prompt Library</h3>
          <input id="studioPromptSearch" class="mc-input" placeholder="Search prompts..." oninput="studioRenderPromptList()" style="max-width:220px">
        </div>
        <div id="studioPromptList" style="display:flex;flex-direction:column;gap:8px">${studioPromptListHtml()}</div>
      </div>
      <div class="mc-card">
        <div class="mc-card-header"><h3 class="mc-card-title" id="studioPromptTitle">Preview</h3></div>
        <div class="mc-card-body" id="studioPromptPreview" style="min-height:320px;color:var(--text-secondary);font-family:var(--font-mono);font-size:12px;white-space:pre-wrap;line-height:1.6">Select a prompt to preview it.</div>
      </div>
    </div>
  `;
}

function studioPromptListHtml() {
  const q = document.getElementById('studioPromptSearch')?.value?.toLowerCase() || '';
  const prompts = STUDIO_STATE.prompts.filter(p => !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  if (!prompts.length) return `<div class="mc-empty"><div class="mc-empty-title">No prompts found</div></div>`;
  return prompts.map(prompt => `
    <button class="mc-card" onclick="studioSelectPrompt('${escapeHtml(prompt.id)}')" style="text-align:left;padding:12px;cursor:pointer;width:100%;background:transparent;transition:var(--mc-transition)" onmouseover="this.style.background='var(--mc-hover)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex;justify-content:space-between;gap:12px">
        <strong style="color:var(--text-primary)">${escapeHtml(prompt.title)}</strong>
        <span class="mc-badge mc-badge-info">${escapeHtml(prompt.category)}</span>
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(prompt.content)}</div>
    </button>
  `).join('');
}

function studioRenderPromptList() {
  const list = document.getElementById('studioPromptList');
  if (list) list.innerHTML = studioPromptListHtml();
}

function studioSelectPrompt(id) {
  const prompt = STUDIO_STATE.prompts.find(p => p.id === id);
  if (!prompt) return;
  STUDIO_STATE.selectedPrompt = prompt;
  document.getElementById('studioPromptTitle').textContent = prompt.title;
  document.getElementById('studioPromptPreview').textContent = prompt.content;
}

function studioAssetsView() {
  return `
    <div class="mc-card">
      <div class="mc-card-header" style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="mc-card-title">Asset Library</h3>
        <button class="mc-btn mc-btn-primary mc-btn-sm" onclick="studioImportAsset()">Add Asset</button>
      </div>
      <div class="mc-card-body" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:16px" id="studioAssetsGrid">
        ${STUDIO_STATE.assets.length ? STUDIO_STATE.assets.map(studioAssetCard).join('') : '<div class="mc-empty"><div class="mc-empty-title">No assets yet</div></div>'}
      </div>
    </div>
  `;
}

function studioAssetCard(asset, index) {
  return `
    <div class="mc-card" style="padding:14px">
      <div style="font-weight:700;color:var(--text-primary)">${escapeHtml(asset.name)}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml(asset.type || 'asset')} · ${formatBytes(asset.size || 0)}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:10px;word-break:break-word">${escapeHtml(asset.url || asset.note || '')}</div>
      <button class="mc-btn mc-btn-danger mc-btn-sm" style="margin-top:12px" onclick="studioRemoveAsset(${index})">Remove</button>
    </div>
  `;
}

function studioImportAsset() {
  const name = prompt('Asset name');
  if (!name) return;
  const url = prompt('URL or note') || '';
  STUDIO_STATE.assets.push({ name, url, type: 'reference', size: 0, created: new Date().toISOString() });
  STUDIO_STATE.history.push({ type: 'asset', name, timestamp: new Date().toISOString() });
  studioSaveLocal();
  renderStudio();
}

function studioRemoveAsset(index) {
  STUDIO_STATE.assets.splice(index, 1);
  studioSaveLocal();
  renderStudio();
}

function studioGenerateView() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
      <div class="mc-card">
        <div class="mc-card-body" style="display:flex;flex-direction:column;gap:16px">
          <div>
            <label style="display:block;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Type</label>
            <select id="studioGenType" class="mc-select" style="width:100%">
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="prompt">Prompt Variant</option>
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Prompt</label>
            <textarea id="studioGenPrompt" class="mc-input" placeholder="Describe the output..." style="width:100%;min-height:100px;resize:vertical"></textarea>
          </div>
          <button class="mc-btn mc-btn-primary" onclick="studioGenerate()">Generate</button>
        </div>
      </div>
      <div class="mc-card">
        <div class="mc-card-header"><h3 class="mc-card-title">Recent Generations</h3></div>
        <div class="mc-card-body" id="studioGenerationResults">${studioGenerationResultsHtml()}</div>
      </div>
    </div>
  `;
}

async function studioGenerate() {
  const type = document.getElementById('studioGenType')?.value || 'image';
  const promptText = document.getElementById('studioGenPrompt')?.value?.trim();
  if (!promptText) {
    showToast('Enter a prompt first', 'warning');
    return;
  }
  const item = { id: Date.now().toString(), type, prompt: promptText, status: 'completed', timestamp: new Date().toISOString() };
  try {
    if (type === 'video') {
      const result = await api.generateVideo({ prompt: promptText, provider: 'runway' });
      item.result = result;
      item.status = result?.error ? 'failed' : 'completed';
    } else if (type === 'image' && api.generateImage) {
      const result = await api.generateImage({ prompt: promptText });
      item.result = result;
      item.status = result?.error ? 'failed' : 'completed';
    } else {
      item.result = { text: promptText };
    }
  } catch (err) {
    item.status = 'failed';
    item.result = { error: err.message };
  }
  STUDIO_STATE.generations.unshift(item);
  STUDIO_STATE.history.push(item);
  studioSaveLocal();
  renderStudio();
  showToast(item.status === 'failed' ? 'Generation failed' : 'Generation saved', item.status === 'failed' ? 'error' : 'success');
}

function studioGenerationResultsHtml() {
  if (!STUDIO_STATE.generations.length) return '<div class="mc-empty"><div class="mc-empty-title">No generations yet</div></div>';
  return STUDIO_STATE.generations.slice(0, 10).map(item => `
    <div class="mc-card" style="padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;gap:12px">
        <strong style="color:var(--text-primary)">${escapeHtml(studioTitle(item.type))}</strong>
        <span class="mc-badge ${item.status === 'failed' ? 'mc-badge-danger' : 'mc-badge-success'}">${escapeHtml(item.status)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">${escapeHtml(item.prompt)}</div>
      ${item.result?.error ? `<div style="font-size:12px;color:var(--mc-danger);margin-top:8px">${escapeHtml(item.result.error)}</div>` : ''}
    </div>
  `).join('');
}

function studioBatchView() {
  return `
    <div class="mc-card">
      <div class="mc-card-header" style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="mc-card-title">Batch Queue</h3>
        <div style="display:flex;gap:8px">
          <button class="mc-btn mc-btn-ghost mc-btn-sm" onclick="studioAddBatchItem()">Add Item</button>
          <button class="mc-btn mc-btn-primary mc-btn-sm" onclick="studioRunBatch()">Run Batch</button>
        </div>
      </div>
      <div class="mc-card-body" id="studioBatchQueue">${studioBatchQueueHtml()}</div>
    </div>
  `;
}

function studioBatchQueueHtml() {
  if (!STUDIO_STATE.batchQueue.length) return '<div class="mc-empty"><div class="mc-empty-title">Queue is empty</div></div>';
  return STUDIO_STATE.batchQueue.map((item, index) => `
    <div class="mc-card" style="padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;gap:12px">
        <span style="color:var(--text-primary)">${escapeHtml(item.prompt)}</span>
        <button class="mc-btn mc-btn-danger mc-btn-sm" onclick="studioRemoveBatchItem(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

function studioAddBatchItem() {
  const promptText = prompt('Batch prompt');
  if (!promptText) return;
  STUDIO_STATE.batchQueue.push({ type: 'prompt', prompt: promptText });
  studioSaveLocal();
  renderStudio();
}

function studioRemoveBatchItem(index) {
  STUDIO_STATE.batchQueue.splice(index, 1);
  studioSaveLocal();
  renderStudio();
}

async function studioRunBatch() {
  if (!STUDIO_STATE.batchQueue.length) return;
  STUDIO_STATE.batchQueue.forEach(item => STUDIO_STATE.history.push({ ...item, status: 'queued', timestamp: new Date().toISOString() }));
  STUDIO_STATE.batchQueue = [];
  studioSaveLocal();
  renderStudio();
  showToast('Batch queued into history', 'success');
}

function studioHistoryView() {
  return `
    <div class="mc-card">
      <div class="mc-card-header"><h3 class="mc-card-title">History</h3></div>
      <div class="mc-card-body">
      ${STUDIO_STATE.history.length ? STUDIO_STATE.history.slice().reverse().map(item => `
        <div style="padding:12px 0;border-bottom:1px solid var(--mc-border)">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <strong style="color:var(--text-primary)">${escapeHtml(item.name || studioTitle(item.type || 'item'))}</strong>
            <span style="font-size:11px;color:var(--text-muted)">${item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${escapeHtml(item.prompt || item.url || '')}</div>
        </div>
      `).join('') : '<div class="mc-empty"><div class="mc-empty-title">No history yet</div></div>'}
      </div>
    </div>
  `;
}

function studioExportHistory() {
  const blob = new Blob([JSON.stringify(STUDIO_STATE.history, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studio-history.json';
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

window.renderStudio = renderStudio;
window.studioSwitchTab = studioSwitchTab;
window.studioRenderPromptList = studioRenderPromptList;
window.studioSelectPrompt = studioSelectPrompt;
window.studioImportAsset = studioImportAsset;
window.studioRemoveAsset = studioRemoveAsset;
window.studioGenerate = studioGenerate;
window.studioAddBatchItem = studioAddBatchItem;
window.studioRemoveBatchItem = studioRemoveBatchItem;
window.studioRunBatch = studioRunBatch;
window.studioExportHistory = studioExportHistory;
