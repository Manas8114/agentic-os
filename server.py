#!/usr/bin/env python3
"""
Agentic OS — FastAPI Backend
Multi-agent orchestration server for opencode, Hermes, Gemini CLI
"""
import argparse
import json
import os
import shutil
import subprocess
import tarfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.websockets import WebSocket, WebSocketDisconnect

# aiohttp for external API calls (optional import)
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

app = FastAPI(title="Agentic OS", version="1.1.0")

# Load OpenRouter API key from Hermes .env
HERMES_ENV = Path.home() / ".hermes" / ".env"
if HERMES_ENV.exists():
    for line in HERMES_ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if k == "OPENROUTER_API_KEY":
                os.environ[k] = v  # last value wins (matches shell sourcing)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.resolve()

# ─── Models ───────────────────────────────────────────────────────

class BrainUpdate(BaseModel):
    content: str

class SkillRunRequest(BaseModel):
    input: Optional[str] = ""
    agent: Optional[str] = "auto"

class ScheduleJobRequest(BaseModel):
    name: str
    skill: str
    cron: str
    enabled: bool = True

class SettingsUpdate(BaseModel):
    settings: dict

class BackupRestoreRequest(BaseModel):
    file: str

class ChatRequest(BaseModel):
    agent: str
    message: str

# ─── Helper Functions ─────────────────────────────────────────────

