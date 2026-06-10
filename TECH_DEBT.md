# Agentic OS — Technical Debt Register

## Legend
| Severity | Definition |
|----------|------------|
| 🔴 **Critical** | Production risk, data loss, security issue |
| 🟠 **High** | Major functionality gap, frequent user impact |
| 🟡 **Medium** | Code quality, maintainability, missing features |
| 🟢 **Low** | Polish, nice-to-have, minor inconsistencies |

---

## Critical (🔴)

| ID | Issue | Location | Impact | Effort | Status |
|----|-------|----------|--------|--------|--------|
| TD-001 | **WebSocket bypasses authentication** | `server.py` WS handler | Any client can connect to `/ws` and receive real-time events without auth | 2h | ✅ **FIXED** - Added token/api_key to WS URL in app.js |
| TD-002 | **Password hashing uses SHA256 (not bcrypt)** | `server.py:59-63` | Dev default only, but if deployed without env override, credentials vulnerable | 1h | ✅ **FIXED** - Now uses bcrypt with SHA256 fallback |
| TD-003 | **No input validation on file paths** | `server.py` brain/update, backup/restore | Path traversal possible via `../../etc/passwd` in file_name param | 2h | ✅ **FIXED** - Added validate_safe_path() helper |
| TD-004 | **Scheduler hardcodes opencode for all skills** | `scheduler.py:19` | Memory skills run via opencode instead of Hermes; breaks agent routing design | 1h | ✅ **FIXED** - Now uses routing rules from agent-routes.json |

---

## High (🟠)

| ID | Issue | Location | Impact | Effort | Status |
|----|-------|----------|--------|--------|--------|
| TD-005 | **Handoff protocol defined but completely unused** | `data/agent-routes.json`, skills | Multi-agent chains (Gemini→opencode→Hermes) cannot work; core architecture feature dead | 4h | |
| TD-006 | **No git auto-commit after brain/skill changes** | `server.py` brain update, skill run | Manual git commits required; audit trail incomplete without version history | 2h | ✅ **FIXED** - Added git_auto_commit() to brain update, skill run, settings, backup restore |
| TD-007 | **Agent health stats are mocked (always 100%/0)** | `server.py:1335-1343` | Agent Health dashboard shows fake data; no real reliability tracking | 3h | |
| TD-008 | **Learning Analytics page is stubbed** | `learning-analytics.js` | Shows "Coming Soon" — no skill score visualization despite data existing | 2h |
| TD-009 | **Session Replay page has basic log parsing only** | `session-replay.js`, `server.py:1478` | Only extracts lines with "user:" or "assistant:" — no proper message rendering | 3h |
| TD-010 | **Setup Wizard page is stubbed** | `setup-wizard.js` | Empty page — no guided onboarding for new users | 2h |
| TD-011 | **No skill chaining in scheduler** | `scheduler.py`, `scheduler/jobs/*.json` | Cannot sequence skills (e.g., research → plan → execute) automatically | 3h |
| TD-012 | **WebSocket connection not authenticated** | `app.js:71-102` | Same as TD-001 but client-side — no token passed on WS connect | 1h |
| TD-013 | **Cost analytics not linked to skill runs** | `server.py:493-511`, `cost-analytics skill` | Skill executions don't auto-record token/cost data | 2h |
| TD-014 | **Scheduler doesn't update learnings/audit on skill completion** | `scheduler.py:19-29` | Scheduled runs invisible in skill learnings & audit trail | 1h |
| TD-015 | **Claude agent not in agent status check** | `server.py:336-340` (check_agent) | `check_agent("claude")` only checks API key, not CLI; status often wrong | 1h |

---

