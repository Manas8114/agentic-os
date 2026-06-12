"""
Kanban endpoints: full CRUD, columns, links, comments, dispatch.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from api.deps import (
    BASE_DIR, KANBAN_DIR, ensure_dir, load_kanban_tasks, save_kanban_task,
    append_audit, get_current_user, get_timestamp,
    KanbanTaskCreate, KanbanTaskUpdate, KanbanComplete, KanbanBlock,
    KanbanCommentCreate, KanbanLinkCreate
)
import json
import uuid

router = APIRouter()

@router.get("/board")
async def kanban_board(status: Optional[str] = None, user: dict = Depends(get_current_user)):
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

@router.get("/tasks/{task_id}")
async def kanban_get_task(task_id: str, user: dict = Depends(get_current_user)):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    return json.loads(path.read_text())

@router.post("/tasks")
async def kanban_create_task(data: KanbanTaskCreate, user: dict = Depends(get_current_user)):
    try:
        task = {
            "id": str(uuid.uuid4()),  # Fix #9: full UUID, not truncated 8 chars
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
        append_audit({"action": "kanban_task_created", "title": data.title, "user": user.get("user_id") or user.get("api_key")})
        return task
    except Exception as e:
        raise HTTPException(500, str(e))

@router.patch("/tasks/{task_id}")
async def kanban_update_task(task_id: str, data: KanbanTaskUpdate, user: dict = Depends(get_current_user)):
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
    append_audit({"action": "kanban_task_updated", "task_id": task_id, "user": user.get("user_id") or user.get("api_key")})
    return task

@router.post("/tasks/{task_id}/complete")
async def kanban_complete_task(task_id: str, data: KanbanComplete, user: dict = Depends(get_current_user)):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "done"
    task["summary"] = data.summary
    task["completed_at"] = get_timestamp()
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_completed", "task_id": task_id, "user": user.get("user_id") or user.get("api_key")})
    return task

@router.post("/tasks/{task_id}/block")
async def kanban_block_task(task_id: str, data: KanbanBlock, user: dict = Depends(get_current_user)):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "blocked"
    task["block_reason"] = data.reason
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_blocked", "task_id": task_id, "user": user.get("user_id") or user.get("api_key")})
    return task

@router.post("/tasks/{task_id}/unblock")
async def kanban_unblock_task(task_id: str, user: dict = Depends(get_current_user)):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "ready"
    task["block_reason"] = ""
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_unblocked", "task_id": task_id, "user": user.get("user_id") or user.get("api_key")})
    return task

@router.post("/tasks/{task_id}/comments")
async def kanban_add_comment(task_id: str, data: KanbanCommentCreate, user: dict = Depends(get_current_user)):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    comment = {
        "id": str(uuid.uuid4()),  # Fix #9: full UUID
        "message": data.message,
        "timestamp": get_timestamp(),
    }
    task.setdefault("comments", []).append(comment)
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    return task

@router.post("/links")
async def kanban_add_link(data: KanbanLinkCreate, user: dict = Depends(get_current_user)):
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
    append_audit({"action": "kanban_link_added", "parent": data.parent_id, "child": data.child_id, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "linked"}

@router.delete("/links")
async def kanban_remove_link(parent_id: str = Query(...), child_id: str = Query(...), user: dict = Depends(get_current_user)):
    for tid in [parent_id, child_id]:
        path = KANBAN_DIR / f"{tid}.json"
        if path.exists():
            t = json.loads(path.read_text())
            t.setdefault("links", [])
            t["links"] = [l for l in t["links"] if not (l.get("parent") == parent_id and l.get("child") == child_id)]
            t["updated"] = get_timestamp()
            save_kanban_task(t)
    return {"status": "unlinked"}

@router.post("/dispatch")
async def kanban_dispatch(user: dict = Depends(get_current_user)):
    append_audit({"action": "kanban_dispatch_triggered", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "dispatch_triggered", "message": "Dispatcher notified"}

@router.post("/tasks/{task_id}/specify")
async def kanban_specify_task(task_id: str, user: dict = Depends(get_current_user)):
    from api.deps import execute_agent
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    
    if task.get("status") == "triage":
        prompt = f"""You are an elite technical product manager. 
Draft a concise, formal technical specification for the following task. Include requirements, acceptance criteria, and edge cases.
Task Title: {task.get('title')}
Task Description: {task.get('body')}

Respond ONLY with the markdown specification."""
        spec = execute_agent("gemini", prompt)
        
        task["status"] = "todo"
        task["body"] = f"{task.get('body', '')}\n\n## AI Specification\n\n{spec}"
        task["updated"] = get_timestamp()
        save_kanban_task(task)
    return task

@router.post("/tasks/{task_id}/decompose")
async def kanban_decompose_task(task_id: str, user: dict = Depends(get_current_user)):
    from api.deps import execute_agent
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    
    prompt = f"""You are a senior engineering manager.
Decompose the following task into 3 to 5 logical, sequential subtasks.
Task Title: {task.get('title')}
Task Description: {task.get('body')}

Respond ONLY with a valid JSON array of strings, where each string is a subtask title. Do not include markdown formatting or backticks.
Example: ["Setup database", "Create API endpoint", "Write tests"]"""
    
    result = execute_agent("gemini", prompt)
    
    try:
        import re
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            clean_result = match.group(0)
        else:
            clean_result = result.replace("```json", "").replace("```", "").strip()
        subtask_titles = json.loads(clean_result)
        if not isinstance(subtask_titles, list):
            subtask_titles = [str(subtask_titles)]
    except Exception:
        # Fallback if LLM fails to return valid JSON
        subtask_titles = [s.strip().lstrip("-* ") for s in task.get("body", "").split("\n") if s.strip().lstrip("-* ")]
        if not subtask_titles:
            subtask_titles = ["Subtask 1", "Subtask 2"]
            
    children = []
    for title in subtask_titles:
        if title:
            child_id = str(uuid.uuid4())  # Fix #9: full UUID
            child = {
                "id": child_id,
                "title": title[:80],
                "body": "",
                "status": "todo",
                "priority": task.get("priority", "medium"),
                "assignee": "",
                "comments": [],
                # Fix #9: build link atomically — child_id known upfront, no partial write
                "links": [{"parent": task_id, "child": child_id}],
                "created": get_timestamp(),
                "updated": get_timestamp(),
            }
            save_kanban_task(child)
            children.append(child)
    return {"parent": task_id, "children": children}