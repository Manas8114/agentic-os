async function renderWorkspace() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div style="display:flex;height:calc(100vh - 64px);margin:-32px;">
      
      <!-- Workspace Sidebar -->
      <div style="width:240px;min-width:240px;border-right:1px solid var(--mc-border);background:var(--mc-surface);display:flex;flex-direction:column;padding:20px;">
        <button class="mc-btn mc-btn-primary" style="width:100%;margin-bottom:24px;justify-content:center;padding:12px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right:8px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New
        </button>
        
        <div style="display:flex;flex-direction:column;gap:4px;">
          <button class="mc-nav-item active" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--mc-surface-hover);border:none;border-radius:var(--mc-radius);color:var(--mc-text-primary);font-size:13px;cursor:pointer;text-align:left;width:100%;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            My Drive
          </button>
          <button class="mc-nav-item" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:transparent;border:none;border-radius:var(--mc-radius);color:var(--mc-text-secondary);font-size:13px;cursor:pointer;text-align:left;width:100%;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Recent
          </button>
          <button class="mc-nav-item" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:transparent;border:none;border-radius:var(--mc-radius);color:var(--mc-text-secondary);font-size:13px;cursor:pointer;text-align:left;width:100%;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Starred
          </button>
          <button class="mc-nav-item" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:transparent;border:none;border-radius:var(--mc-radius);color:var(--mc-text-secondary);font-size:13px;cursor:pointer;text-align:left;width:100%;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Trash
          </button>
        </div>
      </div>
      
      <!-- Main Content -->
      <div style="flex:1;background:var(--mc-bg);display:flex;flex-direction:column;">
        <div style="padding:20px 32px;border-bottom:1px solid var(--mc-border);display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:600;font-size:18px;color:var(--mc-text-primary);">Workspace</div>
          <div class="mc-search" style="width:300px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-left:12px;color:var(--mc-text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search files..." style="background:transparent;border:none;color:var(--mc-text-primary);font-size:13px;width:100%;outline:none;padding:8px;"/>
          </div>
        </div>
        
        <div style="padding:32px;overflow-y:auto;flex:1;">
          
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-secondary);margin-bottom:16px;">Suggested</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:20px;margin-bottom:40px;">
            <div class="mc-card" style="cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.borderColor='var(--mc-border-light)'" onmouseout="this.style.borderColor='var(--mc-border)'">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="background:rgba(59, 130, 246, 0.1);color:var(--mc-blue);padding:8px;border-radius:8px;">📄</div>
                <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Q3 Architecture Plan</div>
              </div>
              <div style="font-size:11px;color:var(--mc-text-muted);">Edited by Claude • 2 hrs ago</div>
            </div>
            <div class="mc-card" style="cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.borderColor='var(--mc-border-light)'" onmouseout="this.style.borderColor='var(--mc-border)'">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="background:rgba(0, 224, 158, 0.1);color:var(--mc-green);padding:8px;border-radius:8px;">📊</div>
                <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Market Analysis</div>
              </div>
              <div style="font-size:11px;color:var(--mc-text-muted);">Edited by Gemini • 5 hrs ago</div>
            </div>
          </div>
          
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-secondary);margin-bottom:16px;">Folders</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:20px;margin-bottom:40px;">
            <div class="mc-card" style="display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.background='var(--mc-surface-hover)'" onmouseout="this.style.background='var(--mc-surface)'">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="color:var(--mc-text-muted)"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);">Code Outputs</div>
            </div>
            <div class="mc-card" style="display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.background='var(--mc-surface-hover)'" onmouseout="this.style.background='var(--mc-surface)'">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="color:var(--mc-text-muted)"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);">Research Reports</div>
            </div>
            <div class="mc-card" style="display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.background='var(--mc-surface-hover)'" onmouseout="this.style.background='var(--mc-surface)'">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="color:var(--mc-text-muted)"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              <div style="font-weight:500;font-size:13px;color:var(--mc-text-primary);">Design Assets</div>
            </div>
          </div>
          
          <div style="font-weight:600;font-size:14px;color:var(--mc-text-secondary);margin-bottom:16px;">Files</div>
          <div id="workspaceFiles">
            <div class="loading"><div class="loading-spinner"></div></div>
          </div>
          
        </div>
      </div>
    </div>
  `;

  // Fetch some files just to mock a file list
  try {
    const brain = await api.getBrain();
    const files = Object.keys(brain).slice(0, 10);
    
    (document.getElementById('workspaceFiles') || {}).innerHTML = files.map(f => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--mc-border);cursor:pointer;transition:var(--mc-transition);" onmouseover="this.style.background='var(--mc-surface-hover)'" onmouseout="this.style.background='transparent'">
        <div style="display:flex;align-items:center;gap:16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--mc-text-muted);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span style="font-size:13px;color:var(--mc-text-primary);">${f}</span>
        </div>
        <div style="font-size:11px;color:var(--mc-text-muted);">
          System
        </div>
      </div>
    `).join('');
  } catch (err) {
    (document.getElementById('workspaceFiles') || {}).innerHTML = `<div style="color:var(--mc-red);font-size:13px;">Error loading files: ${err.message}</div>`;
  }
}