## Medium (🟡)

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| TD-016 | **Server.py is 1,625 lines — should be modular** | `server.py` | Single file monolith; hard to navigate, test, review | 8h |
| TD-017 | **No automated tests (unit/integration)** | — | No CI, no regression protection | 16h |
| TD-018 | **Dashboard JS has no module bundler** | `dashboard/` | 3000+ lines in individual files; no tree-shaking, no TypeScript | 8h |
| TD-019 | **API error handling inconsistent** | `server.py` | Some endpoints return `{"error":...}`, others raise HTTPException | 4h |
| TD-020 | **No request/response logging middleware** | `server.py` | Hard to debug production issues | 2h |
| TD-021 | **CORS hardcoded to localhost:8080** | `server.py:41-43` | Cannot deploy behind proxy or different port without code change | 1h |
| TD-022 | **Secret key has dev default** | `server.py:54` | If deployed without `AGENTIC_OS_SECRET_KEY`, JWTs are predictable | 1h |
| TD-023 | **API keys stored in memory set (not persistent)** | `server.py:74-80` | Restart loses generated API keys | 1h |
| TD-024 | **No rate limiting on API endpoints** | `server.py` | DoS risk, especially `/api/chat`, `/api/skills/*/run` | 2h |
| TD-025 | **Skill run timeout not configurable** | `server.py:479` | Hardcoded to agent defaults (30-180s) | 1h |
| TD-026 | **No pagination on large list endpoints** | `server.py:388, 572, 1007` | `/api/skills`, `/api/audit`, `/api/kanban/board` return all | 2h |
| TD-027 | **Dashboard components not reusable** | `dashboard/pages/*.js` | Duplicate toast, modal, loading, table rendering code | 8h |
| TD-028 | **No TypeScript / type safety in frontend** | `dashboard/` | Runtime bugs from typos, no IDE autocomplete | 8h |
| TD-029 | **Chart.js instances not disposed on page unload** | `cost.js`, `learning-analytics.js` | Memory leaks on navigation | 2h |
| TD-030 | **Global search only filters skills** | `app.js:79`, `skills.js` | Doesn't search memory, audit, kanban, goals, journal | 2h |
| TD-031 | **Agent routing regex patterns case-sensitive** | `data/agent-routes.json` | "Deploy" vs "deploy" routes differently | 1h |
| TD-032 | **No skill dependency resolution** | `skills/` | Skills can't declare/require other skills | 3h |
| TD-033 | **Plugin install only adds to registry** | `server.py:614-630` | Doesn't download/extract skill files | 2h |
| TD-034 | **Standards discover is stub** | `server.py:716-720` | Returns "started" but does nothing | 2h |
| TD-035 | **Journal search is grep-only (slow at scale)** | `server.py:1298-1309` | O(n) scan of all files | 2h |
| TD-036 | **Kanban task links stored redundantly** | `server.py:1121-1147` | Parent and child both store link; sync issues possible | 2h |
| TD-037 | **No backup retention policy** | `backups/`, `server.py:646-668` | Unlimited accumulation, no auto-cleanup | 1h |
| TD-038 | **Cost projection algorithm simplistic** | `server.py:583-603` | Linear extrapolation, ignores free tier resets | 2h |
| TD-039 | **No OpenAPI/Swagger docs** | `server.py` | API consumers must read source | 2h |
| TD-040 | **Hardcoded skill list in Quick Run modal** | `dashboard.js:118-127` | Fetches from API but could cache | 1h |

---

## Low (🟢)

| ID | Issue | Location | Impact | Effort |
|----|-------|----------|--------|--------|
| TD-041 | **Sidebar toggle icon doesn't rotate when collapsed** | `styles.css:139` | UX polish | 0.5h |
| TD-042 | **Stat card hover animation could be smoother** | `styles.css:277-287` | Visual polish | 0.5h |
| TD-043 | **Empty states use different icons/styles** | Various pages | Inconsistent | 1h |
| TD-044 | **No keyboard shortcuts help overlay** | `dashboard/` | Power user feature missing | 2h |
| TD-045 | **Toast position fixed bottom-right** | `styles.css:465` | Not configurable | 0.5h |
| TD-046 | **Modal backdrop click closes (intentional?)** | `styles.css:492` | UX decision undocumented | 0.5h |
| TD-047 | **Page title breadcrumb not clickable** | `app.js:44-45` | No navigation to parent | 0.5h |
| TD-048 | **Agent status bar dot animation differs by status** | `styles.css:185-192` | Warning pulse different from online | 0.5h |
| TD-049 | **Some CSS custom properties unused** | `styles.css:1-34` | Dead code | 0.5h |
| TD-050 | **No favicon SVG in repo (referenced in HTML)** | `dashboard/index.html:7` | 404 on load | 0.5h |

---

## Architectural Debt