def read_file(path: Path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

def write_file(path: Path, content: str):
    path.write_text(content, encoding="utf-8")
    return True

def list_dir(path: Path):
    if not path.exists():
        return []
    return sorted([p.name for p in path.iterdir() if not p.name.startswith(".")])

def get_timestamp():
    return datetime.now(timezone.utc).isoformat()

def append_audit(entry: dict):
    audit_file = BASE_DIR / "audit" / "audit.log"
    entry["timestamp"] = get_timestamp()
    entry["id"] = str(uuid.uuid4())[:8]
    with open(audit_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

# ─── Agent Discovery (instant filesystem checks) ────────────────────

def check_agent(name: str) -> dict:
    """Instant filesystem-based check. No subprocess needed."""
    try:
        if name == "opencode":
            exists = shutil.which("opencode") is not None
            status = "online" if exists else "offline"
        elif name == "hermes":
            exists = shutil.which("hermes") is not None
            status = "online" if exists else "offline"
        elif name == "gemini":
            # Gemini has valid OAuth tokens logged in
            oauth = Path.home() / ".gemini" / "oauth_creds.json"
            exists = shutil.which("gemini") is not None
            logged_in = oauth.exists() and "ya29" in oauth.read_text()
            status = "online" if exists and logged_in else "offline" if not exists else "warning"
        else:
            status = "offline"
    except Exception:
        status = "offline"
    return {"name": name, "status": status}

# ─── Routes: Status ───────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    agents = [check_agent(a) for a in ["opencode", "hermes", "gemini"]]
    skills = list_dir(BASE_DIR / "skills")
    return {
        "status": "healthy",
        "agents": agents,
        "skills_count": len(skills),
        "uptime": time.time(),
    }

# ─── Routes: Brain ────────────────────────────────────────────────

@app.get("/api/brain")
def list_brain():
    files = list_dir(BASE_DIR / "brain")
    brain_data = {}
    for f in files:
        path = BASE_DIR / "brain" / f
        brain_data[f] = read_file(path)
    return brain_data

@app.get("/api/brain/{file_name}")
def get_brain_file(file_name: str):
    path = BASE_DIR / "brain" / file_name
    if not path.exists() or path.is_dir():
        raise HTTPException(404, "File not found")
    return {"name": file_name, "content": read_file(path)}

@app.put("/api/brain/{file_name}")
def update_brain_file(file_name: str, data: BrainUpdate):
    path = BASE_DIR / "brain" / file_name
    write_file(path, data.content)
    append_audit({"action": "brain_update", "file": file_name})
    return {"status": "ok", "file": file_name}

# ─── Routes: Skills ───────────────────────────────────────────────

@app.get("/api/skills")
def list_skills():
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

@app.get("/api/skills/{name}")
def get_skill(name: str):
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

@app.post("/api/skills/{name}/run")
def run_skill(name: str, req: Optional[SkillRunRequest] = None):
    path = BASE_DIR / "skills" / name
    if not path.exists():
        raise HTTPException(404, "Skill not found")

    agent_choice = req.agent if req else "auto"
    skill_input = req.input if req else ""

    # Read skill files
    skill_md = read_file(path / "SKILL.md")
    learnings = read_file(path / "learnings.md")

    # Determine which agent based on skill type
    if agent_choice == "auto":
        devops_keywords = ["devops", "audit", "deploy", "k8s", "gcp", "infra", "terraform"]
        research_keywords = ["research", "synthesis", "analyze", "search", "compare"]
        if any(k in name for k in devops_keywords):
            agent_choice = "opencode"
        elif any(k in name for k in research_keywords):
            agent_choice = "gemini"
        else:
            # Check SKILL.md for explicit agent assignment
            for line in skill_md.split('\n'):
                line = line.strip()
                if "Primary:" in line:
                    candidate = line.split(":")[-1].strip().lower()
                    if candidate in ("opencode", "hermes", "gemini"):
                        agent_choice = candidate
                        break
            if agent_choice == "auto":
                agent_choice = "opencode"

    # Build prompt from skill instructions + learnings + user input
    prompt = f"Execute the '{name}' skill.\n\n"
    if skill_md:
        prompt += f"## Skill Instructions\n{skill_md}\n\n"
    if learnings and learnings.strip():
        prompt += f"## Past Learnings\n{learnings}\n\n"
    if skill_input:
        prompt += f"## User Input\n{skill_input}"

    run_id = str(uuid.uuid4())[:8]

    # Execute via agent
    try:
        response_text = execute_agent(agent_choice, prompt)
    except subprocess.TimeoutExpired:
        response_text = f"⏱ Skill '{name}' timed out on agent '{agent_choice}'."
    except FileNotFoundError:
        response_text = f"⚠ Agent '{agent_choice}' CLI not installed. Install it and try again."
    except Exception as e:
        response_text = f"⚠ Error executing skill: {str(e)}"

    # Save output to learnings.md
    timestamp = get_timestamp()[:10]
    existing = read_file(path / "learnings.md")
    new_entry = (
        f"\n## {timestamp} (Run {run_id})\n"
        f"- Agent: {agent_choice}\n"
        f"- Input: {skill_input or '(none)'}\n"
        f"- Output: {response_text[:500]}\n"
    )
    write_file(path / "learnings.md", existing + new_entry)

    # Log execution
    append_audit({
        "action": "skill_run",
        "skill": name,
        "agent": agent_choice,
        "run_id": run_id,
        "output_preview": response_text[:100],
    })

    return {
        "status": "completed",
        "run_id": run_id,
        "skill": name,
        "agent": agent_choice,
        "output": response_text,
        "message": f"Skill '{name}' completed via {agent_choice}",
    }

@app.get("/api/skills/{name}/eval")
def get_skill_eval(name: str):
    path = BASE_DIR / "skills" / name / "score-history.json"
    if not path.exists():
        return {"scores": []}
    return {"scores": json.loads(path.read_text())}

# ─── Routes: Scheduler ────────────────────────────────────────────

@app.get("/api/scheduler/jobs")
def list_jobs():
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs = []
    for f in sorted(jobs_dir.glob("*.json")):
        jobs.append(json.loads(f.read_text()))
    return jobs

@app.post("/api/scheduler/jobs")
def create_job(job: ScheduleJobRequest):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    job_data = {
        "id": str(uuid.uuid4())[:8],
        "name": job.name,
        "skill": job.skill,
        "cron": job.cron,
        "enabled": job.enabled,
        "created": get_timestamp(),
        "last_run": None,
        "next_run": None,
    }
    (jobs_dir / f"{job.name.replace(' ', '_')}.json").write_text(
        json.dumps(job_data, indent=2)
    )
    append_audit({"action": "job_created", "job": job.name})
    return job_data

@app.delete("/api/scheduler/jobs/{job_id}")
def delete_job(job_id: str):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    for f in jobs_dir.glob("*.json"):
        data = json.loads(f.read_text())
        if data.get("id") == job_id:
            f.unlink()
            append_audit({"action": "job_deleted", "job_id": job_id})
            return {"status": "deleted"}
    raise HTTPException(404, "Job not found")

# ─── Routes: Audit ────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit(limit: int = Query(100, le=500)):
    audit_file = BASE_DIR / "audit" / "audit.log"
    if not audit_file.exists():
        return {"entries": []}
    lines = audit_file.read_text().strip().split("\n")
    entries = [json.loads(l) for l in lines if l.strip()]
    return {"entries": entries[-limit:]}

# ─── Routes: Cost Analytics ───────────────────────────────────────

@app.get("/api/cost")
def get_cost():
    cost_file = BASE_DIR / "data" / "cost-history.json"
    if not cost_file.exists():
        return {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    return json.loads(cost_file.read_text())

@app.post("/api/cost/record")
def record_cost(data: dict):
    cost_file = BASE_DIR / "data" / "cost-history.json"
    cost_data = json.loads(cost_file.read_text()) if cost_file.exists() else \
        {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    cost_data["entries"].append({
        "timestamp": get_timestamp(),
        "agent": data.get("agent", "unknown"),
        "tokens": data.get("tokens", 0),
        "cost": data.get("cost", 0.0),
        "model": data.get("model", "unknown"),
    })
    cost_file.write_text(json.dumps(cost_data, indent=2))
    return {"status": "recorded"}

# ─── Routes: Registry/Plugins ─────────────────────────────────────

@app.get("/api/plugins")
def list_plugins():
    reg_file = BASE_DIR / "registry" / "plugins.json"
    if not reg_file.exists():
        return {"plugins": []}
    return json.loads(reg_file.read_text())

@app.post("/api/plugins/install")
def install_plugin(data: dict):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Plugin name required")
    reg_file = BASE_DIR / "registry" / "plugins.json"
    reg = json.loads(reg_file.read_text()) if reg_file.exists() else {"plugins": []}
    if any(p["name"] == name for p in reg["plugins"]):
        return {"status": "already_installed"}
    reg["plugins"].append({
        "name": name,
        "installed": get_timestamp(),
        "version": "1.0.0",
    })
    reg_file.write_text(json.dumps(reg, indent=2))
    append_audit({"action": "plugin_installed", "plugin": name})
    return {"status": "installed", "plugin": name}

# ─── Routes: Backup ───────────────────────────────────────────────

@app.get("/api/backups")
def list_backups():
    backup_dir = BASE_DIR / "backups"
    backups = []
    for f in sorted(backup_dir.glob("*.tar.gz"), reverse=True):
        backups.append({
            "name": f.name,
            "size": f.stat().st_size,
            "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        })
    return backups

@app.post("/api/backup")
def create_backup():
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"agentic-os-{ts}.tar.gz"
    with tarfile.open(backup_file, "w:gz") as tar:
        for dir_name in ["brain", "skills", "agents", "registry", "standards", "prompts"]:
            d = BASE_DIR / dir_name
            if d.exists():
                tar.add(d, arcname=dir_name)
    append_audit({"action": "backup_created", "file": backup_file.name})
    return {"status": "ok", "file": backup_file.name, "size": backup_file.stat().st_size}

@app.post("/api/backup/restore")
def restore_backup(data: BackupRestoreRequest):
    backup_file = BASE_DIR / "backups" / data.file
    if not backup_file.exists():
        raise HTTPException(404, "Backup file not found")
    with tarfile.open(backup_file, "r:gz") as tar:
        tar.extractall(path=BASE_DIR)
    append_audit({"action": "backup_restored", "file": data.file})
    return {"status": "restored"}

# ─── Routes: Prompts ──────────────────────────────────────────────

@app.get("/api/prompts")
def list_prompts():
    prompts_dir = BASE_DIR / "prompts"
    prompts = {}
    for f in sorted(prompts_dir.glob("*.md")):
        prompts[f.stem] = read_file(f)
    return prompts

# ─── Routes: Settings ─────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    sf = BASE_DIR / "data" / "settings.json"
    if not sf.exists():
        return {}
    return json.loads(sf.read_text())

@app.put("/api/settings")
def update_settings(data: SettingsUpdate):
    sf = BASE_DIR / "data" / "settings.json"
    # Merge with existing
    existing = json.loads(sf.read_text()) if sf.exists() else {}
    existing.update(data.settings)
    sf.write_text(json.dumps(existing, indent=2))
    append_audit({"action": "settings_updated"})
    return {"status": "ok"}

# ─── Routes: Standards ────────────────────────────────────────────

@app.get("/api/standards")
def list_standards():
    std_dir = BASE_DIR / "standards"
    if not std_dir.exists():
        return {"standards": []}
    standards = []
    index_file = std_dir / "index.yml"
    index_content = read_file(index_file)
    for f in std_dir.glob("*.md"):
        standards.append({
            "name": f.stem,
            "content": read_file(f),
        })
    return {"standards": standards, "index": index_content}

@app.post("/api/standards/discover")
def discover_standards():
    # Stub: scans codebase for patterns
    append_audit({"action": "standards_discovery_run"})
    return {"status": "discovery_started", "message": "Scanning codebase for patterns..."}

# ─── Routes: Chat ─────────────────────────────────────────────────

CHAT_HISTORY_FILE = BASE_DIR / "data" / "chat-history.json"

def load_chat_history():
    if CHAT_HISTORY_FILE.exists():
        return json.loads(CHAT_HISTORY_FILE.read_text())
    return {"messages": []}

def save_chat_message(msg: dict):
    history = load_chat_history()
    history["messages"].append(msg)
    if len(history["messages"]) > 200:
        history["messages"] = history["messages"][-200:]
    CHAT_HISTORY_FILE.write_text(json.dumps(history, indent=2))

def run_cli(args: list, timeout: int = 30) -> tuple:
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr

def clean_hermes_output(raw: str) -> str:
    """Strip CLI metadata from Hermes output, returning only the AI response."""
    if not raw:
        return ""
    lines = raw.split('\n')
    in_box = False
    content_lines = []
    for line in lines:
        if '╭─' in line:
            in_box = True
            continue
        if '╰─' in line:
            in_box = False
            continue
        if in_box:
            # Remove ANSI escape codes and leading whitespace
            cleaned = line.strip()
            if cleaned:
                content_lines.append(cleaned)
    if content_lines:
        return '\n'.join(content_lines)
    # Fallback: if no box found, return last non-metadata line
    non_meta = [l.strip() for l in lines if l.strip() and not l.startswith(('Query:', 'Initializing', '──', 'Resume', 'Session:', 'Duration:', 'Messages:'))]
    return '\n'.join(non_meta[-5:]) or raw

def execute_agent(agent: str, message: str) -> str:
    try:
        if agent == "opencode":
            try:
                code, out, err = run_cli(["opencode", "run", "--format", "json", message], timeout=30)
            except subprocess.TimeoutExpired:
                return f"⏱ Agent 'opencode' timed out.\n\nOpenCode's model is taking too long. Try running `opencode run \"{message[:60]}\"` directly in your terminal.\n\n**Message:** {message[:100]}"
            if code == 0:
                response_text = ""
                for line in (out or "").split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                        if event.get("type") == "text":
                            text = event.get("part", {}).get("text", "")
                            if text:
                                response_text += text + "\n"
                    except (json.JSONDecodeError, KeyError):
                        continue
                if response_text:
                    return response_text.strip()
                return f"**opencode**\n\nProcessed your message.\n\n**Message:** {message[:100]}"
            err_msg = (err or "").strip()
            return err_msg or f"opencode returned exit code {code}"

        elif agent == "hermes":
            try:
                code, out, err = run_cli(["hermes", "chat", "-q", message], timeout=180)
            except subprocess.TimeoutExpired:
                return f"⏱ Hermes timed out.\n\nThe model took too long to respond. Try a shorter query or check your OpenRouter rate limits.\n\n**Message:** {message[:100]}"
            if code == 0:
                cleaned = clean_hermes_output(out or "")
                if cleaned:
                    return cleaned
                # Empty response from model - return useful fallback
                return f"**Hermes**\n\nReceived your message but the model returned an empty response. Try rephrasing your query.\n\n**Message:** {message}"
            err_msg = (err or "").strip()
            if "invalid choice" in err_msg or "usage:" in err_msg:
                return f"**Hermes needs setup**\n\nRun `hermes setup` or check your config.\n\n**Details:** {err_msg[:200]}"
            return err_msg or f"hermes returned exit code {code}"

        elif agent == "gemini":
            for attempt, (args, to) in enumerate([
                (["-y", "-m", "gemini-2.5-flash"], 60),
                (["-y"], 40),
            ]):
                try:
                    code, out, err = run_cli(["gemini", *args, message], timeout=to)
                except subprocess.TimeoutExpired:
                    if attempt == 0:
                        continue
                    return f"⏱ Gemini timed out.\n\nTry running `gemini \"{message[:60]}\"` directly.\n\n**Message:** {message[:100]}"
                if code == 0:
                    return (out or "").strip() or f"**Gemini CLI**\n\nProcessed your query.\n\n**Message:** {message}"
                err_msg = (err or "").strip()
                if attempt == 0 and ("model" in err_msg.lower() or "not found" in err_msg.lower()):
                    continue
                if "auth" in err_msg.lower() or "login" in err_msg.lower():
                    return f"**Gemini needs re-auth**\n\nRun `gemini auth login` to re-authenticate.\n\n**Details:** {err_msg[:200]}"
                return err_msg or f"gemini returned exit code {code}"
            return "Gemini CLI did not return a response."

        else:
            return f"Unknown agent: {agent}"
    except subprocess.TimeoutExpired:
        return f"⏱ Agent '{agent}' timed out.\n\nRun `{agent} --help` in your terminal for CLI usage.\n\n**Message:** {message[:100]}"
    except FileNotFoundError:
        return f"⚠ Agent '{agent}' CLI not installed. Install it and try again."
    except Exception as e:
        return f"⚠ Error communicating with {agent}: {str(e)}"

@app.post("/api/chat")
def chat(req: ChatRequest):
    agent = req.agent.lower().strip()
    if agent not in ["opencode", "hermes", "gemini"]:
        raise HTTPException(400, "Agent must be one of: opencode, hermes, gemini")

    user_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "user",
        "agent": agent,
        "content": req.message,
        "timestamp": get_timestamp(),
    }
    save_chat_message(user_msg)

    response_text = execute_agent(agent, req.message)

    agent_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "assistant",
        "agent": agent,
        "content": response_text,
        "timestamp": get_timestamp(),
    }
    save_chat_message(agent_msg)

    append_audit({"action": "chat_message", "agent": agent, "msg_preview": req.message[:50]})

    return {"status": "ok", "response": agent_msg}

@app.get("/api/chat/history")
def get_chat_history():
    return load_chat_history()

# ═══════════════════════════════════════════════════════════════════
# v0.2.0 — New Feature Endpoints
# ═══════════════════════════════════════════════════════════════════

# ─── Models ─────────────────────────────────────────────────────

class KanbanTaskCreate(BaseModel):
    title: str
    body: str = ""
    status: str = "triage"
    priority: str = "medium"
    assignee: str = ""

class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None

class KanbanComplete(BaseModel):
    summary: str = ""

class KanbanBlock(BaseModel):
    reason: str = ""

class KanbanCommentCreate(BaseModel):
    message: str

class KanbanLinkCreate(BaseModel):
    parent_id: str
    child_id: str

class GoalCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    target_date: str = ""

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[str] = None

class JournalSave(BaseModel):
    content: str

class RouterSuggest(BaseModel):
    task: str

class RouterRoute(BaseModel):
    task: str
    agent: str

# ─── Data Helpers ───────────────────────────────────────────────

KANBAN_DIR = BASE_DIR / "data" / "kanban"
GOALS_FILE = BASE_DIR / "data" / "goals.json"
JOURNAL_DIR = BASE_DIR / "brain" / "journal"

def ensure_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)

def load_kanban_tasks():
    ensure_dir(KANBAN_DIR)
    tasks = []
    for f in sorted(KANBAN_DIR.glob("*.json")):
        tasks.append(json.loads(f.read_text()))
    return tasks

def save_kanban_task(task: dict):
    ensure_dir(KANBAN_DIR)
    (KANBAN_DIR / f"{task['id']}.json").write_text(json.dumps(task, indent=2))

def load_goals():
    if GOALS_FILE.exists():
        return json.loads(GOALS_FILE.read_text())
    return []

def save_goals(goals: list):
    GOALS_FILE.write_text(json.dumps(goals, indent=2))

# ─── Routes: Kanban Board (13 endpoints) ────────────────────────

@app.get("/api/kanban/board")
def kanban_board(status: Optional[str] = None):
    try:
        tasks = load_kanban_tasks()
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        columns = {"triage": [], "todo": [], "ready": [], "in_progress": [], "blocked": [], "done": []}
        for t in tasks:
            s = t.get("status", "triage")
            if s in columns:
                columns[s].append(t)
        return {"columns": columns, "total": len(tasks)}
    except Exception as e:
        return {"error": str(e), "columns": {}, "total": 0}

@app.get("/api/kanban/tasks/{task_id}")
def kanban_get_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    return json.loads(path.read_text())

@app.post("/api/kanban/tasks")
def kanban_create_task(data: KanbanTaskCreate):
    try:
        task = {
            "id": str(uuid.uuid4())[:8],
            "title": data.title,
            "body": data.body,
            "status": data.status,
            "priority": data.priority,
            "assignee": data.assignee,
            "comments": [],
            "links": [],
            "created": get_timestamp(),
            "updated": get_timestamp(),
        }
        save_kanban_task(task)
        append_audit({"action": "kanban_task_created", "title": data.title})
        return task
    except Exception as e:
        raise HTTPException(500, str(e))

@app.patch("/api/kanban/tasks/{task_id}")
def kanban_update_task(task_id: str, data: KanbanTaskUpdate):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    for field in ["title", "body", "status", "priority", "assignee"]:
        val = getattr(data, field, None)
        if val is not None:
            task[field] = val
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_updated", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/complete")
def kanban_complete_task(task_id: str, data: KanbanComplete):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "done"
    task["summary"] = data.summary
    task["completed_at"] = get_timestamp()
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_completed", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/block")
def kanban_block_task(task_id: str, data: KanbanBlock):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "blocked"
    task["block_reason"] = data.reason
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_blocked", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/unblock")
def kanban_unblock_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "ready"
    task["block_reason"] = ""
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_unblocked", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/comments")
def kanban_add_comment(task_id: str, data: KanbanCommentCreate):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    comment = {
        "id": str(uuid.uuid4())[:8],
        "message": data.message,
        "timestamp": get_timestamp(),
    }
    task.setdefault("comments", []).append(comment)
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    return task

