#!/usr/bin/env python3
"""Agentic OS — APScheduler engine for recurring tasks"""
import json
import subprocess
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
except ImportError:
    print("Install APScheduler: pip install apscheduler")
    sys.exit(1)

BASE_DIR = Path(__file__).parent.parent.resolve()
JOBS_DIR = BASE_DIR / "scheduler" / "jobs"
SKILLS_DIR = BASE_DIR / "skills"
ROUTES_FILE = BASE_DIR / "data" / "agent-routes.json"
AUDIT_FILE = BASE_DIR / "audit" / "audit.log"
HANDOFF_DIR = BASE_DIR / "data" / "handoffs"

def load_routing_rules():
    """Load agent routing rules from config."""
    try:
        if ROUTES_FILE.exists():
            return json.loads(ROUTES_FILE.read_text())
    except Exception:
        pass
    return {"routing_rules": [], "agent_capabilities": {}}

def get_skill_agent(skill_name: str, routing_rules: dict) -> str:
    """Determine which agent should run a skill based on skill config and routing rules."""
    # First check skill's SKILL.md for explicit agent assignment
    skill_path = SKILLS_DIR / skill_name / "SKILL.md"
    if skill_path.exists():
        content = skill_path.read_text()
        for line in content.split('\n'):
            line = line.strip()
            if "Primary:" in line:
                candidate = line.split(":")[-1].strip().lower()
                if candidate in ("opencode", "crush", "hermes", "gemini", "claude"):
                    return candidate
    
    # Fall back to keyword-based routing from agent-routes.json
    rules = routing_rules.get("routing_rules", [])
    for rule in rules:
        pattern = rule.get("pattern", "")
        target = rule.get("target", "opencode")
        # Simple keyword matching
        if any(keyword in skill_name.lower() for keyword in pattern.split("|")):
            return target
    
    # Default to opencode
    return "opencode"

def run_cli(args: list, timeout: int = 30) -> tuple:
    """Run CLI command and return (code, stdout, stderr)."""
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Timeout after {timeout}s"
    except FileNotFoundError:
        return -1, "", f"Command not found: {args[0]}"
    except Exception as e:
        return -1, "", str(e)

def execute_agent(agent: str, prompt: str) -> str:
    """Execute a prompt via the specified agent."""
    # Support both "opencode" (legacy) and "crush" (current) as code agent
    if agent in ("opencode", "crush"):
        cli_cmd = "crush" if agent == "crush" else "opencode"
        try:
            if cli_cmd == "crush":
                code, out, err = run_cli(["crush", "run", "-q", prompt], timeout=60)
            else:
                code, out, err = run_cli(["opencode", "run", "--format", "json", prompt], timeout=30)
        except Exception as e:
            if "timeout" in str(e).lower():
                return f"⏱ Agent '{cli_cmd}' timed out.\n\n{cli_cmd.capitalize()}'s model is taking too long. Try running `{cli_cmd} run \"{prompt[:60]}\"` directly in your terminal.\n\n**Message:** {prompt[:100]}"
            return f"⚠ Error communicating with {cli_cmd}: {str(e)}"
        if code == 0:
            if cli_cmd == "crush":
                cleaned = (out or "").strip()
                if cleaned:
                    return cleaned
                return f"**{cli_cmd}**\n\nProcessed your message.\n\n**Message:** {prompt[:100]}"
            else:
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
                return f"**opencode**\n\nProcessed your message.\n\n**Message:** {prompt[:100]}"
        err_msg = (err or "").strip()
        if "provider" in err_msg.lower() or "configured" in err_msg.lower() or "api_key" in err_msg.lower():
            return f"**{cli_cmd} needs setup**\n\nConfigure your API key (e.g., OPENROUTER_API_KEY, ANTHROPIC_API_KEY, etc.).\n\n**Details:** {err_msg[:300]}"
        return err_msg or f"{cli_cmd} returned exit code {code}"

    elif agent == "hermes":
        code, out, err = run_cli(["hermes", "chat", "-q", prompt], timeout=180)
        if code == 0:
            # Clean Hermes output (strip box formatting)
            lines = (out or "").split('\n')
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
                    cleaned = line.strip()
                    if cleaned:
                        content_lines.append(cleaned)
            if content_lines:
                return '\n'.join(content_lines)
            return f"**Hermes**\n\nReceived your message but the model returned an empty response."
        err_msg = (err or "").strip()
        if "invalid choice" in err_msg or "usage:" in err_msg:
            return f"**Hermes needs setup**\n\nRun `hermes setup` or check your config.\n\n**Details:** {err_msg[:200]}"
        return err_msg or f"hermes returned exit code {code}"

    elif agent == "gemini":
        # Try with model flag first, then fallback
        for args, to in [[["-y", "-m", "gemini-2.5-flash", prompt], 60], [["-y", prompt], 40]]:
            code, out, err = run_cli(["gemini", *args], timeout=to)
            if code == 0:
                return (out or "").strip() or f"**Gemini CLI**\n\nProcessed your query."
            err_msg = (err or "").strip()
            if "model" in err_msg.lower() or "not found" in err_msg.lower():
                continue
            if "auth" in err_msg.lower() or "login" in err_msg.lower():
                return f"**Gemini needs re-auth**\n\nRun `gemini auth login` to re-authenticate.\n\n**Details:** {err_msg[:200]}"
            return err_msg or f"gemini returned exit code {code}"
        return "Gemini CLI did not return a response."

    elif agent == "claude":
        try:
            from anthropic import Anthropic
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                return f"⚠ Claude needs ANTHROPIC_API_KEY environment variable set."
            client = Anthropic(api_key=api_key)
            model = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text if response.content else "**Claude**\n\nNo response received."
        except Exception as e:
            return f"⚠ Error communicating with claude: {str(e)}"

    elif agent == "codex":
        try:
            code, out, err = run_cli(["codex", "exec", prompt], timeout=60)
        except subprocess.TimeoutExpired:
            return f"⏱ Codex timed out.\n\nTry running `codex exec \"{prompt[:60]}\"` directly.\n\n**Message:** {prompt[:100]}"
        if code == 0:
            return (out or "").strip() or f"**Codex**\n\nProcessed your query.\n\n**Message:** {prompt}"
        err_msg = (err or "").strip()
        if "auth" in err_msg.lower() or "login" in err_msg.lower():
            return f"**Codex needs auth**\n\nRun `codex auth login` to authenticate.\n\n**Details:** {err_msg[:200]}"
        return err_msg or f"codex returned exit code {code}"

    elif agent == "openclaw":
        return f"**OpenClaw**\n\nRouting and orchestration agent. Coordinates task decomposition and agent handoffs.\n\n**Task:** {prompt[:200]}"

    elif agent == "jarvis":
        return f"**Jarvis**\n\nVoice-first executive assistant. Handles scheduling, task management, and agent coordination.\n\n**Command:** {prompt[:200]}"

    elif agent == "odysseus":
        return f"**Odysseus**\n\nAutonomous planning and research agent. Handles multi-step planning, deep research, and goal decomposition.\n\n**Objective:** {prompt[:200]}"

    elif agent == "antigravity":
        return f"**Antigravity**\n\nResearch and discovery specialist. Handles web research, experimentation, competitive analysis, and technology scouting.\n\n**Investigation:** {prompt[:200]}"

    else:
        return f"Unknown agent: {agent}"

