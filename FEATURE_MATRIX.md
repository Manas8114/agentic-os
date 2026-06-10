# Agentic OS — Feature Matrix

## Legend
| Status | Meaning |
|--------|---------|
| ✅ **Complete** | Fully implemented, tested, documented |
| 🟡 **Partial** | Core works, missing some features/polish |
| 🔄 **Stubbed** | API endpoints exist, minimal/no UI implementation |
| ❌ **Missing** | Not implemented at all |
| 📋 **Planned** | Designed in AGENTS.md, not started |

---

## Core Infrastructure (v1.0.0)

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| FastAPI Backend | ✅ | `server.py` | 1625 lines, 50+ endpoints |
| WebSocket Real-time | ✅ | `server.py` + `app.js` | Auto-reconnect, 5 message types |
| Authentication (JWT + API Key) | ✅ | `server.py` | SHA256 passwords, dev defaults |
| Vanilla JS SPA Dashboard | ✅ | `dashboard/` | Lazy-loaded pages, hash routing |
| Dark/Light Theme | ✅ | `styles.css` | CSS custom properties |
| Responsive Design | ✅ | `styles.css` | Collapsible sidebar, mobile |
| One-Command Install | ✅ | `install.sh` | Detects OS, installs deps, init git |
| Git Auto-Versioning | 🟡 | Via scripts | Brain/skills tracked, auto-commit TODO |

---

## 3-Agent Execution Engine

| Agent | Integration | Status | Capabilities Implemented |
|-------|-------------|--------|-------------------------|
| **opencode** | CLI `opencode run --format json` | ✅ | Code gen, file ops, git, DevOps, infra |
| **Hermes Agent** | CLI `hermes chat -q` | ✅ | Memory, scheduling, channels, skills |
| **Gemini CLI** | CLI `gemini -y -m gemini-2.5-flash` | ✅ | Web search, research, multi-modal |
| **Claude** | Anthropic SDK | ✅ | Strategy, architecture, reasoning |

### Agent Routing & Coordination

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Keyword-based Routing | ✅ | `data/agent-routes.json` | 4 rules + fallback |
| Skill-level Auto-detect | ✅ | `server.py:440-457` | Devops/Research keywords |
| SKILL.md Primary Field | ✅ | `server.py:449-455` | Explicit agent assignment |
| Smart Router Suggest | ✅ | `/api/router/suggest` | Keyword scoring + confidence |
| Smart Router Route | ✅ | `/api/router/route` | Manual agent selection |
| Handoff Protocol Spec | ✅ | `data/agent-routes.json` | Defined but **unused** |
| Multi-agent Chain | ❌ | — | Gemini→opencode→Hermes not implemented |

---

## Memory System

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Brain Markdown Files | ✅ | `brain/*.md` | 7 core files + journal/ |
| Business Brain | ✅ | `brain/business-brain.md` | Priorities, brand, decisions |
| Active Projects | ✅ | `brain/active-projects.md` | Auto-synced from goals |
| Recent Decisions | ✅ | `brain/recent-decisions.md` | Audit-driven |
| Identity/Persona | ✅ | `brain/identity.md` | Agent OS kernel persona |
| Constitution | ✅ | `brain/constitution.md` | 6 principles + prohibitions |
| Constraints | ✅ | `brain/constraints.md` | Empty template |
| Daily Journal | ✅ | `brain/journal/YYYY-MM-DD.md` | 4 API endpoints + UI |
| Journal Search | ✅ | `/api/journal/search` | Full-text grep |
| Hermes SQLite FTS5 | 📋 | External | Native Hermes feature, not in this repo |
| Obsidian Compatibility | ✅ | Markdown format | Links, tags, frontmatter ready |
| Knowledge Graph | ❌ | — | Not implemented |
| Semantic Search | ❌ | — | Only grep-based journal search |
| Memory Consolidation Skill | ✅ | `skills/memory-consolidation/` | Weekly synthesis, eval tracked |
| Auto Memory Creation | ❌ | — | Manual only |
| Context Injection | 🟡 | Skills read brain/ | No automatic injection into agents |

---

