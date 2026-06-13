async function renderSessionReplay() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-title">Session Replay</div>
        <div class="page-subtitle">Browse and replay past opencode/Hermes sessions</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-ghost" onclick="renderSessionReplay()">🔄 Refresh</button>
      </div>
    </div>
    <div id="sessionList">
      <div class="loading"><div class="loading-spinner"></div><span>Loading sessions...</span></div>
    </div>
    <div id="sessionDetail" style="margin-top:16px"></div>
  `;
  try {
    const data = await api.listSessions();
    const sessions = data.sessions || [];
    const list = document.getElementById('sessionList');
    if (sessions.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎬</div><div class="empty-state-title">No sessions found</div><div class="empty-state-desc">Sessions from opencode will appear here</div></div>`;
      return;
    }
    list.innerHTML = `
      <div class="card" style="padding:0">
        <table>
          <tr><th>Session ID</th><th>Source</th><th>Date</th><th>Size</th><th></th></tr>
          ${sessions.slice(0, 50).map(s => `
            <tr>
              <td style="font-family:monospace;font-size:12px">${escapeHtml(s.id)}</td>
              <td class="text-sm"><span class="badge" style="background:${s.source === 'hermes' ? 'var(--purple)' : 'var(--blue)'}">${escapeHtml(s.source || 'opencode')}</span></td>
              <td class="text-sm">${new Date(s.modified).toLocaleString()}</td>
              <td class="text-sm text-muted">${formatSize(s.size || 0)}</td>
              <td><button class="btn btn-sm btn-ghost" onclick="replaySession('${s.id}')">▶ Replay</button></td>
            </tr>
          `).join('')}
        </table>
        ${sessions.length > 50 ? `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px">Showing 50 of ${sessions.length} sessions</div>` : ''}
      </div>
    `;
  } catch (err) {
    (document.getElementById('sessionList') || {}).innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Failed to load sessions</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

let currentSessionId = null;

async function replaySession(id) {
  currentSessionId = id;
  const detail = document.getElementById('sessionDetail');
  detail.innerHTML = `<div class="loading"><div class="loading-spinner"></div><span>Loading session ${escapeHtml(id)}...</span></div>`;
  try {
    const data = await api.getSessionReplay(id);
    const messages = data.messages || [];
    const session = data;
    renderSessionDetail(detail, messages, session);
  } catch (err) {
    detail.innerHTML = `<div class="card" style="border-color:var(--red)"><div class="text-sm" style="color:var(--red)">⚠ Failed to replay session: ${escapeHtml(err.message)}</div></div>`;
  }
}

function renderSessionDetail(detail, messages, session) {
  const source = session.source || 'opencode';
  const totalMessages = session.total_messages || messages.length;
  detail.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600">Session: <code style="font-size:12px">${escapeHtml(currentSessionId)}</code></div>
          <div class="text-muted text-sm">
            ${totalMessages} messages · ${source} · ${messages.length > 0 && messages[0].timestamp ? new Date(messages[0].timestamp).toLocaleString() : 'Unknown date'}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <label style="font-size:12px;color:var(--text-muted)"><input type="checkbox" id="showTimestamps" checked onchange="toggleTimestamps()"> Show times</label>
          <label style="font-size:12px;color:var(--text-muted)"><input type="checkbox" id="showToolCalls" checked onchange="toggleToolCalls()"> Show tool calls</label>
          <button class="btn btn-sm btn-ghost" onclick="(document.getElementById('sessionDetail') || {}).innerHTML =''">✕ Close</button>
        </div>
      </div>
    </div>
    <div id="messageContainer" style="display:flex;flex-direction:column;gap:8px;max-height:700px;overflow-y:auto;padding-right:8px">
      ${messages.map((m, idx) => renderMessage(m, idx)).join('')}
      ${messages.length === 0 ? '<div class="text-muted text-sm" style="text-align:center;padding:20px">Empty session</div>' : ''}
    </div>
  `;
}

function renderMessage(msg, idx) {
  const role = msg.role || 'assistant';
  const type = msg.type || 'message';
  const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
  const showTime = timestamp ? `<span class="session-message-time" data-time>${escapeHtml(timestamp)}</span>` : '';
  const isUser = role === 'user';
  const isTool = role === 'tool';
  const isSystem = role === 'system';

  let contentHtml = '';
  const content = msg.content || '';

  if (type === 'tool_use' && msg.tool_calls) {
    // Assistant message with tool calls
    contentHtml = `
      <div class="session-message-content">
        ${renderMarkdown(content)}
        <div class="tool-calls" data-tool-calls>
          ${msg.tool_calls.map((tc, tci) => renderToolCall(tc, tci)).join('')}
        </div>
      </div>
    `;
  } else if (type === 'tool_result') {
    // Tool result message
    contentHtml = `
      <div class="session-message-content tool-result">
        <div class="tool-result-header">
          <span class="tool-name">${escapeHtml(msg.tool_name || 'tool')}</span>
          <span class="tool-call-id" style="font-size:10px;color:var(--text-muted)">${msg.tool_call_id ? escapeHtml(msg.tool_call_id.slice(0, 20)) + '...' : ''}</span>
        </div>
        <div class="tool-result-content">
          ${renderMarkdown(String(msg.tool_result || msg.content || ''))}
        </div>
      </div>
    `;
  } else {
    // Regular message (user/assistant/system)
    contentHtml = `
      <div class="session-message-content">
        ${renderMarkdown(content)}
      </div>
    `;
  }

  const roleLabel = isUser ? '👤 You' : (isTool ? '🔧 Tool' : (isSystem ? '⚙️ System' : '🤖 Assistant'));
  const roleClass = isUser ? 'session-message-user' : (isTool ? 'session-message-tool' : (isSystem ? 'session-message-system' : ''));

  return `
    <div class="session-message ${roleClass}" data-msg-index="${idx}" data-role="${role}" data-type="${type}">
      <div class="session-message-header">
        <span class="session-message-role">${roleLabel}</span>
        ${showTime}
      </div>
      ${contentHtml}
    </div>
  `;
}