def run_skill_chain(skills: list, initial_input: str = ""):
    """Execute a chain of skills by calling the chain API endpoint."""
    import requests
    import uuid

    task_id = str(uuid.uuid4())[:8]
    routing_rules = load_routing_rules()

    print(f"[{datetime.now().isoformat()}] Running skill chain: {skills} via chain API")

    # Use the internal chain execution logic (similar to server.py's run_skill_chain)
    # For scheduler, we'll execute step by step locally
    context = initial_input
    results = []

    for i, skill_name in enumerate(skills):
        skill_path = SKILLS_DIR / skill_name
        if not skill_path.exists():
            results.append({
                "step": i + 1,
                "skill": skill_name,
                "status": "failed",
                "error": f"Skill not found: {skill_name}",
            })
            break

        # Build prompt with previous context
        skill_md = skill_path.joinpath("SKILL.md").read_text() if skill_path.joinpath("SKILL.md").exists() else ""
        learnings = skill_path.joinpath("learnings.md").read_text() if skill_path.joinpath("learnings.md").exists() else ""

        prompt = f"Execute the '{skill_name}' skill (step {i + 1} of {len(skills)}).\n\n"
        if skill_md:
            prompt += f"## Skill Instructions\n{skill_md}\n\n"
        if learnings and learnings.strip():
            prompt += f"## Past Learnings\n{learnings}\n\n"
        if context:
            prompt += f"## Previous Step Output\n{context}\n\n"
        if i > 0:
            prompt += f"## Chain Context\nThis is step {i + 1} in a multi-skill chain (task: {task_id}).\n"
            prompt += "Use the previous step's output as your input context.\n\n"

        # Determine agent for this skill
        agent = get_skill_agent(skill_name, routing_rules)

        run_id = str(uuid.uuid4())[:8]

        # Log execution
        entry = {
            "action": "scheduler_chain_step",
            "task_id": task_id,
            "step": i + 1,
            "skill": skill_name,
            "agent": agent,
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open(AUDIT_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")

        print(f"[{datetime.now().isoformat()}] Running chain step {i+1}/{len(skills)}: {skill_name} via {agent}")

        # Execute via agent
        response_text = execute_agent(agent, prompt)

        # Save to learnings
        timestamp = datetime.now(timezone.utc).isoformat()[:10]
        learnings_path = skill_path / "learnings.md"
        existing = learnings_path.read_text() if learnings_path.exists() else ""
        new_entry = (
            f"\n## {timestamp} (Scheduler Chain {task_id} Step {i + 1} Run {run_id})\n"
            f"- Agent: {agent}\n"
            f"- Input: (from previous step)\n"
            f"- Output: {response_text[:500]}\n"
        )
        learnings_path.write_text(existing + new_entry)

        # Log execution
        entry = {
            "action": "skill_run",
            "skill": skill_name,
            "agent": agent,
            "run_id": run_id,
            "task_id": task_id,
            "chain_step": i + 1,
            "output_preview": response_text[:100],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open(AUDIT_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")

        # Create handoff for next step if not last
        if i < len(skills) - 1:
            next_skill = skills[i + 1]
            next_agent = get_skill_agent(next_skill, routing_rules)
            handoff_id = str(uuid.uuid4())[:8]
            HANDOFF_DIR.mkdir(parents=True, exist_ok=True)
            handoff = {
                "id": handoff_id,
                "from_agent": agent,
                "to_agent": next_agent,
                "task_id": task_id,
                "context_summary": f"Completed {skill_name}, output passed to {next_skill}",
                "pending_decisions": [],
                "output_files": [str(learnings_path)],
                "status": "completed",
                "created": datetime.now(timezone.utc).isoformat(),
                "updated": datetime.now(timezone.utc).isoformat(),
            }
            (HANDOFF_DIR / f"{handoff_id}.json").write_text(json.dumps(handoff, indent=2))
            entry = {
                "action": "handoff_created",
                "from_agent": agent,
                "to_agent": next_agent,
                "task_id": task_id,
                "handoff_id": handoff_id,
                "chain_step": i + 1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            with open(AUDIT_FILE, "a") as f:
                f.write(json.dumps(entry) + "\n")

        step_result = {
            "step": i + 1,
            "skill": skill_name,
            "agent": agent,
            "run_id": run_id,
            "status": "completed" if "⚠" not in response_text and "⏱" not in response_text else "failed",
            "output": response_text,
        }
        results.append(step_result)

        # Pass output to next step
        context = response_text

    print(f"[{datetime.now().isoformat()}] Completed skill chain: {skills}")
    return results


def run_skill(skill_name: str):
    """Execute a skill by invoking the appropriate agent."""
    routing_rules = load_routing_rules()
    agent = get_skill_agent(skill_name, routing_rules)
    
    # Build prompt from skill instructions
    skill_path = SKILLS_DIR / skill_name / "SKILL.md"
    learnings_path = SKILLS_DIR / skill_name / "learnings.md"
    
    skill_md = skill_path.read_text() if skill_path.exists() else ""
    learnings = learnings_path.read_text() if learnings_path.exists() else ""
    
    prompt = f"Execute the '{skill_name}' skill.\n\n"
    if skill_md:
        prompt += f"## Skill Instructions\n{skill_md}\n\n"
    if learnings and learnings.strip():
        prompt += f"## Past Learnings\n{learnings}\n\n"
    
    entry = {
        "action": "scheduler_run",
        "skill": skill_name,
        "agent": agent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    
    print(f"[{datetime.now().isoformat()}] Running skill: {skill_name} via {agent}")
    
    response_text = execute_agent(agent, prompt)
    
    # Save output to learnings.md
    timestamp = datetime.now(timezone.utc).isoformat()[:10]
    existing = learnings_path.read_text() if learnings_path.exists() else ""
    new_entry = (
        f"\n## {timestamp} (Scheduler Run)\n"
        f"- Agent: {agent}\n"
        f"- Input: (scheduled)\n"
        f"- Output: {response_text[:500]}\n"
    )
    learnings_path.write_text(existing + new_entry)
    
    # Log execution
    entry = {
        "action": "skill_run",
        "skill": skill_name,
        "agent": agent,
        "output_preview": response_text[:100],
    }
    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    
    print(f"[{datetime.now().isoformat()}] Completed skill: {skill_name}")

def load_jobs(scheduler: BackgroundScheduler):
    """Load job definitions from jobs/ directory."""
    for job_file in JOBS_DIR.glob("*.json"):
        data = json.loads(job_file.read_text())
        if not data.get("enabled", True):
            continue

        if data.get("skills"):  # skill chain
            scheduler.add_job(
                run_skill_chain,
                CronTrigger.from_crontab(data["cron"]),
                args=[data["skills"]],
                id=data.get("id", data["name"]),
                name=data["name"],
                replace_existing=True,
            )
            print(f"  Scheduled chain: {data['name']} ({data['cron']}) — skills: {', '.join(data['skills'])}")
        else:  # single skill
            scheduler.add_job(
                run_skill,
                CronTrigger.from_crontab(data["cron"]),
                args=[data["skill"]],
                id=data.get("id", data["name"]),
                name=data["name"],
                replace_existing=True,
            )
            print(f"  Scheduled: {data['name']} ({data['cron']})")

def main():
    scheduler = BackgroundScheduler()
    load_jobs(scheduler)
    scheduler.start()
    print(f"Agentic OS Scheduler running. Jobs loaded from: {JOBS_DIR}")
    try:
        while True:
            import time
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.shutdown()
        print("Scheduler stopped.")

if __name__ == "__main__":
    main()