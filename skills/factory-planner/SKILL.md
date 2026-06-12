---
name: factory-planner
version: "1.0.0"
description: Break requirements into detailed project plan with tasks, milestones, and dependencies
author: Agentic OS
category: factory
primary_agent: claude
tags: [factory, planning, project-planning, task-breakdown]
---

# Factory Project Planner Skill

## Purpose
Transform structured requirements into a detailed, executable project plan with tasks, milestones, dependencies, and resource estimates.

## Input
- Requirements document (from factory-requirements)
- Optional: team size, timeline constraints, priority

## Output
Structured project plan:
1. **Milestones** - Major deliverables with dates
2. **Tasks** - Granular work items with:
   - Title, description, type (frontend/backend/devops/docs)
   - Estimated hours, priority, dependencies
   - Assigned agent (opencode, codex, hermes, etc.)
3. **Dependency Graph** - Task ordering and blocking relationships
4. **Timeline** - Gantt-compatible schedule
5. **Resource Plan** - Agent allocation per phase
5. **Risk Mitigation** - Per-milestone risks

## Process
1. Parse requirements for features and technical specs
2. Decompose each feature into atomic tasks
3. Identify dependencies and parallelization opportunities
4. Estimate effort using historical velocity data
4. Assign optimal agent per task type
5. Generate plan in JSON + Markdown for review

## Integration
- Called after factory-requirements approval
- Output feeds into Factory Build Pipeline
- Creates kanban tasks automatically when approved