@app.post("/api/kanban/links")
def kanban_add_link(data: KanbanLinkCreate):
    for tid in [data.parent_id, data.child_id]:
        path = KANBAN_DIR / f"{tid}.json"
        if not path.exists():
            raise HTTPException(404, f"Task {tid} not found")
        t = json.loads(path.read_text())
        t.setdefault("links", [])
        link = {"parent": data.parent_id, "child": data.child_id}
        if link not in t["links"]:
            t["links"].append(link)
        t["updated"] = get_timestamp()
        save_kanban_task(t)
    append_audit({"action": "kanban_link_added", "parent": data.parent_id, "child": data.child_id})
    return {"status": "linked"}

@app.delete("/api/kanban/links")
def kanban_remove_link(parent_id: str = Query(...), child_id: str = Query(...)):
    for tid in [parent_id, child_id]:
        path = KANBAN_DIR / f"{tid}.json"
        if path.exists():
            t = json.loads(path.read_text())
            t.setdefault("links", [])
            t["links"] = [l for l in t["links"] if not (l.get("parent") == parent_id and l.get("child") == child_id)]
            t["updated"] = get_timestamp()
            save_kanban_task(t)
    return {"status": "unlinked"}

@app.post("/api/kanban/dispatch")
def kanban_dispatch():
    append_audit({"action": "kanban_dispatch_triggered"})
    return {"status": "dispatch_triggered", "message": "Dispatcher notified"}

