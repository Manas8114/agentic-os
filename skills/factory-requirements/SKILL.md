---
name: factory-requirements
version: "1.0.0"
description: Generate detailed requirements and specifications from a raw idea
author: Agentic OS
category: factory
primary_agent: gemini
tags: [factory, requirements, planning, idea-factory]
---

# Factory Requirements Generation Skill

## Purpose
Transform a raw idea or concept into detailed, structured requirements suitable for the planning and build phases of the Software Factory.

## Input
- Raw idea text (natural language description)
- Optional: target platform, tech preferences, constraints

## Output
Structured requirements document including:
1. **Problem Statement** - What problem does this solve?
2. **Target Audience** - Who is this for?
3. **Core Features** - Must-have functionality (MoSCoW prioritized)
4. **Technical Requirements** - Platform, stack, APIs, integrations
5. **Non-Functional Requirements** - Performance, security, scalability
6. **User Stories** - As a [role], I want [feature] so that [benefit]
7. **Acceptance Criteria** - Testable conditions for each feature
8. **Risks & Assumptions** - Known unknowns and dependencies
9. **Suggested Tech Stack** - Based on requirements

## Process
1. Analyze the raw idea for clarity and completeness
2. Identify implicit requirements and constraints
3. Research similar solutions (if web search available)
4. Structure into formal requirements document
5. Prioritize features using MoSCoW method
5. Output structured JSON + markdown for human review

## Examples

### Input: "Build a habit tracker"
### Output: Requirements for a habit tracking app with streaks, reminders, analytics, export

### Input: "Create an SEO tool for bloggers"
### Output: Requirements for keyword research, content optimization, rank tracking

## Integration
- Called by Factory Orchestrator as first step
- Output feeds into Project Planner skill
- Results stored in factory project database
