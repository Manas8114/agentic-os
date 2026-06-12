from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, check_agent, get_current_user, get_optional_user
import time
import json

# Fix #23: track server start time for uptime
_start_time = time.time()

router = APIRouter()

@router.get("/status")
async def get_status(user: dict = Depends(get_optional_user)):
    # Fix: use get_optional_user so gateway bar works on first load without a token.
    # /api/status is a read-only health check — non-sensitive.
    # /api/audit (below) keeps hard auth since it exposes the full activity log.
    agents = [check_agent(a) for a in ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]]
    skills_dir = BASE_DIR / "skills"
    skills_count = len([d for d in skills_dir.iterdir() if d.is_dir() and not d.name.startswith("_")]) if skills_dir.exists() else 0
    return {
        "status": "healthy",
        "agents": agents,
        "skills_count": skills_count,
        "uptime": time.time() - _start_time,
        "authenticated": user is not None,
    }

@router.get("/audit")
async def get_audit(user: dict = Depends(get_current_user)):  # Fix #4: requires auth
    audit_file = BASE_DIR / "audit" / "audit.log"
    logs = []
    if audit_file.exists():
        with open(audit_file, "r") as f:
            for line in f:
                try:
                    logs.append(json.loads(line.strip()))
                except Exception:  # Fix #14: was bare except:
                    pass
    return {"audit": logs}

@router.get("/prompts")
async def get_prompts():
    prompts_dir = BASE_DIR / "prompts"
    prompts = []
    if prompts_dir.exists():
        for p in prompts_dir.glob("*.md"):
            prompts.append({"id": p.stem, "name": p.stem, "content": p.read_text(encoding="utf-8")})
    return {"prompts": prompts}

@router.get("/timeline")
async def get_unified_timeline(hours: int = 168, limit: int = 200, user: dict = Depends(get_current_user)):
    """Return chronological timeline of all OS events from the real database."""
    from api.db import get_timeline
    events = get_timeline(limit)
    return {"timeline": events}