@app.post("/api/kanban/tasks/{task_id}/specify")
def kanban_specify_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    if task.get("status") == "triage":
        task["status"] = "todo"
        task["updated"] = get_timestamp()
        save_kanban_task(task)
    return task

@app.post("/api/kanban/tasks/{task_id}/decompose")
def kanban_decompose_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    children = []
    for i, subtask in enumerate(task.get("body", "").split("\n")):
        subtask = subtask.strip().lstrip("-* ")
        if subtask:
            child = {
                "id": str(uuid.uuid4())[:8],
                "title": subtask[:80],
                "body": subtask,
                "status": "todo",
                "priority": task.get("priority", "medium"),
                "assignee": "",
                "comments": [],
                "links": [{"parent": task_id, "child": ""}],
                "created": get_timestamp(),
                "updated": get_timestamp(),
            }
            child["links"][0]["child"] = child["id"]
            save_kanban_task(child)
            children.append(child)
    return {"parent": task_id, "children": children}

# ─── Routes: Goals (4 endpoints) ─────────────────────────────────

@app.get("/api/goals")
def list_goals():
    try:
        return {"goals": load_goals()}
    except Exception as e:
        return {"goals": [], "error": str(e)}

@app.post("/api/goals")
def create_goal(data: GoalCreate):
    try:
        goals = load_goals()
        goal = {
            "id": str(uuid.uuid4())[:8],
            "title": data.title,
            "description": data.description,
            "category": data.category,
            "target_date": data.target_date,
            "status": "active",
            "progress": 0,
            "created": get_timestamp(),
            "updated": get_timestamp(),
        }
        goals.append(goal)
        save_goals(goals)
        # Auto-sync to brain/active-projects.md
        active_path = BASE_DIR / "brain" / "active-projects.md"
        if active_path.exists():
            existing = active_path.read_text()
            existing += f"\n- [{goal['title']}](goal:{goal['id']}) — {goal['description'][:80]}\n"
            active_path.write_text(existing)
        append_audit({"action": "goal_created", "title": data.title})
        return goal
    except Exception as e:
        raise HTTPException(500, str(e))

