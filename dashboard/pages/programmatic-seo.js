async function renderProgrammaticSeo() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Programmatic SEO</h1>
        <p class="page-subtitle">Bulk generate intent-optimized content and inject into Memory Vault</p>
      </div>
      <span style="padding:5px 12px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:var(--mc-radius);color:var(--mc-blue);font-size:12px;font-weight:600;">Boardroom Exclusive</span>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;align-items:start;">
      <!-- Pipeline Config -->
      <div class="mc-card" style="padding:24px;">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:20px;color:var(--mc-text-primary);">Pipeline Configuration</h2>

        <div class="form-group">
          <label class="form-label">Keywords <span style="color:var(--mc-text-muted);font-weight:400;">(one per line or comma-separated)</span></label>
          <textarea id="seo-keywords" class="form-textarea" rows="6" placeholder="agentic os&#10;multi agent swarm&#10;AI boardroom setup&#10;programmatic seo examples"></textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Search Intent</label>
            <select id="seo-intent" class="form-input">
              <option value="informational">Informational</option>
              <option value="commercial">Commercial / Review</option>
              <option value="transactional">Transactional</option>
              <option value="navigational">Navigational</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Tone of Voice</label>
            <select id="seo-tone" class="form-input">
              <option value="professional">Professional / Executive</option>
              <option value="casual">Casual / Conversational</option>
              <option value="authoritative">Authoritative / Expert</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Target Word Count</label>
            <select id="seo-words" class="form-input">
              <option value="800">~800 words</option>
              <option value="1200" selected>~1200 words</option>
              <option value="2000">~2000 words</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Output Format</label>
            <select id="seo-format" class="form-input">
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="plaintext">Plain Text</option>
            </select>
          </div>
        </div>

        <button id="btn-run-seo" class="mc-btn mc-btn-primary" style="width:100%;justify-content:center;padding:12px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Run Programmatic Pipeline
        </button>
      </div>

      <!-- Status Panel -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Stats -->
        <div class="mc-card" style="padding:20px;">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:16px;color:var(--mc-text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Pipeline Stats</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:700;color:var(--mc-accent);" id="seo-stat-queued">0</div>
              <div style="font-size:11px;color:var(--mc-text-muted);margin-top:2px;">Queued</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:700;color:var(--mc-blue);" id="seo-stat-done">0</div>
              <div style="font-size:11px;color:var(--mc-text-muted);margin-top:2px;">Completed</div>
            </div>
          </div>
        </div>

        <!-- Log -->
        <div class="mc-card" style="padding:0;overflow:hidden;">
          <div style="padding:14px 16px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:600;">Pipeline Log</span>
            <button class="mc-btn mc-btn-ghost" style="font-size:11px;padding:4px 8px;" onclick="document.getElementById('seo-log').innerHTML=''">Clear</button>
          </div>
          <div id="seo-log" style="padding:14px;height:300px;overflow-y:auto;font-family:var(--mc-font-mono);font-size:11px;display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,0.2);">
            <span style="color:var(--mc-text-muted);">System idle. Ready for input.</span>
          </div>
        </div>

        <!-- Memory Vault Link -->
        <div class="mc-card" style="padding:16px;background:var(--mc-accent-dim);border-color:rgba(0,224,158,0.2);">
          <div style="font-size:13px;font-weight:600;color:var(--mc-accent);margin-bottom:6px;">🧠 Auto-Injected into Memory</div>
          <div style="font-size:12px;color:var(--mc-text-secondary);line-height:1.5;">Generated articles are stored in the Memory Vault and interlinked by keyword and intent tags.</div>
          <button class="mc-btn" style="margin-top:12px;width:100%;justify-content:center;font-size:12px;" onclick="navigate('semantic-search')">Search Memory →</button>
        </div>
      </div>
    </div>
  `;

  const btnRun = document.getElementById('btn-run-seo');
  const log = document.getElementById('seo-log');
  let doneCount = 0;

  function appendLog(msg, isError = false, isInfo = false) {
    const span = document.createElement('span');
    span.style.color = isError ? 'var(--mc-red)' : isInfo ? 'var(--mc-blue)' : 'var(--mc-accent)';
    span.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
  }

  btnRun.addEventListener('click', async () => {
    const rawKeywords = document.getElementById('seo-keywords').value.trim();
    const intent = document.getElementById('seo-intent').value;
    const tone = document.getElementById('seo-tone').value;

    let keywords = rawKeywords.includes(',')
      ? rawKeywords.split(',').map(k => k.trim()).filter(Boolean)
      : rawKeywords.split('\n').map(k => k.trim()).filter(Boolean);

    if (keywords.length === 0) {
      appendLog('Error: No keywords provided.', true);
      return;
    }

    appendLog(`Starting pipeline for ${keywords.length} keyword(s)...`, false, true);
    document.getElementById('seo-stat-queued').textContent = keywords.length;
    doneCount = 0;
    document.getElementById('seo-stat-done').textContent = 0;
    btnRun.disabled = true;
    btnRun.innerHTML = `<svg class="loading-spinner" style="width:16px;height:16px;border-width:2px;" viewBox="0 0 24 24"></svg> Processing...`;

    try {
      const res = await api.post('/api/seo/programmatic', { keywords, intent, tone });
      if (res.job_id) {
        appendLog(`Job ${res.job_id} submitted. Swarm is generating articles in background.`, false, true);
        appendLog(`${keywords.length} articles queued → check Kanban for live tracking.`);
        document.getElementById('seo-stat-done').textContent = keywords.length;
        showToast(`SEO pipeline running for ${keywords.length} keywords`, 'success');
      }
    } catch (err) {
      appendLog(`Pipeline Error: ${err.message}`, true);
      showToast(err.message, 'error');
    } finally {
      btnRun.disabled = false;
      btnRun.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Run Programmatic Pipeline`;
    }
  });
}

window.renderProgrammaticSeo = renderProgrammaticSeo;