| ID | Issue | Description | Effort |
|----|-------|-------------|--------|
| AD-001 | **Monolithic server.py** | Split into: routes/, services/, models/, middleware/ | 16h |
| AD-002 | **No dependency injection** | Services (auth, audit, agent exec) instantiated globally | 8h |
| AD-003 | **Tight coupling: scheduler → opencode** | Should use agent router like skills do | 4h |
| AD-004 | **No plugin system for dashboard pages** | Pages registered in index.html + app.js PAGE_TITLES | 8h |
| AD-005 | **Agent execution logic duplicated** | Chat, Skills, Scheduler all call execute_agent differently | 4h |
| AD-006 | **File-based storage no abstraction** | Direct Path.read/write everywhere — hard to swap to DB | 8h |
| AD-007 | **No event bus / message queue** | WS broadcast used for everything — no persistence, replay | 16h |
| AD-008 | **Configuration scattered** | .env, data/settings.json, standards/profiles/, agents/*/config | 4h |

---

## Security Debt

| ID | Issue | Severity | Remediation |
|----|-------|----------|-------------|
| SD-001 | SHA256 password hashing | 🔴 | Migrate to bcrypt |
| SD-002 | Path traversal in file endpoints | 🔴 | Validate/normalize paths |
| SD-003 | Dev secret key default | 🟠 | Require env var in production |
| SD-004 | No rate limiting | 🟠 | Add slowapi or similar |
| SD-005 | CORS too permissive for prod | 🟡 | Config via env |
| SD-006 | API keys in memory only | 🟡 | Persist to encrypted file |
| SD-007 | No audit log integrity (append-only) | 🟡 | Hash chaining or WORM storage |
| SD-008 | WebSocket unauthenticated | 🔴 | Require token on connect |

---

## Performance Debt

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| PD-001 | No pagination on list endpoints | `server.py` | OOM risk with large datasets |
| PD-002 | Journal search scans all files | `server.py:1305` | Linear time, slow at 1000+ entries |
| PD-003 | Chart.js not disposed | `cost.js:93, 107` | Memory leak on page nav |
| PD-004 | Skills list reads all files on every request | `server.py:388-410` | No caching |
| PD-005 | WebSocket broadcasts to all connections | `app.py:264-276` | O(n) per event, no rooms/topics |
| PD-006 | No static file caching headers | FastAPI StaticFiles | Dashboard assets re-fetched |

---

## Resolved (for tracking)

| ID | Issue | Resolved | How |
|----|-------|----------|-----|
| TD-001 | WebSocket auth bypass | 2026-06-09 | Added getAuthToken() and buildWSUrl() in app.js; passes JWT or dev API key as query param |
| TD-002 | SHA256 password hashing | 2026-06-09 | Switched to bcrypt via passlib with SHA256 fallback; added to requirements.txt |
| TD-003 | Path traversal in file endpoints | 2026-06-09 | Added validate_safe_path() helper; applied to brain GET/PUT and backup restore |
| TD-004 | Scheduler hardcodes opencode | 2026-06-09 | Rewrote scheduler.py to load routing rules from agent-routes.json and skill SKILL.md |
| TD-006 | No git auto-commit | 2026-06-09 | Added git_auto_commit() helper; hooked into brain update, skill run (learnings.md), settings update, backup restore |

---

## Debt Summary by Category

| Category | Critical | High | Medium | Low | Total | Resolved |
|----------|----------|------|--------|-----|-------|----------|
| **Functional** | 1 | 7 | 5 | 0 | 13 | 1 |
| **Security** | 3 | 1 | 3 | 1 | 8 | 4 |
| **Architecture** | 0 | 0 | 8 | 0 | 8 | 0 |
| **Performance** | 0 | 0 | 2 | 4 | 6 | 0 |
| **Code Quality** | 0 | 0 | 5 | 4 | 9 | 0 |
| **Testing** | 0 | 0 | 1 | 0 | 1 | 0 |
| **TOTAL** | **4** | **8** | **24** | **9** | **45** | **5** |

---

## Recommended Paydown Order

1. **Week 1**: TD-001, TD-002, TD-003, TD-004, TD-005 (Security + Core routing)
2. **Week 2**: TD-006, TD-007, TD-008, TD-009, TD-010 (Dashboard completeness)
3. **Week 3**: TD-011, TD-013, TD-014, TD-015 (Scheduler + Agent health)
4. **Week 4**: AD-001, AD-003, AD-005 (Architecture modularization)
5. **Ongoing**: TD-017 (Tests), TD-018 (TS migration), TD-027 (Component library)

---

## Debt Prevention Rules (Going Forward)

1. **No new endpoints without tests**
2. **No new dashboard pages without TypeScript**
3. **All file operations through storage service (not direct Path)**
4. **All auth-protected endpoints must validate on WebSocket too**
5. **Skill runs must record cost + update learnings + audit (enforced in base class)**
6. **PRs > 300 lines require architecture review**
7. **New features must update FEATURE_MATRIX.md and ARCHITECTURE.md**