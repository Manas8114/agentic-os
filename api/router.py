"""
Smart Router endpoints: suggest and route tasks.
"""
from fastapi import APIRouter, Depends
from api.deps import append_audit, get_current_user, execute_agent, RouterSuggest, RouterRoute
import re
import asyncio
import json

router = APIRouter()

ROUTER_RULES = {
    "opencode": [r"code", r"devops", r"deploy", r"git", r"file", r"terraform", r"docker", r"test", r"build", r"infra", r"script", r"bug", r"fix", r"debug"],
    "hermes": [r"memory", r"schedule", r"channel", r"skill", r"cron", r"reminder", r"brain", r"plugin", r"backup", r"notification"],
    "gemini": [r"research", r"analyz", r"search", r"compar", r"explain", r"study", r"learn", r"document", r"report", r"review", r"web", r"article"],
}

@router.post("/suggest")
async def router_suggest(req: RouterSuggest, user: dict = Depends(get_current_user)):
    task = req.task.lower()

    # Compute heuristic keyword scores for all agents
    raw_scores = {agent: 0 for agent in ROUTER_RULES}
    for agent, patterns in ROUTER_RULES.items():
        for pattern in patterns:
            if re.search(pattern, task):
                raw_scores[agent] += 1

    # Pick heuristic winner
    suggested = max(raw_scores, key=raw_scores.get)
    if raw_scores[suggested] == 0:
        suggested = "opencode"  # default
        raw_scores["opencode"] = 1

    # Try LLM override, but keep heuristic scores as the distribution baseline
    llm_reasoning = ""
    try:
        prompt = f"""You are an AI agent router. Given this task, choose the BEST agent and explain why.

Agents:
- opencode: code, files, DevOps, git, infrastructure
- hermes: memory, scheduling, channels, notifications
- gemini: research, analysis, documents, web search

Task: {req.task}

Respond with ONLY JSON (no markdown): {{"agent": "<name>", "reason": "<1 sentence>"}}"""
        llm_out = await asyncio.to_thread(execute_agent, "gemini", prompt)  # Fix #6: non-blocking
        match = re.search(r'\{[^}]+\}', llm_out)
        if match:
            parsed = json.loads(match.group(0))
            if parsed.get("agent") in ROUTER_RULES:
                suggested = parsed["agent"]
                llm_reasoning = parsed.get("reason", "")
                # Boost LLM-chosen agent so distribution is still meaningful
                raw_scores[suggested] = max(raw_scores[suggested], 3)
    except Exception:
        pass  # Fall back to heuristic result

    # Fix #15: normalize scores to percentages so UI gauge shows real distribution
    total = sum(raw_scores.values()) or 1
    score_pct = {agent: round(v * 100 / total) for agent, v in raw_scores.items()}

    append_audit({
        "action": "task_routed_suggest",
        "suggested": suggested,
        "task_preview": req.task[:60],
        "user": user.get("user_id") or user.get("api_key"),
    })
    return {
        "suggested": suggested,
        "suggested_agent": suggested,  # backwards compat
        "confidence": "high" if raw_scores[suggested] >= 2 else "medium" if raw_scores[suggested] == 1 else "low",
        "scores": score_pct,
        "reasoning": llm_reasoning or f"Heuristic: matched {raw_scores[suggested]} pattern(s) for {suggested}",
        "task": req.task,
    }

@router.post("/route")
async def router_route(req: RouterRoute, user: dict = Depends(get_current_user)):
    try:
        agent = req.agent.lower()
        if agent not in ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]:
            return {"status": "error", "message": f"Invalid agent: {agent}"}
        append_audit({"action": "task_routed", "agent": agent, "task_preview": req.task[:50], "user": user.get("user_id") or user.get("api_key")})
        return {
            "status": "routed",
            "agent": agent,
            "task": req.task,
            "message": f"Task routed to {agent}",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}