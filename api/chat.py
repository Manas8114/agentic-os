"""
Chat endpoints: agent chat with history.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import (
    BASE_DIR, append_audit, get_current_user, execute_agent,
    auto_inject_context, ChatRequest, get_timestamp
)
import json
import asyncio
import uuid

router = APIRouter()

CHAT_DIR = BASE_DIR / "data" / "chat"

def load_history(agent: str) -> list:
    # Fix #17: JSONL format — one JSON object per line (O(1) appends)
    f = CHAT_DIR / f"{agent}.jsonl"
    if not f.exists():
        # Backwards compat: migrate old .json if it exists
        old = CHAT_DIR / f"{agent}.json"
        if old.exists():
            try:
                old_msgs = json.loads(old.read_text())
                CHAT_DIR.mkdir(parents=True, exist_ok=True)
                with open(f, 'a', encoding='utf-8') as out:
                    for msg in old_msgs:
                        out.write(json.dumps(msg) + '\n')
                old.rename(old.with_suffix('.json.bak'))
                return old_msgs
            except Exception:
                pass
        return []
    lines = []
    with open(f, 'r', encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    lines.append(json.loads(line))
                except Exception:
                    pass
    return lines

def append_history(agent: str, msg: dict):
    # Fix #17: O(1) append — never reads the whole file
    CHAT_DIR.mkdir(parents=True, exist_ok=True)
    f = CHAT_DIR / f"{agent}.jsonl"
    with open(f, 'a', encoding='utf-8') as fh:
        fh.write(json.dumps(msg) + '\n')

@router.post("/send")
async def send_message(req: ChatRequest, user: dict = Depends(get_current_user)):
    agent = req.agent.lower().strip()
    valid_agents = ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]
    if agent not in valid_agents:
        raise HTTPException(400, f"Agent must be one of: {', '.join(valid_agents)}")

    user_message = req.message
    history = load_history(agent)

    # Fix #6: Build context with injection
    enhanced_message = user_message
    try:
        context_str = await auto_inject_context(user_message, agent)
        if context_str:
            enhanced_message = f"{context_str}\n\n{user_message}"
    except Exception as e:
        print(f"Context injection warning: {e}")

    # Fix #6: run blocking execute_agent in a thread — never blocks the event loop
    try:
        response_text = await asyncio.to_thread(execute_agent, agent, enhanced_message)
    except Exception as e:
        response_text = f"⚠ Error communicating with {agent}: {str(e)}"

    user_entry = {"role": "user", "content": user_message, "timestamp": get_timestamp()}
    ai_entry = {"role": "assistant", "content": response_text, "agent": agent, "timestamp": get_timestamp()}
    # Fix #17: append only, no read-write cycle
    append_history(agent, user_entry)
    append_history(agent, ai_entry)

    append_audit({"action": "chat_message_sent", "agent": agent, "user": user.get("user_id") or user.get("api_key")})

    return {"response": response_text, "agent": agent, "history_length": len(history) + 2}

@router.get("/history")
async def get_chat_history(agent: str, user: dict = Depends(get_current_user)):
    return {"messages": load_history(agent)}