function renderToolCall(tc, index) {
  const name = tc.name || 'unknown';
  const input = tc.input || {};
  const id = tc.id || '';
  const inputJson = JSON.stringify(input, null, 2);
  return `
    <div class="tool-call" data-tool-call-index="${index}">
      <div class="tool-call-header" onclick="toggleToolCall(this)">
        <span class="tool-call-toggle">▶</span>
        <span class="tool-call-name">${escapeHtml(name)}</span>
        <span class="tool-call-id" style="font-size:10px;color:var(--text-muted);margin-left:8px">${escapeHtml(id.slice(0, 20))}${id.length > 20 ? '...' : ''}</span>
      </div>
      <div class="tool-call-body" style="display:none">
        <pre class="tool-call-input"><code>${escapeHtml(inputJson)}</code></pre>
      </div>
    </div>
  `;
}

function toggleToolCall(header) {
  const body = header.nextElementSibling;
  const toggle = header.querySelector('.tool-call-toggle');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '▶' : '▼';
}

function toggleToolCalls() {
  const show = document.getElementById('showToolCalls').checked;
  document.querySelectorAll('[data-tool-calls]').forEach(el => {
    el.style.display = show ? 'block' : 'none';
  });
}

function toggleTimestamps() {
  const show = document.getElementById('showTimestamps').checked;
  document.querySelectorAll('[data-time]').forEach(el => {
    el.style.display = show ? 'inline' : 'none';
  });
}

// Lightweight markdown renderer (subset: code blocks, inline code, bold, italics, links, lists)
function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Code blocks (```lang\ncode\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

  // Italics (*text* or _text_)
  html = html.replace(/\*([^\*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Unordered lists (- item or * item)
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);

  // Ordered lists (1. item)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ol>${match}</ol>`);

  // Paragraphs (double newline)
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ol>)/g, '$1');
  html = html.replace(/(<\/ol>)<\/p>/g, '$1');

  return html;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Initialize syntax highlighting after rendering
function highlightCodeBlocks() {
  document.querySelectorAll('pre code').forEach(block => {
    if (!block.dataset.highlighted) {
      block.dataset.highlighted = 'true';
      // Apply basic syntax highlighting via CSS classes
      // For production, could integrate Prism.js or highlight.js
      highlightSyntax(block);
    }
  });
}

// Basic syntax highlighting for common languages
function highlightSyntax(block) {
  const code = block.textContent;
  const lang = block.className.match(/language-(\w+)/);
  const language = lang ? lang[1] : 'text';

  let highlighted = _srEscapeForHighlight(code);

  // Common patterns for syntax highlighting
  const patterns = [
    // Keywords
    { regex: /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|public|private|protected|static|readonly|abstract|override)\b/g, class: 'kw' },
    // Strings
    { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, class: 'str' },
    // Template literals
    { regex: /`(?:[^`\\]|\\.)*`/g, class: 'str' },
    // Comments
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, class: 'cm' },
    // Numbers
    { regex: /\b(\d+(\.\d+)?)\b/g, class: 'num' },
    // Function calls
    { regex: /\b([a-zA-Z_$][\w$]*)(?=\s*\()/g, class: 'fn' },
    // Types (TypeScript)
    { regex: /\b(string|number|boolean|object|any|void|never|unknown|undefined|null)\b/g, class: 'typ' },
    // Decorators
    { regex: /@\w+/g, class: 'dec' },
  ];

  if (language === 'json') {
    patterns.push(
      { regex: /("([^"\\]|\\.)*")\s*:/g, class: 'prop' }, // JSON keys
    );
  }

  patterns.forEach(({ regex, class: cls }) => {
    highlighted = highlighted.replace(regex, match => `<span class="tok ${cls}">${match}</span>`);
  });

  block.innerHTML = highlighted;
}

// Override escapeHtml to not escape already-escaped content in code blocks
// NOTE: Uses a locally-scoped version only for syntax highlighting, does NOT
// override the global escapeHtml defined in utils.js
function _srEscapeForHighlight(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Run syntax highlighting after each render
const originalRenderSessionDetail = renderSessionDetail;
renderSessionDetail = function(detail, messages, session) {
  originalRenderSessionDetail(detail, messages, session);
  setTimeout(highlightCodeBlocks, 0);
};

const originalRenderMessage = renderMessage;
renderMessage = function(msg, idx) {
  return originalRenderMessage(msg, idx);
};