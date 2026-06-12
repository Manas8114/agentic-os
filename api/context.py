"""
Context Injection endpoints: rules management and automatic injection.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from api.deps import BASE_DIR, append_audit, get_current_user, get_timestamp
import json
import uuid

router = APIRouter()

CONTEXT_RULES_FILE = BASE_DIR / "data" / "context-injection-rules.json"
CONTEXT_RULES_FILE.parent.mkdir(parents=True, exist_ok=True)

def load_rules():
    if CONTEXT_RULES_FILE.exists():
        try:
            return json.loads(CONTEXT_RULES_FILE.read_text())
        except Exception:  # Fix #14: was bare except:
            pass
    return {"rules": [], "version": 1}

def save_rules(rules):
    CONTEXT_RULES_FILE.write_text(json.dumps(rules, indent=2))

async def inject_context(task: str, agent: str) -> str:
    """Auto-inject relevant context based on rules"""
    rules = load_rules()
    task_lower = task.lower()
    injected = []
    for rule in rules.get("rules", []):
        if not rule.get("enabled", True):
            continue
        pattern = rule.get("pattern", "").lower()
        if pattern and pattern in task_lower:
            file_path = BASE_DIR / rule.get("file", "")
            if file_path.exists():
                content = file_path.read_text()[:2000]
                injected.append(f"## Context from {rule.get('file', 'unknown')}\n{content}")
    return "\n\n".join(injected) if injected else ""

@router.get("/rules")
async def list_context_rules(user: dict = Depends(get_current_user)):
    return load_rules()

@router.post("/rules")
async def create_context_rule(data: dict, user: dict = Depends(get_current_user)):
    rules = load_rules()
    rule = {"id": str(uuid.uuid4())[:8], "pattern": data.get("pattern", ""), "file": data.get("file", ""), "enabled": data.get("enabled", True), "created": get_timestamp()}
    rules.setdefault("rules", []).append(rule)
    save_rules(rules)
    append_audit({"action": "context_rule_created", "pattern": rule["pattern"], "user": user.get("user_id") or user.get("api_key")})
    return rule

@router.patch("/rules/{rule_id}")
async def update_context_rule(rule_id: str, data: dict, user: dict = Depends(get_current_user)):
    rules = load_rules()
    for rule in rules.get("rules", []):
        if rule["id"] == rule_id:
            for k, v in data.items():
                rule[k] = v
            save_rules(rules)
            append_audit({"action": "context_rule_updated", "rule_id": rule_id, "user": user.get("user_id") or user.get("api_key")})
            return rule
    raise HTTPException(404, "Rule not found")

@router.delete("/rules/{rule_id}")
async def delete_context_rule(rule_id: str, user: dict = Depends(get_current_user)):
    rules = load_rules()
    rules["rules"] = [r for r in rules.get("rules", []) if r["id"] != rule_id]
    save_rules(rules)
    append_audit({"action": "context_rule_deleted", "rule_id": rule_id, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "deleted"}

@router.post("/inject")
async def manual_inject(data: dict, user: dict = Depends(get_current_user)):
    task = data.get("task", "")
    agent = data.get("agent", "")
    context = await inject_context(task, agent)
    return {"context": context}