## Skills Hub

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Modular Skill Structure | ✅ | `skills/*/` | 15 built-in skills |
| SKILL.md + learnings + eval | ✅ | Template enforced | `_template/` |
| Skill Registry/Marketplace | ✅ | `registry/plugins.json` | 15 plugins listed |
| Skill Grid/List Views | ✅ | `skills.js` | Filter, badges, scores |
| Skill Detail View | ✅ | `skills.js` | Inline modal with tabs |
| One-Click Run | ✅ | `skills.js` + `dashboard.js` | Agent selection modal |
| Eval Scoring System | ✅ | `eval.json` per skill | Weighted criteria |
| Score History Tracking | ✅ | `score-history.json` | Per-run accumulation |
| Performance Badges | ✅ | `skills.js` | Green/Yellow/Red badges |
| Context Folders | ✅ | `skills/*/context/` | Per-skill ephemeral inputs |
| Skill Chaining Protocol | 📋 | `AGENTS.md:F11` | Defined, not implemented |
| Custom Skill Creation | 🟡 | `_template/` | Manual dir creation, no wizard |
| Plugin Install (marketplace) | 🟡 | `/api/plugins/install` | Adds to registry only, no download |
| Skill Dependencies | ❌ | — | Not tracked |

### Built-in Skills (15)

| Skill | Category | Eval | Learnings | Primary Agent |
|-------|----------|------|-----------|---------------|
| heartbeat | Monitoring | ✅ | ✅ | opencode |
| devops-audit | DevOps | ✅ | ✅ | opencode |
| content-draft | Content | ✅ | ✅ | opencode |
| code-review | Code Quality | ✅ | ✅ | opencode |
| research-synthesis | Research | ✅ | ✅ | gemini |
| daily-standup | Workflow | ✅ | ✅ | opencode |
| meeting-minutes | Workflow | ✅ | ✅ | opencode |
| project-planner | Planning | ✅ | ✅ | opencode |
| brainstorming | Creative | ✅ | ✅ | opencode |
| systematic-debug | Debugging | ✅ | ✅ | opencode |
| memory-consolidation | Memory | ✅ | ✅ | opencode* |
| backup-skill | Backup | ✅ | ✅ | opencode |
| cost-analytics | Analytics | ✅ | ✅ | opencode |
| tdd-cycle | Development | ✅ | ✅ | opencode |
| goal-planner | Planning | ✅ | ✅ | opencode |

*Should use Hermes for memory tasks

---

## Scheduler

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| APScheduler Engine | ✅ | `scheduler/scheduler.py` | BackgroundScheduler |
| Cron Job Definitions | ✅ | `scheduler/jobs/*.json` | 4 jobs configured |
| Dashboard Job Management | ✅ | `scheduler.js` + API | List, create, delete |
| Job Enable/Disable | ✅ | JSON `enabled` field | Toggle in UI |
| Heartbeat Job (5min) | ✅ | `heartbeat-job.json` | Runs heartbeat skill |
| Memory Consolidation (weekly) | ✅ | `memory-consolidation-job.json` | Runs memory-consolidation |
| Daily Standup (daily) | ✅ | `daily-standup-job.json` | Runs daily-standup |
| DevOps Audit (daily) | ✅ | `devops-audit-job.json` | Runs devops-audit |
| Parallel Job Execution | ❌ | — | Sequential only |
| Skill Chaining in Jobs | ❌ | — | Single skill per job |
| Job History/Logs | 🟡 | Audit log only | No dedicated job run history |
| Event Hooks (pre/post) | 📋 | `AGENTS.md:F35` | Defined, not implemented |

---

## Dashboard Pages (16 pages)

| Page | Status | Key Features |
|------|--------|--------------|
| Dashboard | ✅ | Stats cards, agent status, recent activity, quick run |
| AI Chat | ✅ | 4 agents, sidebar, history, typing indicator, quick prompts |
| Skills Hub | ✅ | Grid/list, filter, detail view, run modal, scores |
| Memory | ✅ | File list, inline edit modal, line counts |
| Scheduler | ✅ | Job list, create/edit/delete, cron syntax help |
| Audit Log | ✅ | Paginated table, action filter, search |
| Kanban Board | ✅ | Drag-drop, filters, detail modal, comments, links |
| Goals | ✅ | Progress bars, +25% buttons, categories, auto-sync |
| Journal | ✅ | Calendar list, editor, search, markdown preview |
| Agent Health | ✅ | 4-agent cards, auto-refresh (5s), system status |
| Smart Router | ✅ | Task input, suggest/route, confidence scoring |
| Learning Analytics | 🟡 | Skill scores table, trend charts (stub) |
| Session Replay | 🟡 | Opencode log parsing, message extraction (basic) |
| Cost Analytics | ✅ | Charts (doughnut/line), daily totals, free-tier alerts |
| Plugins/Marketplace | 🟡 | Registry list, install button (stub) |
| Prompts Library | ✅ | 10 templates, view modal |
| Standards | 🟡 | Index + file list, discover stub |
| Backups | ✅ | List, create, restore, tar.gz snapshots |
| Settings | ✅ | Theme, API key gen, password change |
| Setup Wizard | 🟡 | Guided setup steps (stub) |

