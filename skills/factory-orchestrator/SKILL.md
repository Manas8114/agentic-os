---
name: factory-orchestrator
version: "1.0.0"
description: End-to-end coordination of the Software Factory pipeline
author: Agentic OS
category: factory
primary_agent: openclaw
tags: [factory, orchestration, pipeline, workflow, multi-agent]
---

# Factory Orchestrator Skill

## Purpose
Coordinate the complete Software Factory pipeline from idea to deployed app.

## Pipeline Stages
1. **Idea Input** → User submits idea
2. **Requirements** → factory-requirements skill analyzes idea
3. **Review** → Human reviews/edits requirements
3. **Planning** → factory-planner creates project plan
4. **Approval** → Human approves/rejects plan
5. **Build** → factory-build executes with coding agents
6. **Review** → Human reviews generated app
6. **Gallery** → Save to project gallery with metadata
7. **Optional Rebuild** → Iterate on feedback

## State Management
Track pipeline state in `data/factory/projects/{project_id}.json`:
- Current stage
- Artifacts at each stage
- Human decisions (approve/reject/edit)
- Timestamps and agent logs

## Human-in-the-Loop
- Requirements review: Edit/approve generated requirements
- Plan approval: Accept/modify/reject project plan
- App review: Test and accept/reject generated app
- Rebuild trigger: One-click regeneration with feedback

## Multi-Agent Discussion
For complex ideas, orchestrate a group chat between agents:
- Claude: Architecture, trade-offs
- Gemini: Research, alternatives, feasibility
- Hermes: Memory, scheduling, operational concerns
- OpenClaw: Routing, task decomposition

## Integration
- Triggered via dashboard or API
- Reports progress via WebSocket
- Integrates with kanban for task tracking
- Stores all artifacts in project gallery