@router.post("/timeline/rebuild")
async def rebuild_timeline(user: dict = Depends(get_current_user)):
    """Rebuild timeline from logs."""
    from api.db import get_db, insert_timeline_event
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timeline_events")
    conn.commit()
    
    audit_file = BASE_DIR / "audit" / "audit.log"
    count = 0
    if audit_file.exists():
        with open(audit_file, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    title = f"Action: {entry.get('action')}"
                    if "skill" in entry:
                        title = f"Ran skill: {entry['skill']}"
                    insert_timeline_event(
                        event_type=entry.get("action", "unknown"),
                        title=title,
                        description=entry.get("output_preview", ""),
                        metadata=entry,
                        agent=entry.get("agent", "system"),
                        status="info"
                    )
                    count += 1
                except Exception:  # Fix #14: was bare except:
                    pass
                    
    return {"status": "rebuilt", "message": f"Timeline indexes refreshed. Inserted {count} events."}

# Session Replay
@router.get("/sessions/list")
async def list_sessions(user: dict = Depends(get_current_user)):
    """List agent sessions from the database."""
    from api.db import get_sessions
    return {"sessions": get_sessions()}

_whisper_model = None

def transcribe_audio_file(file_path: str) -> str:
    global _whisper_model
    try:
        if _whisper_model is None:
            from faster_whisper import WhisperModel
            # Load tiny model on CPU with int8 quantization (lightweight and fast)
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segments, info = _whisper_model.transcribe(file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        return ""

@router.get("/voice/captures")
async def list_voice_captures(limit: int = 50, user: dict = Depends(get_current_user)):
    from api.db import get_voice_captures
    return {"captures": get_voice_captures(limit)}

@router.get("/voice/captures/{capture_id}")
async def get_voice_capture(capture_id: str, user: dict = Depends(get_current_user)):
    from api.db import get_voice_capture
    capture = get_voice_capture(capture_id)
    if not capture:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Voice capture not found")
    return capture

@router.delete("/voice/captures/{capture_id}")
async def delete_voice_capture(capture_id: str, user: dict = Depends(get_current_user)):
    from api.db import delete_voice_capture
    delete_voice_capture(capture_id)
    return {"status": "deleted"}

@router.post("/voice/capture")
async def capture_voice(data: dict, user: dict = Depends(get_current_user)):
    import base64
    import tempfile
    import uuid
    from fastapi import HTTPException
    from api.db import insert_voice_capture
    from api.deps import execute_agent
    
    audio_base64 = data.get("audio_data", "")
    duration = float(data.get("duration", 0))
    source = data.get("source", "push-to-talk")
    
    if not audio_base64:
        raise HTTPException(status_code=400, detail="Audio data is required")
        
    try:
        # Decode base64 and write to temporary file
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
            
        try:
            # Transcribe
            transcript = transcribe_audio_file(temp_file_path)
        except Exception as transcribe_err:
            print(f"Transcription error: {transcribe_err}")
            transcript = ""
        finally:
            try:
                import os
                os.unlink(temp_file_path)
            except Exception:  # Fix #14: was bare except:
                pass

        if not transcript:
            transcript = "[Silence / Unintelligible]"
            summary = "Silence or noise captured."
            action_items = []
            topics = []
        else:
            # Use Gemini to extract summary, action items, and topics
            prompt = f"""You are the Jarvis OMI Voice Capture Assistant.
Analyze the following transcription:
"{transcript}"

Please analyze this text and provide:
1. A concise, professional summary of the discussion.
2. A JSON list of action items.
3. A JSON list of relevant topics/tags.

Respond ONLY with valid JSON in the following format (no markdown blocks, no backticks, no comments):
{{
  "summary": "Summary text",
  "action_items": ["item 1", "item 2"],
  "topics": ["topic1", "topic2"]
}}
"""
            llm_response = execute_agent("gemini", prompt)
            
            # Parse LLM response
            summary = "Voice capture transcript processed."
            action_items = []
            topics = []
            try:
                clean_resp = llm_response.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(clean_resp)
                summary = parsed.get("summary", summary)
                action_items = parsed.get("action_items", [])
                topics = parsed.get("topics", [])
            except Exception as parse_err:
                print(f"Failed to parse Gemini response for voice capture: {parse_err}. Response was: {llm_response}")
                summary = f"Processed transcript: {transcript[:100]}..."
                
        capture_id = f"voice_{uuid.uuid4().hex[:8]}"
        insert_voice_capture(
            capture_id=capture_id,
            transcript=transcript,
            summary=summary,
            action_items=action_items,
            topics=topics,
            duration=duration,
            source=source
        )
        
        from api.deps import append_audit
        append_audit({
            "action": "voice_capture_processed",
            "capture_id": capture_id,
            "duration": duration,
            "transcript_preview": transcript[:100],
            "user": user.get("user_id") or user.get("api_key")
        })
        
        from api.db import get_voice_capture
        return get_voice_capture(capture_id)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process voice capture: {str(e)}")

@router.get("/screen-activity/summary")
async def get_screen_activity():
    return {"summary": {}}

@router.get("/analytics/agents/summary")
async def get_analytics_summary(user: dict = Depends(get_current_user)):
    cost_file = BASE_DIR / "data" / "cost-history.json"
    try:
        costs = json.loads(cost_file.read_text()) if cost_file.exists() else []
        total_runs = len(costs)
        total_cost = sum(c.get("cost", 0) for c in costs)
        return {"summary": {"total_runs": total_runs, "total_cost": round(total_cost, 4)}}
    except Exception:
        return {"summary": {"total_runs": 0, "total_cost": 0.0}}

@router.get("/analytics/agents/cost-breakdown")
async def get_analytics_cost(user: dict = Depends(get_current_user)):
    cost_file = BASE_DIR / "data" / "cost-history.json"
    try:
        costs = json.loads(cost_file.read_text()) if cost_file.exists() else []
        breakdown = {}
        for c in costs:
            agent = c.get("agent", "unknown")
            breakdown[agent] = breakdown.get(agent, 0) + c.get("cost", 0)
        return {"breakdown": [{"agent": k, "cost": round(v, 4)} for k, v in breakdown.items()]}
    except Exception:
        return {"breakdown": []}

@router.get("/analytics/agents/{name}/trends")
async def get_analytics_trends(name: str, user: dict = Depends(get_current_user)):
    cost_file = BASE_DIR / "data" / "cost-history.json"
    try:
        costs = json.loads(cost_file.read_text()) if cost_file.exists() else []
        agent_costs = [c for c in costs if c.get("agent") == name][-20:] # Last 20 runs
        return {"trends": {
            "dates": [c.get("timestamp", "")[:10] for c in agent_costs],
            "costs": [c.get("cost", 0) for c in agent_costs]
        }}
    except Exception:
        return {"trends": {"dates": [], "costs": []}}