---

## Kanban Board (v0.2.0)

| Feature | Status | Endpoint |
|---------|--------|----------|
| Full Board (columns + tasks) | ✅ | `GET /api/kanban/board` |
| Task CRUD | ✅ | `POST/PATCH/GET /api/kanban/tasks` |
| Drag-Drop Status Change | ✅ | `PATCH /api/kanban/tasks/{id}` |
| Complete/Block/Unblock | ✅ | `POST /complete, /block, /unblock` |
| Comments | ✅ | `POST /comments` |
| Task Links (parent/child) | ✅ | `POST/DELETE /api/kanban/links` |
| Dispatch Triage | ✅ | `POST /api/kanban/dispatch` |
| Specify (triage→todo) | ✅ | `POST /api/kanban/tasks/{id}/specify` |
| Decompose (subtasks) | ✅ | `POST /api/kanban/tasks/{id}/decompose` |
| Filter (text/priority/category) | ✅ | Client-side |
| Category/Priority/Assignee | ✅ | Full task model |
| Target Dates | ✅ | UI + model |

---

## Goals & Planning (v0.2.0)

| Feature | Status | Endpoint |
|---------|--------|----------|
| Goal CRUD | ✅ | `GET/POST/PUT/DELETE /api/goals` |
| Progress Tracking (0-100%) | ✅ | Visual progress bars |
| Categories | ✅ | general, dev, study, devops, personal |
| Target Dates | ✅ | Date picker + display |
| Status (active/completed/archived) | ✅ | Badge + auto-complete at 100% |
| Auto-sync to active-projects.md | ✅ | On create |
| Metrics Dashboard | ✅ | Total/Active/Complete/Avg Progress |

---

## Cost Analytics

| Feature | Status | Location |
|---------|--------|----------|
| Token Usage Tracking | ✅ | `data/cost-history.json` |
| Cost Calculation | ✅ | Per-entry + daily totals |
| Monthly Projection | ✅ | Computed in API |
| Free-Tier Alerts | ✅ | Threshold-based warnings |
| Agent Breakdown Chart | ✅ | Doughnut (Chart.js) |
| Time Series Chart | ✅ | Line chart (Chart.js) |
| Manual Entry Recording | ✅ | Modal form + API |
| Cost per Skill/Run | ❌ | Not linked to skill runs |

---

## Backup & Disaster Recovery

| Feature | Status | Location |
|---------|--------|----------|
| Tar.gz Snapshots | ✅ | `POST /api/backup` |
| Selective Dir Backup | ✅ | brain, skills, agents, registry, standards, prompts |
| Restore from Backup | ✅ | `POST /api/backup/restore` |
| Backup List + Sizes | ✅ | `GET /api/backups` |
| Manual Scripts | ✅ | `backup.sh`, `restore.sh` |
| Automated Scheduled Backup | ❌ | No cron job |
| Incremental/Differential | ❌ | Full snapshots only |
| Cloud Sync | ❌ | Local only |

---

## Prompt Templates (10)

| Template | Status | Use Case |
|----------|--------|----------|
| system-audit.md | ✅ | Infrastructure review |
| project-plan.md | ✅ | Implementation planning |
| research-topic.md | ✅ | Deep research |
| standup-email.md | ✅ | Daily standup email |
| debug-incident.md | ✅ | Incident debugging |
| draft-blog.md | ✅ | Blog writing |
| meeting-notes.md | ✅ | Meeting processing |
| code-review.md | ✅ | PR review |
| daily-standup.md | ✅ | Morning briefing |
| brainstorm-session.md | ✅ | Ideation |

---

## Standards System

