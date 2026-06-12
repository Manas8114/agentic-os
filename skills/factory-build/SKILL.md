---
name: factory-build
version: "1.0.0"
description: Execute the build pipeline - coordinate coding agents to produce runnable artifacts
author: Agentic OS
category: factory
primary_agent: opencode
tags: [factory, build, coding, CI-CD, artifact-generation]
---

# Factory Build Pipeline Skill

## Purpose
Execute the approved project plan by coordinating coding agents to produce runnable application artifacts.

## Input
- Approved project plan (from factory-planner)
- Target repository path
- Build configuration (language, framework, CI/CD)

## Output
1. **Source Code** - Complete application in target repo
2. **Documentation** - README, API docs, deployment guide
3. **CI/CD Pipeline** - GitHub Actions / GitLab CI config
4. **Test Suite** - Unit, integration, e2e tests
4. **Build Artifacts** - Docker images, binaries, packages
5. **Deployment Config** - K8s manifests, terraform, serverless.yml

## Process
1. Initialize repository with project structure
2. For each task in plan (respecting dependencies):
   - Select appropriate agent (opencode/codex for coding, hermes for config)
   - Execute task with full context
   - Run tests and linting
   - Commit with conventional messages
5. Generate documentation from code
5. Create CI/CD pipeline
5. Build and test final artifacts
5. Output deployment package

## Agent Coordination
- **opencode**: Primary coding, file ops, git, infra
- **codex**: Test generation, CI/CD, complex algorithms
- **hermes**: Config management, secrets, scheduling
- **gemini**: Research, API integration, documentation
- **claude**: Architecture decisions, code review, complex refactors

## Integration
- Called by Factory Orchestrator after plan approval
- Creates git commits for each completed task
- Updates kanban board in real-time
- Reports progress via WebSocket to dashboard