"""
Handoffs endpoints: inter-agent handoff protocol.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, append_audit, get_current_user, get_timestamp
import json
import uuid

router = APIRouter()

HANDOFF_DIR = BASE_DIR / "data" / "handoffs"
HANDOFF_DIR.mkdir(parents=True, exist_ok=True)

def load_handoffs():
    handoffs = []
    for f in sorted(HANDOFF_DIR.glob("*.json")):
        handoffs.append(json.loads(f.read_text()))
    return handoffs

@router.post("/")
async def create_handoff(data: dict, user: dict = Depends(get_current_user)):
    handoff = {
        "id": str(uuid.uuid4())[:8],
        "from_agent": data.get("from_agent", ""),
        "to_agent": data.get("to_agent", ""),
        "task_id": data.get("task_id", str(uuid.uuid4())[:8]),
        "context_summary": data.get("context_summary", ""),
        "pending_decisions": data.get("pending_decisions", []),
        "output_files": data.get("output_files", []),
        "status": data.get("status", "pending"),
        "created": get_timestamp(),
        "updated": get_timestamp(),
    }
    (HANDOFF_DIR / f"{handoff['id']}.json").write_text(json.dumps(handoff, indent=2))
    append_audit({"action": "handoff_created", "from": handoff["from_agent"], "to": handoff["to_agent"], "user": user.get("user_id") or user.get("api_key")})
    return handoff

@router.get("/")
async def list_handoffs(user: dict = Depends(get_current_user)):
    handoffs = load_handoffs()
    return {"handoffs": handoffs}

@router.get("/{handoff_id}")
async def get_handoff(handoff_id: str, user: dict = Depends(get_current_user)):
    path = HANDOFF_DIR / f"{handoff_id}.json"
    if not path.exists():
        raise HTTPException(404, "Handoff not found")
    return json.loads(path.read_text())

@router.patch("/{handoff_id}")
async def update_handoff(handoff_id: str, data: dict, user: dict = Depends(get_current_user)):
    path = HANDOFF_DIR / f"{handoff_id}.json"
    if not path.exists():
        raise HTTPException(404, "Handoff not found")
    handoff = json.loads(path.read_text())
    for k, v in data.items():
        handoff[k] = v
    handoff["updated"] = get_timestamp()
    path.write_text(json.dumps(handoff, indent=2))
    append_audit({"action": "handoff_updated", "handoff_id": handoff_id, "user": user.get("user_id") or user.get("api_key")})
    return handoff