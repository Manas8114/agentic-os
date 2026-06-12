"""
Skills endpoints: listing, getting, running, and evaluation.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from api.deps import (
    BASE_DIR, read_file, write_file, list_dir, append_audit, get_current_user,
    execute_agent, auto_inject_context, SkillRunRequest, get_timestamp
)
import json
import uuid
import asyncio
import subprocess
import sys

router = APIRouter()

@router.get("/")
async def list_skills():
    skills = []
    for d in sorted((BASE_DIR / "skills").iterdir()):
        if d.is_dir() and not d.name.startswith("_"):
            skill_md = read_file(d / "SKILL.md")
            learnings = read_file(d / "learnings.md")
            eval_data = {}
            eval_path = d / "eval.json"
            if eval_path.exists():
                eval_data = json.loads(eval_path.read_text())
            score_history = []
            score_path = d / "score-history.json"
            if score_path.exists():
                score_history = json.loads(score_path.read_text())
            skills.append({
                "name": d.name,
                "description": skill_md[:200] if skill_md else "",
                "has_learnings": bool(learnings),
                "eval_criteria": eval_data.get("criteria", []),
                "scores": score_history,
            })
    return skills

@router.get("/{name}")
async def get_skill(name: str):
    path = BASE_DIR / "skills" / name
    if not path.exists():
        raise HTTPException(404, "Skill not found")
    return {
        "name": name,
        "skill": read_file(path / "SKILL.md"),
        "learnings": read_file(path / "learnings.md"),
        "eval": json.loads((path / "eval.json").read_text()) if (path / "eval.json").exists() else {},
        "score_history": json.loads((path / "score-history.json").read_text()) if (path / "score-history.json").exists() else [],
        "context": [f.name for f in (path / "context").iterdir()] if (path / "context").exists() else [],
    }

@router.post("/{name}/run")
async def run_skill(name: str, req: Optional[SkillRunRequest] = None, user: dict = Depends(get_current_user)):
    print(f"[DEBUG] ENTRY run_skill: name={name}, req={req}, user={user}")
    sys.stdout.flush()
    print(f"[DEBUG] run_skill called: name={name}, req={req}, user={user}")
    sys.stdout.flush()
    path = BASE_DIR / "skills" / name
    if not path.exists():
        raise HTTPException(404, "Skill not found")

    agent_choice = req.agent if req else "auto"
    skill_input = req.input if req else ""

    skill_md = read_file(path / "SKILL.md")
    learnings = read_file(path / "learnings.md")

    if agent_choice == "auto":
        devops_keywords = ["devops", "audit", "deploy", "k8s", "gcp", "infra", "terraform"]
        research_keywords = ["research", "synthesis", "analyze", "search", "compare"]
        if any(k in name for k in devops_keywords):
            agent_choice = "opencode"
        elif any(k in name for k in research_keywords):
            agent_choice = "gemini"
        else:
            for line in skill_md.split('\n'):
                line = line.strip()
                if "Primary:" in line:
                    candidate = line.split(":")[-1].strip().lower()
                    if candidate in ("opencode", "hermes", "gemini", "antigravity", "codex", "claude"):
                        agent_choice = candidate
                        break
            if agent_choice == "auto":
                agent_choice = "opencode"

    prompt = f"Execute the '{name}' skill.\n\n"
    if skill_md:
        prompt += f"## Skill Instructions\n{skill_md}\n\n"
    if learnings and learnings.strip():
        prompt += f"## Past Learnings\n{learnings}\n\n"
    if skill_input:
        prompt += f"## User Input\n{skill_input}"

    try:
        context_str = await auto_inject_context(skill_input or f"Execute {name} skill", agent_choice)
        if context_str:
            prompt += f"\n\n## Injected Context\n{context_str}"
    except Exception as e:
        print(f"Context injection warning: {e}")

    run_id = str(uuid.uuid4())[:8]

    print(f"[DEBUG] Skill run: name={name}, agent={agent_choice}, run_id={run_id}")
    sys.stdout.flush()

    try:
        response_text = await asyncio.to_thread(execute_agent, agent_choice, prompt)  # Fix #6: non-blocking
    except Exception as e:
        response_text = f"⚠ Error executing skill: {str(e)}"

    print(f"[DEBUG] execute_agent completed, response length: {len(response_text)}")
    sys.stdout.flush()

    timestamp = get_timestamp()[:10]
    existing = read_file(path / "learnings.md")
    new_entry = (
        f"\n## {timestamp} (Run {run_id})\n"
        f"- Agent: {agent_choice}\n"
        f"- Input: {skill_input or '(none)'}\n"
        f"- Output: {response_text[:500]}\n"
    )
    write_file(path / "learnings.md", existing + new_entry)

    print(f"[DEBUG] Written to learnings.md")
    sys.stdout.flush()

    append_audit({
        "action": "skill_run",
        "skill": name,
        "agent": agent_choice,
        "run_id": run_id,
        "output_preview": response_text[:100],
        "user": user.get("user_id") or user.get("api_key"),
    })

    print(f"[DEBUG] Audit appended")
    sys.stdout.flush()

    return {
        "status": "completed",
        "run_id": run_id,
        "skill": name,
        "agent": agent_choice,
        "output": response_text,
        "message": f"Skill '{name}' completed via {agent_choice}",
    }

@router.get("/{name}/eval")
async def get_skill_eval(name: str):
    path = BASE_DIR / "skills" / name / "score-history.json"
    if not path.exists():
        return {"scores": []}
    return {"scores": json.loads(path.read_text())}