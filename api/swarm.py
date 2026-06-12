import asyncio
import uuid
import json
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from api.deps import get_current_user, execute_agent, append_audit
from api.db import insert_timeline_event

router = APIRouter()

class SwarmNode(BaseModel):
    id: str
    agent: str
    prompt: str
    depends_on: List[str] = []

class SwarmRequest(BaseModel):
    name: str
    nodes: List[SwarmNode]
    initial_input: str = ""

# Keep track of running swarms in memory for now
active_swarms = {}

async def execute_swarm_pipeline(swarm_id: str, request: SwarmRequest, user_id: str):
    """Executes a Directed Acyclic Graph (DAG) of agent tasks."""
    active_swarms[swarm_id] = {"status": "running", "results": {}, "errors": []}
    
    insert_timeline_event(
        event_type="swarm_start",
        title=f"Swarm Started: {request.name}",
        description=f"Initiated a swarm with {len(request.nodes)} agents.",
        agent="system"
    )

    # Simplified sequential execution based on ordering in the list.
    # A true DAG parser would walk the dependencies.
    accumulated_context = f"Initial Input: {request.initial_input}\n\n"

    for node in request.nodes:
        # Check if previous steps failed
        if active_swarms[swarm_id]["status"] == "failed":
            break

        active_swarms[swarm_id]["current_node"] = node.id

        insert_timeline_event(
            event_type="swarm_step_start",
            title=f"Swarm Step: {node.id}",
            description=f"Agent {node.agent} is processing.",
            agent=node.agent
        )

        prompt = f"{node.prompt}\n\nContext so far:\n{accumulated_context}"

        # Run agent
        try:
            # We run this in an executor thread since execute_agent is synchronous and blocking (subprocess)
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, execute_agent, node.agent, prompt)
            
            active_swarms[swarm_id]["results"][node.id] = result
            accumulated_context += f"\n--- Output from {node.agent} ({node.id}) ---\n{result}\n"

            insert_timeline_event(
                event_type="swarm_step_complete",
                title=f"Swarm Step Complete: {node.id}",
                description=result[:200] + "...",
                agent=node.agent,
                status="success"
            )

        except Exception as e:
            active_swarms[swarm_id]["status"] = "failed"
            active_swarms[swarm_id]["errors"].append(str(e))
            insert_timeline_event(
                event_type="swarm_step_failed",
                title=f"Swarm Step Failed: {node.id}",
                description=str(e),
                agent=node.agent,
                status="error"
            )
            break

    if active_swarms[swarm_id]["status"] != "failed":
        active_swarms[swarm_id]["status"] = "completed"
        insert_timeline_event(
            event_type="swarm_complete",
            title=f"Swarm Completed: {request.name}",
            description="All nodes executed successfully.",
            agent="system",
            status="success"
        )

@router.post("/run")
async def run_swarm(req: SwarmRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    swarm_id = str(uuid.uuid4())
    background_tasks.add_task(execute_swarm_pipeline, swarm_id, req, user.get("user_id", "anonymous"))
    return {"status": "accepted", "swarm_id": swarm_id, "message": "Swarm pipeline started in background"}

@router.get("/status/{swarm_id}")
async def get_swarm_status(swarm_id: str, user: dict = Depends(get_current_user)):
    if swarm_id not in active_swarms:
        return {"status": "not_found"}
    return active_swarms[swarm_id]
