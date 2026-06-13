from fastapi import APIRouter, Depends, HTTPException, Request
import json
import uuid
from typing import Dict, Any
from api.deps import get_current_user, append_audit, execute_agent
from api.kanban import save_kanban_task
from api.memory import index_content

router = APIRouter()

@router.post("/n8n")
async def n8n_webhook_receiver(request: Request, user: dict = Depends(get_current_user)):
    """
    Receives incoming webhook payloads from n8n.
    Payload format:
    {
        "action": "create_task" | "add_memory" | "trigger_agent",
        "data": { ... }
    }
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    action = payload.get("action")
    data = payload.get("data", {})
    
    if not action:
        raise HTTPException(status_code=400, detail="Missing 'action' in payload")
        
    result = {"status": "success", "action": action}
    
    if action == "create_task":
        task = {
            "id": f"TASK-{uuid.uuid4().hex[:8].upper()}",
            "title": data.get("title", "Webhook Task"),
            "body": data.get("body", "Generated via n8n webhook"),
            "status": "triage",
            "tags": data.get("tags", ["webhook"])
        }
        save_kanban_task(task)
        result["task_id"] = task["id"]
        
    elif action == "add_memory":
        await index_content(
            source="webhook",
            content_id=f"WEBHOOK-{uuid.uuid4().hex[:8].upper()}",
            text=data.get("content", ""),
            metadata={
                "title": data.get("title", "Webhook Memory"),
                "tags": data.get("tags", "webhook")
            }
        )
        result["memory"] = "saved"
        
    elif action == "trigger_agent":
        prompt = data.get("prompt", "")
        agent = data.get("agent", "opencode")
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing 'prompt' for trigger_agent")
            
        import asyncio
        # Run in background to not block webhook response if long running
        # For simplicity, we run it sync here if we want the output in response,
        # but typical webhooks might just want a 200 OK. We'll wait for output.
        output = await asyncio.to_thread(execute_agent, agent, prompt)
        result["output"] = output
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
        
    append_audit({
        "action": "webhook_received",
        "type": action,
        "source": "n8n",
        "user": user.get("user_id") or user.get("api_key")
    })
    
    return result
