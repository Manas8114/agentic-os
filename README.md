# Mission Control

> **A multi-agent orchestration platform that coordinates opencode, Hermes, Gemini CLI, OpenClaw, Codex, and custom agents into a unified, self-improving, autonomous operating system for AI-powered development and operations.**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-org/mission-control/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/your-org/mission-control/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-blue.svg)](https://python.org/)
[![PWA](https://img.shields.io/badge/PWA-ready-purple.svg)](https://web.dev/progressive-web-apps/)

---

## 🎯 Mission Control at a Glance

Mission Control transforms how you work with AI agents. Instead of switching between terminals, you get a **unified command center** where multiple specialized agents collaborate through shared memory, skills, schedules, and handoffs — all orchestrated from a premium web interface.

### Why Mission Control?

| Traditional Approach | Mission Control |
|---------------------|-----------------|
| Multiple terminal windows | Single unified dashboard |
| Fragmented context | Shared persistent memory |
| Manual task handoffs | Automated agent coordination |
| No cost visibility | Real-time multi-provider cost tracking |
| One-off tasks | Skills with eval, learning, and versioning |
| Local knowledge only | Semantic search + knowledge graph |

---

## ✨ Features

### 🤖 **Multi-Agent Orchestration**
- **7 Built-in Agents**: opencode, Hermes, Gemini CLI, Claude, OpenClaw, Codex, Jarvis (voice)
- **Shared Memory Layer**: Vector DB + Knowledge Graph for semantic context
- **Agent Handoff Protocol**: Structured task transfer with context preservation
- **Smart Router**: Auto-routes tasks to best-fit agents

### 🧠 **Advanced Memory System**
- **Semantic Search**: Vector embeddings (OpenAI/text-embedding-3-small compatible, local fallback)
- **Knowledge Graph**: Entity extraction, relations, force-directed visualization
- **Context Injection**: Auto-loads relevant memory per task
- **Memory Verification Center**: Health checks, auto-repair, re-indexing
- **Daily Journal**: Templates, tags, entity linking, timeline views

### ⚡ **Skills & Automation**
- **Skill Library**: 6 Collections (SEO Research, Content Creation, Software Eng, Operations, Executive Assistant, Multi-Agent Swarm)
- **Skill Evaluation**: Weighted criteria, score history, automated testing
- **Skill Chaining**: Sequential multi-skill execution with context passing
- **Scheduler**: APScheduler with per-skill agent routing

### 📊 **Analytics & BI**
- **Agent Performance**: Real-time metrics, trends, success rates, response times
- **Cost Analytics**: Multi-provider token tracking, projections, free-tier alerts
- **Unified Timeline**: Chronological browser of all events (skills, handoffs, voice, journal, screen)
- **Learning Analytics**: Skill score trends, eval visualization

### 🎙️ **Voice-First Interface**
- **OMI-style Voice Capture**: Push-to-talk (Space), wake-word ready
- **STT**: OpenRouter Whisper integration with auto-summarization
- **Action Items**: Extracted from voice, saved to journal with checkboxes
- **Jarvis Agent**: Voice-first personal assistant for scheduling, briefings, coordination

### 🎨 **Premium Web Dashboard**
- **Modern Design System**: Glass morphism, fluid animations, reduced-motion support
- **Command Palette**: Fuzzy search (⌘K) for 50+ actions
- **Dockable Panels**: Resizable, collapsible split panes with persistence
- **PWA Ready**: Installable, offline-capable, app shortcuts
- **Responsive**: Works on desktop, tablet, mobile

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
├─────────────────────────────────────────────────────────────┤
│  🎨 Premium Web Dashboard (FastAPI + Vanilla ES6 SPA)       │
│  ├── Command Palette    ├── Dockable Panels                 │
│  ├── Notification Center├── Agent Status Center             │
│  └── Unified Timeline   └── Conversation View               │
├─────────────────────────────────────────────────────────────┤
│  🤖 AGENT EXECUTION ENGINE (7 Agents)                       │
│  ├── opencode   ├── Hermes     ├── Gemini CLI               │
│  ├── Claude     ├── OpenClaw   ├── Codex                    │
│  └── Jarvis (Voice)                                          │
├─────────────────────────────────────────────────────────────┤
│  🧠 SHARED FOUNDATION (via shared_agent_core.py)            │
│  ├── Memory Layer    ├── Skills Layer                       │
│  ├── Tools Layer     ├── Context Layer                      │
│  └── Agent Registry                                          │
├─────────────────────────────────────────────────────────────┤
│  💾 PERSISTENCE LAYER                                        │
│  ├── Vector DB (semantic)  ├── Knowledge Graph               │
│  ├── Brain Files (MD)      ├── Journal (MD)                  │
│  ├── Skills (MD + JSON)    ├── Audit Log (JSONL)            │
│  └── SQLite (Hermes native)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI (Python 3.11+), Uvicorn, APScheduler |
| **Frontend** | Vanilla ES6, Chart.js, CSS Custom Properties |
| **Agents** | CLI-based (opencode, Hermes, Gemini CLI, etc.) |
| **Memory** | JSON-based Vector DB, JSON Knowledge Graph, Markdown |
| **Voice STT** | OpenRouter Whisper API (OpenAI compatible) |
| **Cost Tracking** | OpenRouter + Anthropic + local tracking |
| **PWA** | Service Worker, Manifest, Service Worker |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (3.11+ recommended for best performance)
- **Node.js 18+** (for optional frontend tooling)
- **OpenRouter API Key** (get from [openrouter.ai](https://openrouter.ai))
- **Anthropic API Key** (for Claude agent, optional)
- **Git** (for version control)

### One-Command Install

```bash
# Clone and install
git clone https://github.com/your-org/mission-control.git
cd mission-control
chmod +x install.sh
./install.sh

# Start the server
./start.sh
```

### Manual Installation

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Initialize memory
python -c "from shared_agent_core import AgentRegistry; r = AgentRegistry(Path('.')); print('Initialized', len(r.agents), 'agents')"

# 5. Start server
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

### Docker (Production)

```bash
# Build
docker build -t mission-control .

# Run
docker run -d \
  -p 8765:8765 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/brain:/app/brain \
  -v $(pwd)/.env:/app/.env \
  --name mission-control \
  mission-control
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```ini
# Required
OPENROUTER_API_KEY=sk-or-v1-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for Claude agent

# Optional
AGENTIC_OS_SECRET_KEY=your-secret-key-change-in-production
AGENTIC_OS_ADMIN_PASSWORD=admin123
AGENTIC_OS_PORT=8765
AGENTIC_OS_HOST=127.0.0.1

# Hermes (optional, loads from ~/.hermes/.env automatically)
# OPENROUTER_API_KEY already set above
```

### Agent Configuration

Each agent has a config in `agents/<name>/<name>.json`:

```json
{
  "name": "opencode",
  "model": "test-model",
  "system_prompt": "You are the code generation and DevOps specialist...",
  "allowed_tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
  "max_turns": 50,
  "auto_approve": false
}
```

### Memory Configuration

The memory system auto-configures but can be tuned:

```ini
# Vector DB
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536
VECTOR_MIN_SCORE=0.3

# Knowledge Graph
KG_MAX_RELATIONS=50
KG_ENTITY_TYPES=gcp_service,tech_stack,project

# Journal
JOURNAL_TEMPLATES=daily,standup,retrospective,meeting,research
```

---

## 🎮 Usage

### Dashboard Access

Open http://127.0.0.1:8765 in your browser.

| Page | Description | Shortcut |
|------|-------------|----------|
| **Dashboard** | System overview, agent health, cost summary | ⌘1 |
| **AI Chat** | Multi-agent terminal with context | ⌘2 |
| **Agent Config** | API keys, models, system prompts per agent | ⌘3 |
| **Skill Library** | Browse, search, install, organize skills | ⌘4 |
| **Memory** | Browse brain files, journal, brain files | ⌘5 |
| **Semantic Search** | Vector search across all memory | ⌘6 |
| **Knowledge Graph** | Entity/relation visualization | ⌘7 |
| **Context Injection** | Auto-load context for tasks | ⌘8 |
| **Voice Capture** | Push-to-talk recording (Space) | ⌘9 |
| **Unified Timeline** | Chronological event browser | ⌘0 |
| **Scheduler** | Manage automated jobs | ⌘S |
| **Analytics** | Performance, cost, learning dashboards | ⌘A |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Space` (hold) | Push-to-talk Voice Recording |
| `Esc` | Close Modal / Cancel Recording |
| `⌘N` | New Skill / Task / Journal Entry |
| `⌘/` | Focus Global Search |

### Agent Interaction

```bash
# Direct CLI usage (bypasses dashboard)
opencode run "Refactor the auth module to use dependency injection"
hermes chat -q "Schedule a backup for tomorrow 2am"
gemini -y "Research the latest React 19 features"
```

### Skill Execution

```bash
# Via dashboard
# 1. Go to Skill Library
# 2. Search for "devops-audit"
# 3. Click "Run" → Select agent → Execute

# Via API
curl -X POST http://localhost:8765/api/skills/devops-audit/run \
  -H "X-API-Key: your-key" \
  -d '{"input": "Audit GCP project cloudmart-prod"}'

# Via skill chaining
curl -X POST http://localhost:8765/api/skills/chain \
  -H "X-API-Key: your-key" \
  -d '{"skills": ["research-synthesis", "content-draft"], "initial_input": "Write blog about GCP best practices"}'
```

### Voice Capture

1. Navigate to **Voice Capture** page
2. Hold **Spacebar** to record (push-to-talk)
3. Release to auto-transcribe and summarize
4. Action items extracted → saved to journal with checkboxes
5. Say "Jarvis, schedule standup for tomorrow 9am" → Jarvis agent executes

---

## 📁 Project Structure

```
mission-control/
├── 📁 dashboard/                 # Web frontend (FastAPI static)
│   ├── 📁 pages/                # Page modules (ES6)
│   ├── 📁 icons/                # PWA icons + generator
│   ├── index.html               # SPA entry point
│   ├── styles.css               # Base styles
│   ├── styles-premium.css       # Premium design system
│   ├── app.js                   # Main app logic
│   ├── api.js                   # API client
│   └── utils.js                 # Shared utilities
│
├── 📁 agents/                   # Per-agent configs
│   ├── opencode/
│   ├── hermes/
│   ├── gemini/
│   ├── claude/
│   ├── openclaw/
│   ├── codex/
│   └── jarvis/
│
├── 📁 brain/                    # Shared memory (Markdown)
│   ├── business-brain.md
│   ├── active-projects.md
│   ├── recent-decisions.md
│   ├── constraints.md
│   ├── identity.md
│   ├── constitution.md
│   └── 📁 journal/              # Daily entries (YYYY-MM-DD.md)
│
├── 📁 skills/                   # Skill library
│   ├── 📁 _template/            # Skill template
│   ├── 📁 heartbeat/
│   ├── 📁 devops-audit/
│   ├── 📁 research-synthesis/
│   └── ... (15 skills)
│
├── 📁 data/                     # Runtime data (JSON)
│   ├── agent-routes.json
│   ├── agent-performance.json
│   ├── vector-memory.json
│   ├── knowledge-graph.json
│   ├── agent-stats.json
│   ├── cost-history.json
│   └── unified-timeline.json
│
├── 📁 audit/                    # Audit log (JSONL)
│   └── audit.log
│
├── 📁 scheduler/                # Job definitions
│   ├── scheduler.py
│   └── 📁 jobs/
│
├── 📁 registry/                 # Plugin registry
│   └── plugins.json
│
├── 📁 standards/                # Coding standards
│   ├── index.yml
│   └── 📁 profiles/
│
├── 📁 docs/                     # Documentation
│   └── 📁 images/               # Screenshots for README
│
├── shared_agent_core.py         # 🎯 Shared agent foundation
├── server.py                    # FastAPI backend
├── requirements.txt
├── install.sh                   # One-command installer
├── start.sh                     # Start script
├── backup.sh / restore.sh       # Disaster recovery
└── README.md                    # This file
```

---

## 🔧 Development

### Running in Dev Mode

```bash
# With auto-reload
python -m uvicorn server:app --host 127.0.0.1 --port 8765 --reload

# Frontend changes auto-reload (no build step needed - vanilla ES6)
```

### Adding a New Agent

1. Create `agents/new-agent/new-agent.json`
2. Add CLI command to `server.py` `execute_agent()`
3. Add routing rules to `data/agent-routes.json`
3. Add agent to `shared_agent_core.py` `AgentType` enum
4. Create agent tab in `dashboard/pages/agent-config.js`

### Adding a New Skill

```bash
# 1. Copy template
cp -r skills/_template skills/my-skill

# 2. Edit SKILL.md with metadata
# 3. Implement logic in skill's main file (or use shared executor)
# 4. Add eval.json with criteria
# 5. Test: curl -X POST /api/skills/my-skill/run
```

### Running Tests

```bash
# API tests
python -m pytest tests/ -v

# Specific test
python -c "from shared_agent_core import create_agent_core; c = create_agent_core(Path('.'), AgentType.OPENCODE); print(c.to_dict())"
```

### Code Style

```bash
# Format
black .
isort .

# Lint
ruff check .
mypy shared_agent_core.py server.py
```

---

## 📦 Deployment

### Production Checklist

- [ ] Set `AGENTIC_OS_SECRET_KEY` to strong random value
- [ ] Use strong `AGENTIC_OS_ADMIN_PASSWORD`
- [ ] Configure reverse proxy (nginx/Caddy) with SSL
- [ ] Set up automated backups (`backup.sh` cron)
- [ ] Configure monitoring (health endpoint: `/api/status`)
- [ ] Set up log rotation for `audit/audit.log`
- [ ] Review firewall rules (port 8765 internal only)

### nginx Configuration

```nginx
server {
    listen 80;
    server_name mission-control.yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mission-control.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/mission-control.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mission-control.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Systemd Service

```ini
# /etc/systemd/system/mission-control.service
[Unit]
Description=Mission Control
After=network.target

[Service]
Type=simple
User=mission-control
WorkingDirectory=/opt/mission-control
Environment=PATH=/opt/mission-control/venv/bin
ExecStart=/opt/mission-control/venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8765
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
4. **Open** a Pull Request

### Code Standards

- **Python**: Black (line length 100), isort, ruff, mypy strict
- **JavaScript**: ESLint (Airbnb), Prettier
- **CSS**: CSS Custom Properties, CSS Modules where applicable
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

### Testing Requirements

- All new endpoints must have tests
- Skills must include `eval.json` with criteria
- UI changes must work in both themes
- Accessibility: WCAG 2.1 AA minimum

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---


## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/mission-control/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mission-control/discussions)
- **Security**: security@mission-control.dev
- **Docs**: [Full Documentation](https://docs.mission-control.dev)

---

<div align="center">

**Built with ❤️ for the AI engineering community**

*Mission Control — Your AI agents, unified.*

</div>