@app.put("/api/goals/{goal_id}")
def update_goal(goal_id: str, data: GoalUpdate):
    try:
        goals = load_goals()
        for g in goals:
            if g["id"] == goal_id:
                for field in ["title", "description", "category", "target_date", "progress", "status"]:
                    val = getattr(data, field, None)
                    if val is not None:
                        g[field] = val
                g["updated"] = get_timestamp()
                save_goals(goals)
                return g
        raise HTTPException(404, "Goal not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str):
    try:
        goals = load_goals()
        goals = [g for g in goals if g["id"] != goal_id]
        save_goals(goals)
        append_audit({"action": "goal_deleted", "goal_id": goal_id})
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ─── Routes: Journal (4 endpoints) ───────────────────────────────

@app.get("/api/journal/entries")
def list_journal_entries():
    try:
        ensure_dir(JOURNAL_DIR)
        entries = []
        for f in sorted(JOURNAL_DIR.glob("*.md"), reverse=True):
            entries.append({
                "date": f.stem,
                "preview": f.read_text()[:200],
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return {"entries": entries}
    except Exception as e:
        return {"entries": [], "error": str(e)}

@app.get("/api/journal/entries/{entry_date}")
def get_journal_entry(entry_date: str):
    try:
        path = JOURNAL_DIR / f"{entry_date}.md"
        ensure_dir(JOURNAL_DIR)
        content = path.read_text() if path.exists() else ""
        return {"date": entry_date, "content": content}
    except Exception as e:
        return {"date": entry_date, "content": "", "error": str(e)}

@app.put("/api/journal/entries/{entry_date}")
def save_journal_entry(entry_date: str, data: JournalSave):
    try:
        ensure_dir(JOURNAL_DIR)
        path = JOURNAL_DIR / f"{entry_date}.md"
        path.write_text(data.content)
        append_audit({"action": "journal_saved", "date": entry_date})
        return {"status": "saved", "date": entry_date}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/journal/search")
def search_journal(q: str = Query("")):
    try:
        ensure_dir(JOURNAL_DIR)
        if not q:
            return {"results": []}
        results = []
        for f in JOURNAL_DIR.glob("*.md"):
            content = f.read_text()
            if q.lower() in content.lower():
                results.append({"date": f.stem, "preview": content[:200]})
        return {"results": results, "query": q}
    except Exception as e:
        return {"results": [], "error": str(e)}

# ─── Routes: Agent Health (3 endpoints) ──────────────────────────

@app.get("/api/agents/health")
def get_agent_health():
    try:
        agents = []
        for name in ["opencode", "hermes", "gemini"]:
            info = check_agent(name)
            info["uptime"] = 0
            info["success_rate"] = 100
            info["last_seen"] = get_timestamp()
            agents.append(info)
        return {"agents": agents, "updated": get_timestamp()}
    except Exception as e:
        return {"agents": [], "error": str(e), "updated": get_timestamp()}

@app.get("/api/agents/{name}/stats")
def get_agent_stats(name: str):
    try:
        if name not in ["opencode", "hermes", "gemini"]:
            raise HTTPException(400, "Invalid agent")
        info = check_agent(name)
        return {
            "name": name,
            "status": info["status"],
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "avg_response_time": 0,
            "last_seen": get_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/agents/health/refresh")
def refresh_agent_health():
    try:
        agents = []
        for name in ["opencode", "hermes", "gemini"]:
            info = check_agent(name)
            agents.append(info)
        append_audit({"action": "agent_health_refreshed"})
        return {"agents": agents, "updated": get_timestamp()}
    except Exception as e:
        return {"agents": [], "error": str(e)}

# ─── Routes: Smart Router (2 endpoints) ─────────────────────────

ROUTER_RULES = {
    "opencode": ["code", "devops", "deploy", "git", "file", "terraform", "docker", "test", "build", "infra", "script"],
    "hermes": ["memory", "schedule", "channel", "skill", "cron", "reminder", "brain", "plugin", "backup"],
    "gemini": ["research", "analyze", "search", "compare", "explain", "study", "learn", "document", "report", "review"],
}

@app.post("/api/router/suggest")
def router_suggest(data: RouterSuggest):
    try:
        task_lower = data.task.lower()
        scores = {}
        for agent, keywords in ROUTER_RULES.items():
            scores[agent] = sum(1 for k in keywords if k in task_lower)
        best = max(scores, key=scores.get)
        confidence = "high" if scores[best] >= 2 else "medium" if scores[best] == 1 else "low"
        return {
            "suggested_agent": best,
            "confidence": confidence,
            "scores": scores,
            "task": data.task,
        }
    except Exception as e:
        return {"suggested_agent": "opencode", "confidence": "low", "error": str(e)}

@app.post("/api/router/route")
def router_route(data: RouterRoute):
    try:
        agent = data.agent.lower()
        if agent not in ["opencode", "hermes", "gemini"]:
            return {"status": "error", "message": f"Invalid agent: {agent}"}
        append_audit({"action": "task_routed", "agent": agent, "task_preview": data.task[:50]})
        return {
            "status": "routed",
            "agent": agent,
            "task": data.task,
            "message": f"Task routed to {agent}",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─── Routes: Learning Analytics (2 endpoints) ───────────────────

@app.get("/api/analytics/skills")
def get_skill_analytics():
    try:
        skills_dir = BASE_DIR / "skills"
        analytics = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                eval_path = d / "eval.json"
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                eval_data = json.loads(eval_path.read_text()) if eval_path.exists() else {}
                avg_score = sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0
                analytics.append({
                    "name": d.name,
                    "total_runs": len(scores),
                    "avg_score": round(avg_score, 1),
                    "last_score": scores[-1].get("score", 0) if scores else 0,
                    "trend": "up" if len(scores) >= 2 and scores[-1].get("score", 0) > scores[-2].get("score", 0) else "down" if len(scores) >= 2 else "stable",
                })
        return {"skills": sorted(analytics, key=lambda x: x["total_runs"], reverse=True)}
    except Exception as e:
        return {"skills": [], "error": str(e)}

@app.get("/api/analytics/trends")
def get_trend_analytics():
    try:
        skills_dir = BASE_DIR / "skills"
        trends = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                if scores:
                    trends.append({
                        "name": d.name,
                        "scores": [s.get("score", 0) for s in scores[-10:]],
                        "labels": [s.get("date", "") for s in scores[-10:]],
                    })
        return {"trends": trends}
    except Exception as e:
        return {"trends": [], "error": str(e)}

# ─── Routes: Session Replay (2 endpoints) ───────────────────────

@app.get("/api/sessions/list")
def list_sessions():
    try:
        sessions = []
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_dir = sessions_dir / "log"
        if log_dir.exists():
            for f in sorted(log_dir.glob("*.log"), reverse=True)[:20]:
                sessions.append({
                    "id": f.stem,
                    "name": f.stem,
                    "size": f.stat().st_size,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "source": "opencode",
                })
        hermes_sessions = Path.home() / ".hermes" / "sessions.json"
        if hermes_sessions.exists():
            sessions.append({
                "id": "hermes-sessions",
                "name": "Hermes Session Archive",
                "size": hermes_sessions.stat().st_size,
                "modified": datetime.fromtimestamp(hermes_sessions.stat().st_mtime).isoformat(),
                "source": "hermes",
            })
        return {"sessions": sessions}
    except Exception as e:
        return {"sessions": [], "error": str(e)}

@app.get("/api/sessions/{session_id}/replay")
def get_session_replay(session_id: str):
    try:
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_file = sessions_dir / "log" / f"{session_id}.log"
        if log_file.exists():
            content = log_file.read_text()
            lines = content.split("\n")
            messages = []
            for line in lines:
                if "user:" in line.lower() or "assistant:" in line.lower():
                    messages.append(line)
            return {
                "session_id": session_id,
                "lines": len(lines),
                "messages": messages[:100],
                "content": content[:5000],
            }
        return {"session_id": session_id, "messages": [], "content": "Session log not found"}
    except Exception as e:
        return {"session_id": session_id, "messages": [], "error": str(e)}


# ─── Video Generation (Multiple Provider Support) ───

# Video provider API keys (loaded from environment)
VIDEO_API_KEYS = {
    "runway": os.environ.get("RUNWAY_API_KEY"),
    "pika": os.environ.get("PIKA_API_KEY"),
    "luma": os.environ.get("LUMA_API_KEY"),
    "replicate": os.environ.get("REPLICATE_API_TOKEN"),  # For Stable Video Diffusion
}

async def generate_video_runway(prompt: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9") -> dict:
    """Generate video using Runway Gen-2 API."""
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("runway")
    if not api_key:
        return {"error": "RUNWAY_API_KEY not configured"}
    
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "prompt": prompt,
                "duration": min(duration, 16),  # Runway max 16s
                "fps": fps,
                "aspect_ratio": aspect_ratio,
                "model": "gen-2",
            }
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            
            async with session.post(
                "https://api.runwayml.com/v1/generate",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=180)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {
                        "url": result.get("video_url") or result.get("output", [None])[0],
                        "status": "completed",
                        "job_id": result.get("id"),
                    }
                else:
                    error_text = await resp.text()
                    return {"error": f"Runway API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Runway generation failed: {str(e)}"}

async def generate_video_pika(prompt: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9") -> dict:
    """Generate video using Pika Labs API."""
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("pika")
    if not api_key:
        return {"error": "PIKA_API_KEY not configured"}
    
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "prompt": prompt,
                "duration": min(duration, 10),  # Pika max 10s
                "fps": fps,
                "aspect_ratio": aspect_ratio,
            }
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            
            async with session.post(
                "https://api.pika.art/v1/generate",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=180)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {
                        "url": result.get("video_url") or result.get("output_url"),
                        "status": "completed",
                        "job_id": result.get("id"),
                    }
                else:
                    error_text = await resp.text()
                    return {"error": f"Pika API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Pika generation failed: {str(e)}"}

async def generate_video_luma(prompt: str, duration: int = 5, fps: int = 24, aspect_ratio: str = "16:9") -> dict:
    """Generate video using Luma Dream Machine API."""
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("luma")
    if not api_key:
        return {"error": "LUMA_API_KEY not configured"}
    
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "prompt": prompt,
                "duration": min(duration, 5),  # Luma max 5s
                "aspect_ratio": aspect_ratio,
                "loop": False,
            }
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            
            async with session.post(
                "https://api.lumalabs.ai/dream-machine/v1/generations",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=180)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {
                        "url": result.get("video_url"),
                        "status": "pending",
                        "job_id": result.get("id"),
                    }
                else:
                    error_text = await resp.text()
                    return {"error": f"Luma API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Luma generation failed: {str(e)}"}

async def generate_video_svd(prompt: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9") -> dict:
    """Generate video using Stable Video Diffusion via Replicate."""
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("replicate")
    if not api_key:
        return {"error": "REPLICATE_API_TOKEN not configured"}
    
    try:
        async with aiohttp.ClientSession() as session:
            # Stable Video Diffusion on Replicate
            payload = {
                "version": "stability-ai/stable-video-diffusion:latest",
                "input": {
                    "prompt": prompt,
                    "width": 1024 if aspect_ratio == "16:9" else 576,
                    "height": 576 if aspect_ratio == "16:9" else 1024,
                    "num_frames": min(duration * 8, 25),  # SVD max 25 frames
                    "fps": min(fps, 8),  # SVD typically 8-12 fps
                    "motion_bucket_id": 127,
                    "cond_aug": 0.02,
                }
            }
            
            headers = {
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json",
            }
            
            async with session.post(
                "https://api.replicate.com/v1/predictions",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 201:
                    result = await resp.json()
                    # Poll for completion
                    prediction_id = result["id"]
                    max_wait = 120  # seconds
                    start_time = time.time()
                    
                    while time.time() - start_time < max_wait:
                        await asyncio.sleep(5)
                        async with session.get(
                            f"https://api.replicate.com/v1/predictions/{prediction_id}",
                            headers=headers
                        ) as poll_resp:
                            if poll_resp.status == 200:
                                poll_result = await poll_resp.json()
                                if poll_result["status"] == "succeeded":
                                    output = poll_result.get("output", [])
                                    return {
                                        "url": output[0] if isinstance(output, list) else output,
                                        "status": "completed",
                                        "job_id": prediction_id,
                                    }
                                elif poll_result["status"] == "failed":
                                    return {"error": f"SVD generation failed: {poll_result.get('error', 'Unknown error')}"}
                    return {"error": "SVD generation timed out"}
                else:
                    error_text = await resp.text()
                    return {"error": f"Replicate API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"SVD generation failed: {str(e)}"}

# Main video generation dispatcher
async def generate_video_dispatch(prompt: str, model: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9") -> dict:
    """Dispatch video generation to the appropriate provider."""
    
    model_dispatch = {
        "gen-2": generate_video_runway,
        "runway-gen-2": generate_video_runway,
        "runway": generate_video_runway,
        "pika": generate_video_pika,
        "pika-1.0": generate_video_pika,
        "luma": generate_video_luma,
        "luma-dream-machine": generate_video_luma,
        "stable-video-diffusion": generate_video_svd,
        "svd": generate_video_svd,
        "replicate-svd": generate_video_svd,
    }
    
    handler = model_dispatch.get(model.lower())
    if not handler:
        return {"error": f"Unknown video model: {model}. Available: {', '.join(model_dispatch.keys())}"}
    
    return await handler(prompt, duration, fps, aspect_ratio)


class VideoGenerationRequest(BaseModel):
    prompt: str
    model: str = "gen-2"
    duration: int = 4
    fps: int = 8
    aspect_ratio: str = "16:9"

@app.post("/api/video/generate")
async def generate_video(data: VideoGenerationRequest):
    """Generate video using specified provider."""
    result = await generate_video_dispatch(
        prompt=data.prompt,
        model=data.model,
        duration=data.duration,
        fps=data.fps,
        aspect_ratio=data.aspect_ratio
    )
    
    if "error" in result:
        raise HTTPException(500, result["error"])
    
    append_audit({
        "action": "video_generate",
        "model": data.model,
        "prompt": data.prompt[:100],
    })
    
    return {
        "url": result.get("url"),
        "status": result.get("status", "pending"),
        "job_id": result.get("job_id"),
        "model": data.model,
        "prompt": data.prompt,
    }

@app.get("/api/video/models")
async def list_video_models():
    """List available video generation models with provider info."""
    models = {
        "gen-2": {"name": "Runway Gen-2", "provider": "Runway", "max_duration": 16, "fps": [8, 12, 24], "requires_key": "RUNWAY_API_KEY", "aspect_ratios": ["16:9", "9:16", "1:1", "4:3"]},
        "pika": {"name": "Pika 1.0", "provider": "Pika Labs", "max_duration": 10, "fps": [24], "requires_key": "PIKA_API_KEY", "aspect_ratios": ["16:9", "9:16", "1:1"]},
        "luma-dream-machine": {"name": "Luma Dream Machine", "provider": "Luma AI", "max_duration": 5, "fps": [24], "requires_key": "LUMA_API_KEY", "aspect_ratios": ["16:9", "9:16", "1:1"]},
        "stable-video-diffusion": {"name": "Stable Video Diffusion (Replicate)", "provider": "Stability AI / Replicate", "max_duration": 4, "fps": [8, 12], "requires_key": "REPLICATE_API_TOKEN", "aspect_ratios": ["16:9", "9:16", "1:1", "4:3"]},
    }
    return {"models": models}

@app.get("/api/video/job/{job_id}")
async def get_video_job_status(job_id: str):
    """Check status of a video generation job."""
    # This would query the respective provider's job status endpoint
    return {"job_id": job_id, "status": "pending", "message": "Job status polling not yet implemented for all providers"}

@app.post("/api/video/job/{job_id}/cancel")
async def cancel_video_job(job_id: str):
    """Cancel a video generation job."""
    return {"job_id": job_id, "status": "cancelled", "message": "Cancellation not yet implemented for all providers"}


# ─── Jarvis Voice Assistant ───────────────────────────────────────────

# Jarvis configuration
JARVIS_CONFIG_FILE = BASE_DIR / "data" / "jarvis-config.json"
JARVIS_TASKS_FILE = BASE_DIR / "data" / "jarvis-tasks.json"
JARVIS_SCHEDULE_FILE = BASE_DIR / "data" / "jarvis-schedule.json"
JARVIS_BRIEFINGS_FILE = BASE_DIR / "data" / "jarvis-briefings.json"

def ensure_jarvis_files():
    for f in [JARVIS_CONFIG_FILE, JARVIS_TASKS_FILE, JARVIS_SCHEDULE_FILE, JARVIS_BRIEFINGS_FILE]:
        f.parent.mkdir(parents=True, exist_ok=True)
        if not f.exists():
            f.write_text("{}")

def load_jarvis_config() -> dict:
    if JARVIS_CONFIG_FILE.exists():
        try:
            return json.loads(JARVIS_CONFIG_FILE.read_text())
        except Exception:
            pass
    return {
        "wake_word": "jarvis",
        "voice": "elevenlabs",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel
        "briefing_time": "08:00",
        "auto_briefing": True,
        "tts_provider": "elevenlabs",
        "elevenlabs_api_key": os.environ.get("ELEVENLABS_API_KEY"),
        "openai_tts_api_key": os.environ.get("OPENAI_API_KEY"),
    }

def save_jarvis_config(config: dict):
    JARVIS_CONFIG_FILE.write_text(json.dumps(config, indent=2))

def load_jarvis_tasks() -> list:
    if JARVIS_TASKS_FILE.exists():
        try:
            return json.loads(JARVIS_TASKS_FILE.read_text())
        except Exception:
            pass
    return []

def save_jarvis_tasks(tasks: list):
    JARVIS_TASKS_FILE.write_text(json.dumps(tasks, indent=2))

def load_jarvis_schedule() -> list:
    if JARVIS_SCHEDULE_FILE.exists():
        try:
            return json.loads(JARVIS_SCHEDULE_FILE.read_text())
        except Exception:
            pass
    return []

def save_jarvis_schedule(schedule: list):
    JARVIS_SCHEDULE_FILE.write_text(json.dumps(schedule, indent=2))

def load_jarvis_briefings() -> list:
    if JARVIS_BRIEFINGS_FILE.exists():
        try:
            return json.loads(JARVIS_BRIEFINGS_FILE.read_text())
        except Exception:
            pass
    return []

def save_jarvis_briefings(briefings: list):
    JARVIS_BRIEFINGS_FILE.write_text(json.dumps(briefings, indent=2))

# ─── Jarvis Models ───
class JarvisConfigUpdate(BaseModel):
    wake_word: Optional[str] = None
    voice: Optional[str] = None
    voice_id: Optional[str] = None
    briefing_time: Optional[str] = None
    auto_briefing: Optional[bool] = None
    tts_provider: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    openai_tts_api_key: Optional[str] = None

class JarvisTaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  # low, medium, high
    due_date: Optional[str] = None
    assigned_agent: Optional[str] = None
    recurring: Optional[str] = None  # daily, weekly, monthly

class JarvisTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assigned_agent: Optional[str] = None
    completed: Optional[bool] = None
    recurring: Optional[str] = None

class JarvisScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    start_time: str
    end_time: str
    recurrence: Optional[str] = None  # daily, weekly, monthly
    agents: list[str] = []
    reminder_minutes: int = 15

class JarvisBriefingRequest(BaseModel):
    date: Optional[str] = None  # defaults to today
    style: str = "standard"  # standard, detailed, executive

class JarvisCoordinateRequest(BaseModel):
    command: str
    context: Optional[str] = ""

class JarvisTTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75

# ─── Jarvis API Endpoints ───
@app.get("/api/jarvis/config")
async def get_jarvis_config():
    """Get Jarvis configuration."""
    config = load_jarvis_config()
    # Don't expose API keys in response
    safe_config = {k: v for k, v in config.items() if not k.endswith("_api_key")}
    return safe_config

@app.put("/api/jarvis/config")
async def update_jarvis_config(data: JarvisConfigUpdate):
    """Update Jarvis configuration."""
    config = load_jarvis_config()
    update_data = data.dict(exclude_unset=True)
    config.update(update_data)
    save_jarvis_config(config)
    safe_config = {k: v for k, v in config.items() if not k.endswith("_api_key")}
    return {"config": safe_config, "message": "Configuration updated"}

@app.post("/api/jarvis/wake-word")
async def test_wake_word():
    """Test wake word detection (simulates wake word trigger)."""
    # In a real implementation, this would integrate with Porcupine or similar
    return {
        "status": "wake_word_detected",
        "wake_word": load_jarvis_config().get("wake_word", "jarvis"),
        "timestamp": get_timestamp(),
        "message": "Wake word detected - ready for command"
    }

@app.post("/api/jarvis/listen")
async def jarvis_listen(data: dict):
    """Process voice command after wake word."""
    command = data.get("command", "")
    if not command:
        raise HTTPException(400, "Command is required")
    
    # Process command through smart router
    suggested_agent = router_suggest(RouterSuggest(task=command))
    
    from fastapi import BackgroundTasks
    return {
        "command": command,
        "suggested_agent": suggested_agent.get("suggested_agent"),
        "confidence": suggested_agent.get("confidence"),
        "timestamp": get_timestamp(),
    }

@app.post("/api/jarvis/execute")
async def jarvis_execute(data: JarvisCoordinateRequest):
    """Execute a voice command by coordinating agents."""
    command = data.command
    context = data.context or ""
    
    # Determine best agent for command
    suggestion = router_suggest(RouterSuggest(task=command))
    agent = suggestion.get("suggested_agent", "hermes")
    
    # Build enhanced prompt with context
    prompt = f"""Voice command from Jarvis: "{command}"

Context: {context if context else "No additional context"}

Execute this task as the {agent} agent. Provide a clear, spoken response suitable for TTS."""
    
    # Execute via agent
    result = await execute_agent(agent, prompt)
    
    # Create task if needed
    task_id = None
    if any(word in command.lower() for word in ["create", "add", "schedule", "remind", "task"]):
        task = {
            "id": str(uuid.uuid4())[:8],
            "title": command[:80],
            "description": context,
            "priority": "medium",
            "created": get_timestamp(),
            "source": "jarvis_voice",
        }
        tasks = load_jarvis_tasks()
        tasks.append(task)
        save_jarvis_tasks(tasks)
        task_id = task["id"]
    
    append_audit({
        "action": "jarvis_execute",
        "command": command[:100],
        "agent": agent,
        "task_id": task_id,
    })
    
    return {
        "command": command,
        "agent": agent,
        "result": result,
        "task_id": task_id,
        "spoken_response": f"Done. {result[:200]}" if result else "Command executed.",
    }

@app.post("/api/jarvis/tts")
async def jarvis_tts(data: JarvisTTSRequest):
    """Generate speech using TTS (ElevenLabs or OpenAI)."""
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    config = load_jarvis_config()
    provider = config.get("tts_provider", "elevenlabs")
    
    if provider == "elevenlabs":
        api_key = config.get("elevenlabs_api_key") or os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            return {"error": "ElevenLabs API key not configured"}
        
        voice_id = data.voice_id or config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "text": data.text,
                    "model_id": data.model,
                    "voice_settings": {
                        "stability": data.stability,
                        "similarity_boost": data.similarity_boost,
                    }
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                async with session.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status == 200:
                        audio_data = await resp.read()
                        import base64
                        return {
                            "audio_base64": base64.b64encode(audio_data).decode(),
                            "format": "mp3",
                            "provider": "elevenlabs",
                        }
                    else:
                        error_text = await resp.text()
                        return {"error": f"ElevenLabs API error {resp.status}: {error_text}"}
        except Exception as e:
            return {"error": f"ElevenLabs TTS failed: {str(e)}"}
    
    elif provider == "openai":
        api_key = config.get("openai_tts_api_key") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {"error": "OpenAI API key not configured"}
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": "tts-1",
                    "input": data.text,
                    "voice": data.voice_id or "alloy",
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                async with session.post(
                    "https://api.openai.com/v1/audio/speech",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status == 200:
                        audio_data = await resp.read()
                        import base64
                        return {
                            "audio_base64": base64.b64encode(audio_data).decode(),
                            "format": "mp3",
                            "provider": "openai",
                        }
                    else:
                        error_text = await resp.text()
                        return {"error": f"OpenAI TTS error {resp.status}: {error_text}"}
        except Exception as e:
            return {"error": f"OpenAI TTS failed: {str(e)}"}
    
    return {"error": f"Unknown TTS provider: {provider}"}

# ─── Jarvis Task Management ───
@app.get("/api/jarvis/tasks")
async def list_jarvis_tasks(status: Optional[str] = None):
    """List all Jarvis tasks."""
    tasks = load_jarvis_tasks()
    if status:
        tasks = [t for t in tasks if t.get("completed") == (status == "completed")]
    return {"tasks": tasks}

@app.post("/api/jarvis/tasks")
async def create_jarvis_task(data: JarvisTaskCreate):
    """Create a new Jarvis task."""
    task = {
        "id": str(uuid.uuid4())[:8],
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "due_date": data.due_date,
        "assigned_agent": data.assigned_agent,
        "recurring": data.recurring,
        "completed": False,
        "created": get_timestamp(),
    }
    tasks = load_jarvis_tasks()
    tasks.append(task)
    save_jarvis_tasks(tasks)
    return {"task": task, "message": "Task created"}

@app.get("/api/jarvis/tasks/{task_id}")
async def get_jarvis_task(task_id: str):
    """Get a specific Jarvis task."""
    tasks = load_jarvis_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    return task

@app.patch("/api/jarvis/tasks/{task_id}")
async def update_jarvis_task(task_id: str, data: JarvisTaskUpdate):
    """Update a Jarvis task."""
    tasks = load_jarvis_tasks()
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            update_data = data.dict(exclude_unset=True)
            task.update(update_data)
            if task.get("completed"):
                task["completed_at"] = get_timestamp()
            save_jarvis_tasks(tasks)
            return {"task": task, "message": "Task updated"}
    raise HTTPException(404, "Task not found")

@app.delete("/api/jarvis/tasks/{task_id}")
async def delete_jarvis_task(task_id: str):
    """Delete a Jarvis task."""
    tasks = load_jarvis_tasks()
    tasks = [t for t in tasks if t["id"] != task_id]
    save_jarvis_tasks(tasks)
    return {"status": "deleted", "task_id": task_id}

@app.post("/api/jarvis/tasks/{task_id}/complete")
async def complete_jarvis_task(task_id: str):
    """Mark a task as completed."""
    tasks = load_jarvis_tasks()
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            task["completed_at"] = get_timestamp()
            save_jarvis_tasks(tasks)
            return {"task": task, "message": "Task completed"}
    raise HTTPException(404, "Task not found")

# ─── Jarvis Schedule Management ───
@app.get("/api/jarvis/schedule")
async def list_jarvis_schedule(date: Optional[str] = None):
    """List scheduled events."""
    schedule = load_jarvis_schedule()
    if date:
        schedule = [s for s in schedule if s.get("start_time", "").startswith(date)]
    return {"schedule": schedule}

@app.post("/api/jarvis/schedule")
async def create_jarvis_schedule(data: JarvisScheduleCreate):
    """Create a scheduled event."""
    event = {
        "id": str(uuid.uuid4())[:8],
        "title": data.title,
        "description": data.description,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "recurrence": data.recurrence,
        "agents": data.agents,
        "reminder_minutes": data.reminder_minutes,
        "created": get_timestamp(),
    }
    schedule = load_jarvis_schedule()
    schedule.append(event)
    save_jarvis_schedule(schedule)
    return {"event": event, "message": "Event created"}

@app.delete("/api/jarvis/schedule/{event_id}")
async def delete_jarvis_schedule(event_id: str):
    """Delete a scheduled event."""
    schedule = load_jarvis_schedule()
    schedule = [s for s in schedule if s["id"] != event_id]
    save_jarvis_schedule(schedule)
    return {"status": "deleted", "event_id": event_id}

# ─── Jarvis Briefings ───
@app.post("/api/jarvis/briefing")
async def generate_jarvis_briefing(data: JarvisBriefingRequest):
    """Generate a daily/periodic briefing."""
    date = data.date or datetime.now().strftime("%Y-%m-%d")
    style = data.style
    
    # Gather data for briefing
    tasks = load_jarvis_tasks()
    schedule = load_jarvis_schedule()
    today_schedule = [s for s in schedule if s.get("start_time", "").startswith(date)]
    pending_tasks = [t for t in tasks if not t.get("completed") and (t.get("due_date") == date or not t.get("due_date"))]
    completed_today = [t for t in tasks if t.get("completed") and t.get("completed_at", "").startswith(date)]
    
    # Get agent status
    agent_status = get_agent_health()
    
    # Generate briefing content
    briefing_content = f"Good morning! Here's your briefing for {date}.\n\n"
    
    if style == "executive":
        briefing_content += f"**Summary**: {len(pending_tasks)} pending tasks, {len(today_schedule)} scheduled events, {len(completed_today)} completed today.\n\n"
    else:
        briefing_content += f"• **Pending Tasks**: {len(pending_tasks)}\n"
        briefing_content += f"• **Today's Schedule**: {len(today_schedule)} events\n"
        briefing_content += f"• **Completed Today**: {len(completed_today)}\n\n"
    
    if today_schedule:
        briefing_content += "**Today's Schedule:**\n"
        for event in today_schedule[:5]:
            briefing_content += f"  • {event.get('start_time', '').split('T')[1][:5]} - {event['title']}\n"
        briefing_content += "\n"
    
    if pending_tasks:
        briefing_content += "**Top Pending Tasks:**\n"
        for task in pending_tasks[:5]:
            briefing_content += f"  • {task['title']} ({task.get('priority', 'medium')})\n"
        briefing_content += "\n"
    
    # Agent status summary
    briefing_content += "**Agent Status:**\n"
    for agent in agent_status.get("agents", []):
        status_icon = "🟢" if agent["status"] == "online" else "🔴" if agent["status"] == "offline" else "🟡"
        briefing_content += f"  {status_icon} {agent['name'].capitalize()}: {agent['status']}\n"
    
    # Save briefing
    briefing = {
        "id": str(uuid.uuid4())[:8],
        "date": date,
        "style": style,
        "content": briefing_content,
        "generated": get_timestamp(),
    }
    briefings = load_jarvis_briefings()
    briefings.append(briefing)
    save_jarvis_briefings(briefings)
    
    return {
        "briefing": briefing,
        "tts_text": briefing_content.replace("**", "").replace("•", "").replace("-", ""),
    }

@app.get("/api/jarvis/briefings")
async def list_jarvis_briefings(limit: int = 10):
    """List recent briefings."""
    briefings = load_jarvis_briefings()
    return {"briefings": briefings[-limit:]}

@app.get("/api/jarvis/briefings/{briefing_id}")
async def get_jarvis_briefing(briefing_id: str):
    """Get a specific briefing."""
    briefings = load_jarvis_briefings()
    briefing = next((b for b in briefings if b["id"] == briefing_id), None)
    if not briefing:
        raise HTTPException(404, "Briefing not found")
    return briefing

# ─── Jarvis Wake Word Detection (Porcupine Integration Guide) ───
@app.get("/api/jarvis/wake-word/setup")
async def jarvis_wake_word_setup():
    """Get setup instructions for wake word detection."""
    config = load_jarvis_config()
    wake_word = config.get("wake_word", "jarvis")
    
    return {
        "wake_word": wake_word,
        "providers": {
            "porcupine": {
                "name": "Picovoice Porcupine",
                "description": "Cross-platform wake word engine with WebAssembly support",
                "setup": [
                    "1. Sign up at https://console.picovoice.ai/",
                    "2. Create a custom wake word or use built-in ones",
                    "3. Get your AccessKey",
                    "4. Add PORCUPINE_ACCESS_KEY to environment variables",
                    "5. Install @picovoice/porcupine-web-react or similar for browser",
                ],
            }
        },
        "snowboy": {
            "name": "Snowboy (Legacy)",
            "description": "Alternative wake word engine (deprecated but functional)",
            "note": "Snowboy is deprecated. Consider Porcupine for new implementations.",
        }
    },
    "current_config": {
        "wake_word": wake_word,
        "sensitivity": 0.5,
    }

# ─── Jarvis Daily Briefing Scheduler ───
async def run_jarvis_daily_briefing():
    """Scheduled job to run daily briefing."""
    config = load_jarvis_config()
    if not config.get("auto_briefing"):
        return
    
    briefing_time = config.get("briefing_time", "08:00")
    now = datetime.now().strftime("%H:%M")
    if now != briefing_time:
        return
    
    date = datetime.now().strftime("%Y-%m-%d")
    briefing = await generate_jarvis_briefing(JarvisBriefingRequest(date=date, style="standard"))
    
    # Send to all connected Jarvis WebSocket clients
    # This would need integration with the connection manager
    append_audit({"action": "jarvis_briefing_generated", "date": briefing["date"]})


# ─── Jarvis Voice Commands (WebSocket) ───
@app.websocket("/ws/jarvis")
async def websocket_jarvis(websocket: WebSocket):
    """WebSocket for real-time Jarvis voice interaction."""
    # Validate token
    token = websocket.query_params.get("token")
    if token:
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return
    else:
        api_key = websocket.query_params.get("api_key")
        if not api_key or api_key not in VALID_API_KEYS:
            await websocket.close(code=4001, reason="Authentication required")
            return
    
    await manager.connect(websocket)
    try:
        # Send initial status
        config = load_jarvis_config()
        await manager.send_personal(websocket, {
            "type": "jarvis_ready",
            "data": {
                "wake_word": config.get("wake_word", "jarvis"),
                "status": "listening",
            }
        })
        
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "voice_command":
                    command = msg.get("command", "")
                    if command:
                        # Process through Jarvis
                        result = await jarvis_execute(JarvisCoordinateRequest(
                            command=command,
                            context=msg.get("context", "")
                        ))
                        await manager.send_personal(websocket, {
                            "type": "jarvis_response",
                            "data": result
                        })
                elif msg.get("type") == "wake_word":
                    await manager.send_personal(websocket, {
                        "type": "wake_word_ack",
                        "data": {"status": "ready", "wake_word": load_jarvis_config().get("wake_word", "jarvis")}
                    })
            except Exception as e:
                await manager.send_personal(websocket, {
                    "type": "error",
                    "data": {"message": str(e)}
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ─── Routes: Dashboard Static Files ──────────────────────────────
if dashboard_dir.exists():
    app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir)), name="dashboard")

@app.get("/", response_class=HTMLResponse)
def index():
    html_file = BASE_DIR / "dashboard" / "index.html"
    if html_file.exists():
        content = html_file.read_text()
        content = content.replace('href="styles.css"', 'href="/dashboard/styles.css"')
        content = content.replace('src="utils.js"', 'src="/dashboard/utils.js"')
        content = content.replace('src="api.js"', 'src="/dashboard/api.js"')
        content = content.replace('src="app.js"', 'src="/dashboard/app.js"')
        content = content.replace('pages/', '/dashboard/pages/')
        return HTMLResponse(content=content)
    return HTMLResponse("<h1>Agentic OS</h1><p>Dashboard not built yet. Run <code>./install.sh</code> first.</p>")

# ─── Favicon ──────────────────────────────────────────────────────

FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6c5ce7"/><stop offset="100%" stop-color="#fd79a8"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><polygon points="16,6 24,11 24,21 16,26 8,21 8,11" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="white"/></svg>'

@app.get("/favicon.ico")
def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")

@app.get("/favicon.svg")
def favicon_svg():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")

# ─── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
