"""
Goals endpoints: CRUD for goals with progress tracking.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, load_goals, save_goals, append_audit, get_current_user, get_timestamp, GoalCreate, GoalUpdate
import uuid
import os

router = APIRouter()

@router.get("/")
async def list_goals(user: dict = Depends(get_current_user)):
    try:
        return {"goals": load_goals()}
    except Exception as e:
        return {"goals": [], "error": str(e)}

@router.post("/")
async def create_goal(data: GoalCreate, user: dict = Depends(get_current_user)):
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
        active_path = BASE_DIR / "brain" / "active-projects.md"
        if active_path.exists():
            existing = active_path.read_text()
            existing += f"\n- [{goal['title']}](goal:{goal['id']}) — {goal['description'][:80]}\n"
            active_path.write_text(existing)
        append_audit({"action": "goal_created", "title": data.title, "user": user.get("user_id") or user.get("api_key")})
        return goal
    except Exception as e:
        raise HTTPException(500, str(e))

@router.put("/{goal_id}")
async def update_goal(goal_id: str, data: GoalUpdate, user: dict = Depends(get_current_user)):
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

@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    try:
        goals = load_goals()
        goals = [g for g in goals if g["id"] != goal_id]
        save_goals(goals)
        append_audit({"action": "goal_deleted", "goal_id": goal_id, "user": user.get("user_id") or user.get("api_key")})
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(500, str(e))