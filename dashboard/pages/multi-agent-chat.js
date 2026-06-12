// Multi-Agent Group Chat — Real-time agent discussion panel for idea refinement
// Shows simulated discussion between agents (Claude, Gemini, Hermes, OpenClaw)

const MAC_STATE = {
  active: false,
  messages: [],
  agents: [
    { id: 'claude', name: 'Claude', icon: '🤖', color: 'var(--orange)', role: 'Architect', desc: 'Architecture, trade-offs, code review' },
    { id: 'gemini', name: 'Gemini', icon: '🧠', color: 'var(--green)', role: 'Researcher', desc: 'Web research, alternatives, feasibility' },
    { id: 'hermes', name: 'Hermes', icon: '⚡', color: 'var(--purple)', role: 'Operations', desc: 'Memory, scheduling, operational concerns' },
    { id: 'openclaw', name: 'OpenClaw', icon: '🕸️', color: 'var(--violet)', role: 'Orchestrator', desc: 'Routing, task decomposition, coordination' },
  ],
  currentTurn: 0,
  isRunning: false,
  interval: null,
};

const AGENT_PERSONAS = {
  claude: {
    style: 'analytical',
    triggers: ['architecture', 'trade-off', 'scalable', 'maintain', 'review', 'pattern'],
    responses: [
      "From an architecture standpoint, we should consider {topic}. The key trade-off is between {a} and {b}.",
      "I'd recommend a {pattern} pattern here. It provides {benefit} while keeping {constraint} manageable.",
      "Code review perspective: we need to ensure {quality}. This means {practice}.",
      "Long-term, this decision affects {area}. We should plan for {future}.",
    ],
  },
  gemini: {
    style: 'research',
    triggers: ['research', 'alternative', 'compare', 'feasible', 'best practice', 'benchmark'],
    responses: [
      "Research shows {finding}. The {tool} ecosystem has matured significantly in {year}.",
      "Comparing {a} vs {b}: {a} wins on {metric} but {b} is better for {other}.",
      "Feasibility check: {feature} is {feasibility} with current {tech}. Main blocker: {blocker}.",
      "Alternative approach: {alt} could work better for {use-case} because {reason}.",
    ],
  },
  hermes: {
    style: 'operational',
    triggers: ['memory', 'schedule', 'monitor', 'deploy', 'cost', 'reliability', 'ops'],
    responses: [
      "Operational concern: {feature} will need {monitoring}. We should schedule {task}.",
      "Memory consideration: this generates {data} which needs {retention} policy.",
      "Deployment: we'll need {infra} for {scale}. Estimated cost: {cost}/month.",
      "Reliability: we should add {fallback} for {failure-mode}. SLA target: {sla}.",
    ],
  },
  openclaw: {
    style: 'orchestration',
    triggers: ['task', 'route', 'coordinat', 'handoff', 'pipeline', 'workflow', 'decompose'],
    responses: [
      "Task breakdown: {feature} decomposes into {tasks}. Dependencies: {deps}.",
      "Routing: this {task} should go to {agent} because {reason}.",
      "Handoff needed: {from} completes {output}, passes to {to} for {next}.",
      "Pipeline view: stage {n} ({task}) feeds into stage {n+1} ({next}).",
    ],
  },
};

