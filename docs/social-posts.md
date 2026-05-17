# Social Media Post Drafts

---

## Reddit — r/selfhosted

**Title**: I built a self-hosted Agent OS that orchestrates opencode, Hermes, and Gemini CLI

**Body**:
I've been using opencode for code, Hermes for memory/scheduling, and Gemini CLI for research — but jumping between terminals got chaotic. So I built a self-hosted dashboard that orchestrates all three.

**Agentic OS** features:
- 3-agent engine with automatic routing (code → opencode, memory → Hermes, research → Gemini)
- 16+ skills with eval scoring and performance tracking
- Cron scheduler (APScheduler) — heartbeat, standup, DevOps audit
- Persistent memory across all agents (SQLite FTS5 + shared brain/ folder)
- Cost analytics with free-tier alerts
- One-click backup/restore (tar.gz snapshots)
- Full audit trail
- Prompt template library (10 templates)
- Dark/light theme

All agents run on free tiers — Gemini Flash, OpenRouter free models, local opencode. No subscription needed.

**GitHub**: https://github.com/modimihir07/agentic-os
**Tech**: FastAPI + vanilla JS SPA, MIT license

Happy to answer questions or take suggestions!

---

## Reddit — r/devops

**Title**: Agentic OS — open-source multi-agent orchestration for DevOps workflows

**Body**:
Spent the last few weeks building an Agent OS that connects opencode (code/DevOps), Hermes (memory/scheduling), and Gemini CLI (research/analysis) into a single dashboard.

Why it matters for DevOps:
- Route tasks to the right agent automatically
- Scheduled cron jobs for infrastructure audits
- Cost tracking across providers (prevent surprise bills)
- 16 skills including DevOps audit, code review, TDD cycle
- Shared memory so agents don't forget context
- Backup/restore for disaster recovery

**GitHub**: https://github.com/modimihir07/agentic-os

Built with FastAPI + vanilla JS. MIT licensed. All free tiers.

---

## Hacker News

**Title**: Agentic OS – Self-hosted multi-agent orchestration platform (FastAPI, MIT)

**Body**:
I built a locally-hosted OS for AI agents that coordinates opencode (code/DevOps), Hermes Agent (memory/scheduling), and Gemini CLI (research/analysis) into one dashboard.

Key features:
- 3-agent engine with automatic routing
- 16+ skills with eval scoring
- APScheduler cron jobs
- Cost analytics with free-tier alerts
- One-click backup/restore
- Full audit trail
- 7-layer architecture (router → business brain → skills hub → memory → scheduler → self-evolution → identity)
- Dark/light theme

Stack: FastAPI + vanilla JS SPA. Zero API costs — runs on free tiers (Gemini Flash, OpenRouter free models, local opencode).

https://github.com/modimihir07/agentic-os

MIT licensed. Feedback welcome!
