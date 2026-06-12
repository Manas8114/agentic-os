"""
Cost Analytics endpoints: tracking and reporting.
"""
from fastapi import APIRouter, Depends
from api.deps import BASE_DIR, get_current_user, get_timestamp
import json

router = APIRouter()

COST_FILE = BASE_DIR / "data" / "cost-history.json"

@router.get("/")
async def get_cost(user: dict = Depends(get_current_user)):
    if not COST_FILE.exists():
        return {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    return json.loads(COST_FILE.read_text())

@router.post("/record")
async def record_cost(data: dict, user: dict = Depends(get_current_user)):
    cost_data = json.loads(COST_FILE.read_text()) if COST_FILE.exists() else {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    cost_data["entries"].append({
        "timestamp": get_timestamp(),
        "agent": data.get("agent", "unknown"),
        "tokens": data.get("tokens", 0),
        "cost": data.get("cost", 0.0),
        "model": data.get("model", "unknown"),
    })
    COST_FILE.write_text(json.dumps(cost_data, indent=2))
    return {"status": "recorded"}