async function renderMultiAgentChat() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Multi-Agent Group Chat</h1>
        <p class="page-subtitle">Watch AI agents collaborate on your idea in real-time</p>
      </div>
      <div class="page-header-right" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="loadMultiAgentChat()">🔄 Reset</button>
        <button class="btn btn-primary" onclick="startAgentDiscussion()">▶ Start Discussion</button>
      </div>
    </div>

    <!-- Control Panel -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <h3 class="card-title">💬 Discussion Controls</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" id="macTopic" class="form-input" placeholder="Discussion topic (e.g., 'architecture for habit tracker')" style="min-width:300px">
          <select id="macRounds" class="form-select" style="width:auto"><option value="3">3 Rounds</option><option value="5" selected>5 Rounds</option><option value="8">8 Rounds</option></select>
          <select id="macMode" class="form-select" style="width:auto"><option value="sequential">Sequential</option><option value="debate">Debate</option><option value="consensus">Consensus</option></select>
        </div>
      </div>
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <label class="switch" style="margin:0"><input type="checkbox" id="macAutoAdvance" checked><span class="switch-slider"></span><span style="margin-left:8px">Auto-advance</span></label>
          <label class="switch" style="margin:0"><input type="checkbox" id="macShowThinking" checked><span class="switch-slider"></span><span style="margin-left:8px">Show reasoning</span></label>
          <label class="switch" style="margin:0"><input type="checkbox" id="macAllowInterventions" checked><span class="switch-slider"></span><span style="margin-left:8px">Allow interruptions</span></label>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);font-size:13px">
          <strong>Current Topic:</strong> <span id="macCurrentTopic" style="margin-left:8px;color:var(--accent)">None</span>
          <span style="margin-left:16px"><strong>Round:</strong> <span id="macRoundDisplay">0</span>/<span id="macTotalRounds">0</span></span>
          <span style="margin-left:16px"><strong>Active Agent:</strong> <span id="macActiveAgent" style="color:var(--green)">Waiting...</span></span>
        </div>
      </div>
    </div>

    <!-- Agent Status Bar -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3 class="card-title">🤖 Agent Panel</h3></div>
      <div class="card-body" style="padding:12px 16px">
        <div id="macAgentStatus" style="display:flex;gap:12px;flex-wrap:wrap">
          ${MAC_STATE.agents.map(a => `
            <div class="mac-agent-card" id="macCard_${a.id}" style="flex:1;min-width:160px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;transition:var(--transition)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:24px">${a.icon}</span>
                <div>
                  <div style="font-weight:600;font-size:13px">${a.name}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${a.role}</div>
                </div>
                <span class="mac-agent-indicator" id="macIndicator_${a.id}" style="width:8px;height:8px;border-radius:50%;background:var(--text-muted);margin-left:auto;transition:var(--transition)"></span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);line-height:1.4">${a.desc}</div>
              <div style="margin-top:8px;height:4px;background:var(--bg-primary);border-radius:2px;overflow:hidden">
                <div class="mac-agent-progress" id="macProgress_${a.id}" style="width:0%;height:100%;background:${a.color};transition:width 0.3s"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Chat Transcript -->
    <div class="card" style="flex:1;min-height:0;display:flex;flex-direction:column">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="card-title">📜 Discussion Transcript</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-ghost" onclick="exportTranscript()">📥 Export</button>
          <button class="btn btn-sm btn-ghost" onclick="clearTranscript()">🗑 Clear</button>
        </div>
      </div>
      <div class="card-body" style="flex:1;overflow:auto;padding:16px;min-height:400px" id="macTranscript">
        <div class="empty-state" style="padding:40px 20px;text-align:center">
          <div class="empty-state-icon" style="font-size:48px">🤖</div>
          <div class="empty-state-title">Ready for Discussion</div>
          <div class="empty-state-desc">Enter a topic and click "Start Discussion" to begin</div>
        </div>
      </div>
    </div>
  `;

  // Add agent status styles
  if (!document.getElementById('macStyles')) {
    const style = document.createElement('style');
    style.id = 'macStyles';
    style.textContent = `
      .mac-agent-card.speaking { border-color: var(--accent); box-shadow: 0 0 16px var(--accent-dim); }
      .mac-agent-indicator.active { background: var(--green); animation: pulse 1s infinite; }
      .mac-agent-card.speaking .mac-agent-indicator { background: var(--accent); animation: pulse 0.5s infinite; }
      .mac-message { animation: slideIn 0.3s ease-out; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    `;
    document.head.appendChild(style);
  }
}

function startAgentDiscussion() {
  const topic = document.getElementById('macTopic')?.value?.trim();
  if (!topic) { showToast('Enter a discussion topic first', 'warning'); return; }
  
  const rounds = parseInt(document.getElementById('macRounds')?.value || '5');
  const mode = document.getElementById('macMode')?.value || 'sequential';
  
  MAC_STATE.active = true;
  MAC_STATE.messages = [];
  MAC_STATE.currentTurn = 0;
  MAC_STATE.isRunning = true;
  
  document.getElementById('macCurrentTopic').textContent = topic;
  document.getElementById('macTotalRounds').textContent = rounds;
  document.getElementById('macRoundDisplay').textContent = '0';
  
  runAgentDiscussion(topic, rounds, mode);
}

function runAgentDiscussion(topic, rounds, mode) {
  const autoAdvance = document.getElementById('macAutoAdvance')?.checked !== false;
  const showThinking = document.getElementById('macShowThinking')?.checked !== false;
  
  const agents = MAC_STATE.agents;
  let currentAgentIndex = 0;
  let currentRound = 1;
  
  function nextTurn() {
    if (!MAC_STATE.isRunning) return;
    
    if (currentRound > rounds) {
      endDiscussion();
      return;
    }
    
    const agent = agents[currentAgentIndex];
    MAC_STATE.currentTurn++;
    document.getElementById('macRoundDisplay').textContent = currentRound;
    document.getElementById('macActiveAgent').textContent = `${agent.icon} ${agent.name}`;
    document.getElementById('macActiveAgent').style.color = agent.color;
    
    // Update agent status UI
    agents.forEach((a, i) => {
      const card = document.getElementById(`macCard_${a.id}`);
      const indicator = document.getElementById(`macIndicator_${a.id}`);
      const progress = document.getElementById(`macProgress_${a.id}`);
      
      if (i === currentAgentIndex) {
        card?.classList.add('speaking');
        indicator?.classList.add('active');
        progress.style.width = '100%';
      } else {
        card?.classList.remove('speaking');
        indicator?.classList.remove('active');
        progress.style.width = ((i < currentAgentIndex && currentRound > 1) || (i < currentAgentIndex && currentRound === 1)) ? '100%' : '0%';
      }
    });
    
    // Generate response
    const response = generateAgentResponse(agent, topic, MAC_STATE.messages, mode);
    
    // Add to transcript
    addMessage({
      agent: agent.id,
      name: agent.name,
      icon: agent.icon,
      color: agent.color,
      role: agent.role,
      content: response.content,
      reasoning: response.reasoning,
      timestamp: new Date().toISOString(),
      round: currentRound,
      turn: MAC_STATE.currentTurn,
    });
    
    // Advance
    currentAgentIndex++;
    if (currentAgentIndex >= agents.length) {
      currentAgentIndex = 0;
      currentRound++;
    }
    
    if (autoAdvance) {
      setTimeout(nextTurn, 2500 + Math.random() * 1500);
    } else {
      // Wait for user to click "Next"
      document.getElementById('macNextBtn')?.focus();
    }
  }
  
  // Add manual next button if not auto
  if (!autoAdvance) {
    const controls = document.querySelector('.mac-controls') || createControls();
  }
  
  nextTurn();
}

function generateAgentResponse(agent, topic, history, mode) {
  const persona = AGENT_PERSONAS[agent.id];
  const templates = persona?.responses || ["I think {topic} is interesting."];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Fill in template variables
  const fillers = {
    topic,
    a: ['simplicity', 'flexibility', 'performance', 'maintainability'][Math.floor(Math.random() * 4)],
    b: ['complexity', 'rigidity', 'overhead', 'technical debt'][Math.floor(Math.random() * 4)],
    pattern: ['modular', 'layered', 'microservice', 'monolithic'][Math.floor(Math.random() * 4)],
    benefit: ['testability', 'scalability', 'team autonomy', 'faster iteration'][Math.floor(Math.random() * 4)],
    constraint: ['coupling', 'complexity', 'cognitive load', 'deployment'][Math.floor(Math.random() * 4)],
    area: ['maintainability', 'scalability', 'team velocity', 'debugging'][Math.floor(Math.random() * 4)],
    future: ['extensibility', 'migration paths', 'team growth', 'technology shifts'][Math.floor(Math.random() * 4)],
    finding: ['the approach is viable', 'there are mature libraries', 'performance is adequate', 'community support is strong'][Math.floor(Math.random() * 4)],
    tool: ['React', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'][Math.floor(Math.random() * 4)],
    year: '2024',
    feasibility: ['highly feasible', 'feasible with effort', 'challenging'][Math.floor(Math.random() * 3)],
    tech: ['current stack', 'modern tooling', 'cloud services'][Math.floor(Math.random() * 3)],
    blocker: ['rate limits', 'cost', 'complexity', 'vendor lock-in'][Math.floor(Math.random() * 4)],
    alt: ['serverless', 'edge computing', 'micro-frontends', 'GraphQL'][Math.floor(Math.random() * 4)],
    usecase: ['mobile', 'real-time', 'offline-first', 'high-scale'][Math.floor(Math.random() * 4)],
    reason: ['better cold starts', 'lower latency', 'team ownership', 'incremental adoption'][Math.floor(Math.random() * 4)],
    tasks: ['3-5 tasks', '2-3 epics', '4-6 stories'][Math.floor(Math.random() * 3)],
    deps: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
    from: MAC_STATE.agents[Math.floor(Math.random() * MAC_STATE.agents.length)].name,
    to: MAC_STATE.agents[Math.floor(Math.random() * MAC_STATE.agents.length)].name,
    output: 'structured data',
    next: 'integration',
    n: '1',
    task: 'implementation',
    nextStage: 'testing',
  };
  
  let content = template;
  Object.entries(fillers).forEach(([key, val]) => {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  });
  
  // Generate reasoning
  const reasoning = `As the ${agent.role}, I'm focusing on ${persona.style} aspects. ${topic} triggers my interest in ${persona.triggers.join(', ')}.`;
  
  return { content, reasoning };
}

function addMessage(msg) {
  MAC_STATE.messages.push(msg);
  renderMessage(msg);
}

function renderMessage(msg) {
  const container = document.getElementById('macTranscript');
  if (!container) return;
  
  // Remove empty state
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();
  
  const div = document.createElement('div');
  div.className = 'mac-message';
  div.style.cssText = 'margin-bottom:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);border-left:4px solid ' + msg.color;
  
  const reasoningHtml = msg.reasoning && document.getElementById('macShowThinking')?.checked ? `
    <details style="margin-top:8px">
      <summary style="cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:600">💭 Reasoning</summary>
      <div style="margin-top:8px;padding:8px;background:var(--bg-primary);border-radius:4px;font-size:11px;color:var(--text-secondary);font-family:var(--font-mono)">${escapeHtml(msg.reasoning)}</div>
    </details>
  ` : '';
  
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:20px">${msg.icon}</span>
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;font-size:13px;color:${msg.color}">${msg.name}</span>
          <span style="font-size:10px;color:var(--text-muted);background:var(--bg-primary);padding:2px 6px;border-radius:3px">${msg.role}</span>
          <span style="font-size:10px;color:var(--text-muted);margin-left:auto">Round ${msg.round} · Turn ${msg.turn}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap">${escapeHtml(msg.content)}</div>
    ${reasoningHtml}
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function endDiscussion() {
  MAC_STATE.isRunning = false;
  document.getElementById('macActiveAgent').textContent = 'Complete';
  document.getElementById('macActiveAgent').style.color = 'var(--green)';
  showToast(`Discussion complete! ${MAC_STATE.messages.length} messages exchanged.`, 'success');
  
  // Enable export
  const transcript = document.getElementById('macTranscript');
  if (transcript) {
    transcript.innerHTML += `
      <div style="margin-top:24px;padding:16px;background:var(--bg-secondary);border-radius:var(--radius);text-align:center">
        <strong>🎉 Discussion Complete</strong>
        <p style="font-size:12px;color:var(--text-muted);margin:8px 0">${MAC_STATE.messages.length} messages across ${document.getElementById('macRounds')?.value || '5'} rounds</p>
        <button class="btn btn-primary" onclick="exportTranscript()">📥 Export Full Transcript</button>
      </div>
    `;
  }
}

function exportTranscript() {
  const lines = MAC_STATE.messages.map(m => 
    `[${new Date(m.timestamp).toLocaleTimeString()}] [Round ${m.round}] ${m.icon} ${m.name} (${m.role}): ${m.content}`
  ).join('\n\n');
  
  const header = `Multi-Agent Discussion Transcript\nTopic: ${document.getElementById('macCurrentTopic')?.textContent || 'N/A'}\nRounds: ${document.getElementById('macRounds')?.value || '5'}\nMode: ${document.getElementById('macMode')?.value || 'sequential'}\nDate: ${new Date().toISOString()}\n\n---\n\n`;
  
  navigator.clipboard.writeText(header + lines).then(() => {
    showToast('Transcript copied to clipboard!', 'success');
  });
}

function clearTranscript() {
  MAC_STATE.messages = [];
  const container = document.getElementById('macTranscript');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;text-align:center">
        <div class="empty-state-icon" style="font-size:48px">🤖</div>
        <div class="empty-state-title">Ready for Discussion</div>
        <div class="empty-state-desc">Enter a topic and click "Start Discussion" to begin</div>
      </div>
    `;
  }
}

function loadMultiAgentChat() {
  MAC_STATE.active = false;
  MAC_STATE.messages = [];
  MAC_STATE.isRunning = false;
  renderMultiAgentChat();
}

function createControls() {
  // Add manual next button when auto-advance is off
  const topicDiv = document.getElementById('macCurrentTopic')?.parentElement;
  if (topicDiv && !document.getElementById('macNextBtn')) {
    const btn = document.createElement('button');
    btn.id = 'macNextBtn';
    btn.className = 'btn btn-primary';
    btn.textContent = '⏭ Next Turn';
    btn.style.marginTop = '12px';
    btn.onclick = () => { /* trigger next turn */ };
    topicDiv.parentElement.appendChild(btn);
  }
  return document.getElementById('macNextBtn');
}

// Register
window.renderMultiAgentChat = renderMultiAgentChat;
window.startAgentDiscussion = startAgentDiscussion;
window.loadMultiAgentChat = loadMultiAgentChat;
window.exportTranscript = exportTranscript;
window.clearTranscript = clearTranscript;