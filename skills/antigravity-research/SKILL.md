---
name: antigravity-research
description: Web research, discovery, experimentation, competitive analysis, technology scouting
version: 1.0.0
author: Agentic OS
tags: [research, discovery, experimentation, competitive-analysis, scouting, antigravity]
---

# Antigravity Research — Research & Discovery Specialist

## Description
Conducts deep web research, competitive analysis, technology scouting, and experimentation. Synthesizes findings into structured reports with citations. Uses Gemeni CLI's web search capabilities for current information.

## When to Use
- Need current market/technology information
- Competitive analysis required
- Technology scouting for new tools/frameworks
- Experimentation with hypotheses
- Deep research on specific topics

## Input
- Research topic or question
- Optional: specific sources to prioritize
- Optional: output format preference (report, summary, comparison table)

## Process
1. Clarify research scope and success criteria
2. Execute web searches for current information
3. Analyze and synthesize findings from multiple sources
4. Structure results with citations and confidence levels
5. Flag gaps and recommend follow-up experiments
6. Output structured report

## Output
- Markdown research report with sections:
  - Executive Summary
  - Key Findings (with citations)
  - Comparative Analysis (if applicable)
  - Technology Landscape
  - Confidence Assessment
  - Recommended Next Steps
  - Sources

## Agent Assignment
- Primary: antigravity
- Fallback: gemini

## Dependencies
- Gemini CLI with web search enabled
- Valid Google AI API key or OAuth authentication