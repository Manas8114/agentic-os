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
    try:
        prompt = f"""You are an AI agent router. Given this task, choose the BEST agent and explain why.

Agents:
- opencode: code, files, DevOps, git, infrastructure
- hermes: memory, scheduling, channels, notifications
- gemini: research, analysis, documents, web search

Task: {req.task}

Respond with ONLY JSON (no markdown): {{"agent": "<name>", "reason": "<1 sentence>", "confidence": 95}}"""
        llm_out = await asyncio.to_thread(execute_agent, "gemini", prompt)
        
        from fastapi import HTTPException
        match = re.search(r'\{[^}]+\}', llm_out, re.DOTALL)
        if not match:
            raise ValueError(f"LLM did not return valid JSON. Output: {llm_out}")
            
        parsed = json.loads(match.group(0))
        suggested = parsed.get("agent", "").lower()
        llm_reasoning = parsed.get("reason", "")
        confidence_val = parsed.get("confidence", 50)
        
        # We need a proper scores dict for the UI
        score_pct = {"opencode": 0, "hermes": 0, "gemini": 0}
        if suggested in score_pct:
            score_pct[suggested] = confidence_val
            remainder = 100 - confidence_val
            others = [k for k in score_pct if k != suggested]
            if len(others) > 0:
                score_pct[others[0]] = remainder // 2
                score_pct[others[1]] = remainder - (remainder // 2)
        else:
            suggested = "opencode"
            score_pct["opencode"] = 100
            
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"LLM routing failed: {str(e)}")

    append_audit({
        "action": "task_routed_suggest",
        "suggested": suggested,
        "task_preview": req.task[:60],
        "user": user.get("user_id") or user.get("api_key"),
    })
    return {
        "suggested": suggested,
        "suggested_agent": suggested,  # backwards compat
        "confidence": "high" if confidence_val >= 80 else "medium" if confidence_val >= 50 else "low",
        "scores": score_pct,
        "reasoning": llm_reasoning,
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