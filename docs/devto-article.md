---
title: I Built an Open-Source Agent OS — Here's the Architecture
published: false
description: "How I built Agentic OS: a locally-hosted multi-agent orchestration platform that coordinates opencode, Hermes Agent, and Gemini CLI into one dashboard with 16+ skills, cron scheduler, cost analytics, and persistent memory. Full architecture breakdown."
tags: [agents, devops, opensource, python, fastapi]
cover_image: https://raw.githubusercontent.com/modimihir07/agentic-os/main/docs/og-image.png
---

# I Built an Open-Source Agent OS — Here's the Architecture

Most AI agent tools work in isolation. You have a terminal for coding, a separate chat for research, another dashboard for monitoring, and yet another tool for memory. Each one is powerful alone, but together? Chaos.

That's why I built **Agentic OS** — a locally-hosted operating system for AI agents that coordinates three agents (opencode, Hermes Agent, and Gemini CLI) into one unified dashboard.

![Agentic OS Architecture](https://raw.githubusercontent.com/modimihir07/agentic-os/main/docs/og-image.png)

**GitHub**: [github.com/modimihir07/agentic-os](https://github.com/modimihir07/agentic-os)

## The Problem

I was using:
- **opencode** for code generation and DevOps tasks
- **Hermes Agent** for persistent memory and scheduling
- **Gemini CLI** for web research and analysis

Each was great at its job, but there was no central hub. No shared memory. No unified dashboard. No way to chain them together. Every session started from zero.

## The Solution: 7-Layer Architecture

Instead of a flat "three agents" approach, I designed a **7-layer architecture** that standardizes how agents interact:

```
Layer 7: Identity / Persona / Constitution
Layer 6: Self-Evolution + Capability Manager
Layer 5: Scheduler + Awareness + Health Guardian
Layer 4: Memory Graph + Memory Consolidation
Layer 3: Skills Hub + Eval + Learnings Loop
Layer 2: Business Brain + Context Folders
Layer 1: Agent Router + Standards + Profiles
```

### Layer 1: Agent Router
Routes tasks to the right agent automatically:
- **Code/DevOps task?** → opencode
- **Memory/Scheduling?** → Hermes
- **Research/Analysis?** → Gemini CLI
- **Complex multi-step?** → Chain: Gemini researches → opencode implements → Hermes monitors

### Layer 3: Skills Hub (16 Skills)
Each skill has a standardized structure:
```
skills/skill-name/
├── SKILL.md           # Instructions
├── learnings.md       # Accumulated knowledge
├── eval.json          # Scoring criteria
├── score-history.json # Performance tracking
└── context/           # Task inputs
```

This means skills improve over time — the more you run them, the smarter they get.

### Layer 4: Persistent Memory
All agents read from a shared `brain/` folder at session start. Hermes provides SQLite FTS5 for full-text search across all past conversations.

## Feature Highlights

| Feature | What it does |
|---------|-------------|
| 3-Agent Engine | opencode + Hermes + Gemini CLI with auto-routing |
| 16 Skills | Executable packs with eval scoring |
| Cron Scheduler | APScheduler jobs (heartbeat, standup, audit) |
| Cost Analytics | Track spending across providers |
| One-Click Backup | Full tar.gz snapshots |
| Audit Trail | Every action logged |
| Prompt Library | 10 reusable templates |
| Dark/Light Theme | GitHub-style dark mode |

## Comparison with Julian Goldie's Claude Agent OS

I was inspired by Julian Goldie's "Agent OS: Claude + Hermes = Superpowers" video. Here's an honest comparison:

| Feature | Claude Agent OS | Agentic OS (Mine) |
|---------|----------------|-------------------|
| Core Agents | Claude + OpenClaw + Hermes | opencode + Hermes + Gemini |
| Cost | $20/mo (Claude) | **$0 (all free tiers)** |
| Stack | Next.js + Tailwind | FastAPI + vanilla JS |
| Memory | Obsidian (external) | **Built-in brain/ + SQLite** |
| Cost Tracking | None | **Built-in analytics** |
| Backup/Restore | None | **One-click** |
| Open Source | No | **MIT License** |

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JS SPA (no framework)
- **Scheduler**: APScheduler
- **Memory**: SQLite FTS5 + Markdown files
- **Agents**: opencode, Hermes Agent, Gemini CLI
- **Cost**: $0 — all free tiers (Gemini Flash, OpenRouter free models)

## Quick Start

```bash
git clone https://github.com/modimihir07/agentic-os.git
cd agentic-os
chmod +x install.sh && ./install.sh
./start.sh
# Open http://127.0.0.1:8080
```

## What's Next

I'm planning to add:
- More skills (Kubernetes monitoring, CI/CD pipelines)
- Agent handoff protocol for complex multi-step tasks
- Web search integration across all agents

---

**Agentic OS** is open-source under MIT. Star it on GitHub if you find it useful!

👉 **[github.com/modimihir07/agentic-os](https://github.com/modimihir07/agentic-os)**

Questions? Comments? Open an issue or join the discussions on GitHub.