| Feature | Status | Location |
|---------|--------|----------|
| Standards Index | ✅ | `standards/index.yml` |
| API Response Format | ✅ | `standards/api-response-format.md` |
| Naming Conventions | ✅ | `standards/naming-conventions.md` |
| Profiles System | ✅ | `standards/profiles/default/config.yml` |
| Discover Standards (code scan) | 🟡 | `POST /api/standards/discover` (stub) |
| Inject Standards | ❌ | Not implemented |
| Standards Versioning | ❌ | Not tracked |

---

## Audit & Observability

| Feature | Status | Location |
|---------|--------|----------|
| JSONL Audit Log | ✅ | `audit/audit.log` |
| WebSocket Broadcast | ✅ | Real-time to dashboard |
| Structured Entries | ✅ | action, skill, agent, run_id, timestamp |
| Dashboard Audit Page | ✅ | Table + filter + search |
| Skill Execution Events | ✅ | started/completed/failed WS events |
| Cost Recording Events | ✅ | Via API |

---

## Voice & Channels (Hermes Native)

| Feature | Status | Notes |
|---------|--------|-------|
| Voice Mode | 📋 | Hermes native, not in this repo |
| Telegram Bot | 📋 | Hermes native |
| Discord Bot | 📋 | Hermes native |
| Email | 📋 | Hermes native |
| Webhooks | 📋 | Hermes native |
| Browser Automation | 📋 | Hermes native browser-use skill |

---

## Mission Control Target Features (From User Requirements)

| Feature Area | Current Status | Gap |
|--------------|----------------|-----|
| **6 Agents** (Claude, Codex, Antigravity, OpenClaw, Hermes, Jarvis) | 4 agents (opencode, Hermes, Gemini, Claude) | Missing: Codex, Antigravity, OpenClaw, Jarvis |
| **Mission Control Dashboard** | ✅ Partial | No dockable panels, no command palette, no unified agent status center |
| **Agent Control Rooms** | 🟡 Chat page only | No per-agent config UI, API key mgmt, model selection per agent |
| **Obsidian Memory Layer** | 🟡 Markdown only | No semantic search, knowledge graph, context injection |
| **OMI-style Continuous Memory** | ❌ | No voice capture, screen activity, timeline view |
| **Goals & OKRs** | ✅ Goals | No Key Results, no revenue goals, no weekly reviews |
| **Studio Module** | ❌ | No prompt mgmt, asset library, image/video/voice gen |
| **Video Generator** | ❌ | No script gen, storyboarding, avatars, render queue |
| **Analytics BI** | 🟡 Cost only | No session/agent/tool/token/productivity/goal metrics |
| **Automation Pipeline** | 🟡 Scheduler only | No intake (webhooks/voice/email), decision layer, delivery layer |
| **Jarvis Voice Assistant** | ❌ | Not implemented |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total API Endpoints** | 50+ |
| **Dashboard Pages** | 21 (16 main + 5 v0.2.0) |
| **Built-in Skills** | 15 |
| **Scheduled Jobs** | 4 |
| **Prompt Templates** | 10 |
| **Brain Files** | 7 core + journal |
| **Agent Types** | 4 integrated |
| **WebSocket Message Types** | 5 |
| **Lines of Python (server.py)** | 1,625 |
| **Lines of CSS** | 1,365 |
| **Lines of JS (dashboard/)** | ~3,000 |

---

## Completion Status by Layer

| Layer | Features | Complete | Partial | Missing |
|-------|----------|----------|---------|---------|
| **Layer 1: Router/Standards/Profiles** | 8 | 5 | 2 | 1 |
| **Layer 2: Business Brain/Context** | 7 | 5 | 2 | 0 |
| **Layer 3: Skills Hub/Eval/Learnings** | 10 | 8 | 2 | 0 |
| **Layer 4: Memory Graph/Consolidation** | 8 | 4 | 2 | 2 |
| **Layer 5: Scheduler/Awareness/Health** | 9 | 5 | 2 | 2 |
| **Layer 6: Self-Evolution/Capabilities** | 5 | 2 | 2 | 1 |
| **Layer 7: Identity/Constitution** | 4 | 4 | 0 | 0 |
| **Dashboard/UI** | 21 | 15 | 4 | 2 |
| **Mission Control Target** | 11 | 0 | 2 | 9 |
