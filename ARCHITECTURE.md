# Agentic OS — System Architecture

## Overview
Agentic OS is a multi-agent orchestration platform that coordinates **opencode**, **Hermes Agent**, **Gemini CLI**, and **Claude** into a unified, self-improving, autonomous operating system. The system acts as the "kernel" that routes tasks, manages shared memory, executes skills, tracks costs, schedules workflows, and evolves capabilities over time.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENTIC OS - WEB DASHBOARD                        │
│                         (FastAPI + Vanilla JS SPA)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 3-AGENT EXECUTION ENGINE                          │  │
│  │                                                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────┐  │  │
│  │  │   opencode   │  │    Hermes    │  │ Gemini CLI │  │ Claude │  │  │
│  │  │ (Code/DevOps)│  │(Memory/Sched/│  │(Research/  │  │(Strategy│  │  │
│  │  │  File Ops)   │  │  Channels)   │  │ Analysis)  │  │ /Arch) │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  └────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    7 CORE LAYERS (Stacked)                        │  │
│  │                                                                  │  │
│  │  Layer 7: Identity/Persona/Constitution    (brain/identity.md)   │  │
│  │  Layer 6: Self-Evolution + Capability Manager (skills/*/eval)    │  │
│  │  Layer 5: Scheduler + Awareness + Health Guardian (scheduler/)   │  │
│  │  Layer 4: Memory Graph + Memory Consolidation (brain/ + skills/) │  │
│  │  Layer 3: Skills Hub + Eval + Learnings Loop   (skills/)         │  │
│  │  Layer 2: Business Brain + Context Folders     (brain/ + skills/*)│  │
│  │  Layer 1: Agent Router + Standards + Profiles (agent-routes.json)│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. FastAPI Backend (`server.py`)
- **Port**: 8080 (default)
- **Authentication**: JWT + API Key (X-API-Key header)
- **WebSocket**: Real-time updates at `/ws` for live agent status, skill events, audit events, chat messages
- **Thread Pool**: 4 workers for async CLI execution
- **Endpoints**: 50+ REST endpoints covering all features

### 2. Frontend SPA (`dashboard/`)
- **Architecture**: Vanilla ES6 modules with lazy-loaded pages
- **State**: Local variables + localStorage for theme/persisted UI state
- **Routing**: Hash-based (`#dashboard`, `#skills`, `#chat`, etc.)
- **Real-time**: WebSocket connection with auto-reconnect (exponential backoff)
- **Theme**: Dark/light mode with CSS custom properties
- **Responsive**: Mobile-first, collapsible sidebar

### 3. Agent Layer
| Agent | Integration Method | Primary Role |
|-------|-------------------|--------------|
| **opencode** | CLI (`opencode run --format json`) | Code gen, DevOps, file ops, git, infra |
| **Hermes** | CLI (`hermes chat -q`) | Persistent memory, cron, channels, skills |
| **Gemini CLI** | CLI (`gemini -y -m gemini-2.5-flash`) | Research, web search, multi-modal, analysis |
| **Claude** | Anthropic SDK (direct API) | Strategy, architecture, complex reasoning |

### 4. Memory System (`brain/`)
- **Format**: Markdown files (cross-agent compatible)
- **Files**: `memory.md`, `business-brain.md`, `active-projects.md`, `recent-decisions.md`, `identity.md`, `constitution.md`, `constraints.md`, `journal/`
- **Hermes Native**: SQLite FTS5 for full-text search (external to this repo)
- **Git Versioning**: All brain files tracked in git

### 5. Skills System (`skills/`)
- **Structure**: Modular per-skill directories with:
  - `SKILL.md` — Instructions (YAML frontmatter + markdown body)
  - `learnings.md` — Accumulated run outputs (append-only)
  - `eval.json` — Weighted evaluation criteria
  - `score-history.json` — Historical scores per run
  - `context/` — Ephemeral task inputs
- **Template**: `skills/_template/` for new skill creation
- **Registry**: `registry/plugins.json` for marketplace browsing

### 6. Scheduler (`scheduler/`)
- **Engine**: APScheduler (BackgroundScheduler + CronTrigger)
- **Jobs**: JSON configs in `scheduler/jobs/*.json`
- **Execution**: Runs skills via agent dispatch (currently opencode)
- **Current Jobs**: heartbeat (5min), memory-consolidation (weekly), daily-standup (daily), devops-audit (daily)

### 7. Data Layer (`data/`)
- `agent-routes.json` — Routing rules + agent capabilities + handoff protocol
- `chat-history.json` — Persistent chat messages (last 200)
- `cost-history.json` — Token usage, costs, daily totals, free-tier alerts
- `goals.json` — Goal tracking with progress, categories, target dates
- `kanban/*.json` — Per-task files for Kanban board
- `settings.json` — User preferences

---

## Data Flow

### Skill Execution Flow
```
User Request (Dashboard/API)
       │
       ▼
/api/skills/{name}/run
       │
       ▼
Read SKILL.md + learnings.md + user input
       │
       ▼
Agent Selection (auto-detect or explicit)
       │
       ▼
execute_agent(agent, prompt)
       │
       ├─► opencode: CLI JSON stream → parse text events
       ├─► hermes: CLI chat -q → clean output boxes
       ├─► gemini: CLI → multi-attempt with fallback models
       └─► claude: Anthropic SDK → direct API call
       │
       ▼
Response → Broadcast WS event → Save to learnings.md → Append audit.log
```

### Chat Flow
```
User Message (Chat UI)
       │
       ▼
POST /api/chat {agent, message}
       │
       ▼
Save user msg → Broadcast WS chat_message
       │
       ▼
execute_agent(agent, message)
       │
       ▼
Save assistant msg → Broadcast WS chat_message → Append audit.log
       │
       ▼
Return response to UI
```

### Scheduler Flow
```
Cron Trigger (APScheduler)
       │
       ▼
run_skill(skill_name)
       │
       ▼
Append audit.log (scheduler_run)
       │
       ▼
execute_agent("opencode", skill_prompt)  [Hardcoded to opencode currently]
       │
       ▼
No learnings/audit update from scheduler (gap)
```

---

## Agent Routing Logic

### Primary Routing (`data/agent-routes.json`)
```json
{
  "routing_rules": [
    {"pattern": "code|devops|deploy|git|terraform|k8s|gcp", "target": "opencode", "priority": 10},
    {"pattern": "memory|schedule|cron|telegram|discord|channel", "target": "hermes", "priority": 10},
    {"pattern": "research|analyze|search|summarize|compare", "target": "gemini", "priority": 10},
    {"pattern": ".*", "target": "opencode", "priority": 0}  // Fallback
  ]
}
```

### Skill-Level Routing (`server.py`)
- DevOps keywords → opencode
- Research keywords → gemini
- SKILL.md "Primary:" field → explicit agent
- Default → opencode

### Smart Router (`/api/router/suggest`)
- Keyword scoring across 4 agents (opencode, hermes, gemini, claude)
- Returns suggested agent + confidence (high/medium/low)

---

## Handoff Protocol
```json
{
  "from_agent": "string",
  "to_agent": "string", 
  "task_id": "string",
  "context_summary": "string",
  "pending_decisions": "string[]",
  "output_files": "string[]",
  "status": "pending|in_progress|completed|failed"
}
```
- **Status**: Enabled in config, but no active implementation in skills/dashboard
- **Use Case**: Chain: Gemini researches → opencode implements → Hermes monitors

---

## Authentication & Security

| Layer | Mechanism |
|-------|-----------|
| **API** | JWT (7-day expiry) + API Keys (dev key by default) |
| **Passwords** | SHA256 (dev) — should be bcrypt in production |
| **Secrets** | Loaded from `~/.hermes/.env` (OpenRouter API key) |
| **CORS** | Restricted to localhost:8080 |
| **Audit Trail** | Every action logged to `audit/audit.log` (JSONL) |

---

## Deployment Topology

```
┌─────────────────┐     ┌─────────────────┐
│   Browser       │────►│  FastAPI :8080  │
│  (localhost)    │◄────│  + WebSocket    │
└─────────────────┘     └────────┬────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │  opencode   │        │   Hermes    │        │ Gemini CLI  │
   │   CLI/API   │        │   CLI/API   │        │   CLI/API   │
   └─────────────┘        └─────────────┘        └─────────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 ▼
                    ┌────────────────────────────┐
                    │     Shared Filesystem      │
                    │  brain/  skills/  data/    │
                    │  audit/  backups/ registry │
                    └────────────────────────────┘
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Markdown for memory** | Cross-agent compatibility, git-diffable, human-readable |
| **File-based skills** | No database needed, version-controlled, portable |
| **FastAPI + Vanilla JS** | Zero build step, minimal dependencies, fast load times |
| **CLI-based agent integration** | No vendor lock-in, agents independently runnable |
| **WebSocket for real-time** | Live dashboard updates without polling overhead |
| **Git auto-versioning** | Full rollback history for brain/skills/config |
| **Free-tier first** | Cost analytics monitor limits, suggest downgrades |

---

## Integration Points

| External System | Integration Method |
|----------------|-------------------|
| **OpenRouter** | Hermes CLI uses `OPENROUTER_API_KEY` from `~/.hermes/.env` |
| **Anthropic** | `ANTHROPIC_API_KEY` env var for Claude agent |
| **Google OAuth** | Gemini CLI reads `~/.gemini/oauth_creds.json` |
| **Git** | Native via opencode / shell commands |
| **GitHub** | Via opencode git operations or future skills |

---

## Known Architectural Constraints

1. **Single-threaded scheduler** — Runs one skill at a time, no parallel job execution
2. **Hardcoded opencode for scheduler** — `scheduler.py` always uses opencode
3. **No skill chaining in scheduler** — Cannot sequence skills automatically
4. **No Agent Health persistence** — Stats are mocked (always 100%/0)
5. **Handoff protocol defined but unused** — No skills implement it
6. **Memory consolidation skill exists but scheduler runs opencode** — Should use Hermes for memory tasks
7. **WebSocket auth not enforced** — Connections bypass API key/JWT validation
