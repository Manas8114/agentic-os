"""
Jarvis endpoints: config, wake-word, listen, execute, TTS, tasks, schedule, briefings.
"""
import json
import os
import uuid
import subprocess
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, append_audit, get_current_user, get_timestamp, ensure_dir

router = APIRouter()

JARVIS_CONFIG_FILE = BASE_DIR / "agents" / "jarvis" / "jarvis.json"

def load_config():
    if JARVIS_CONFIG_FILE.exists():
        return json.loads(JARVIS_CONFIG_FILE.read_text())
    return {}

def save_config(config):
    JARVIS_CONFIG_FILE.write_text(json.dumps(config, indent=2))

@router.get("/config")
async def get_jarvis_config(user: dict = Depends(get_current_user)):
    return load_config()

@router.put("/config")
async def update_jarvis_config(config: dict, user: dict = Depends(get_current_user)):
    save_config(config)
    append_audit({"action": "jarvis_config_updated", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "saved"}

@router.post("/wake-word")
async def wake_word(data: dict, user: dict = Depends(get_current_user)):
    model = data.get("model", "jarvis")
    append_audit({"action": "wake_word_triggered", "model": model, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "triggered", "model": model}

@router.post("/listen")
async def listen(data: dict = None, user: dict = Depends(get_current_user)):
    import base64
    import tempfile
    import os
    from api.system import transcribe_audio_file
    from api.deps import execute_agent
    
    if data is None:
        data = {}
        
    audio_base64 = data.get("audio_data", "")
    duration = float(data.get("duration", 5.0))
    
    transcript = ""
    
    if audio_base64:
        # 1. Decode base64 audio and transcribe it
        try:
            audio_bytes = base64.b64decode(audio_base64)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            try:
                transcript = transcribe_audio_file(temp_file_path)
            finally:
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
        except Exception as e:
            return {"status": "error", "message": f"Failed to decode base64 audio: {e}"}
    else:
        # 2. Capture physical audio from microphone
        try:
            import sounddevice as sd
            import soundfile as sf
            
            fs = 16000  # Sample rate
            print(f"Recording from server microphone for {duration} seconds...")
            recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
            sd.wait()  # Wait for recording to finish
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                temp_file_path = temp_file.name
                sf.write(temp_file_path, recording, fs)
                
            try:
                transcript = transcribe_audio_file(temp_file_path)
            finally:
                try:
                    os.unlink(temp_file_path)
                except Exception:  # Fix #14: was bare except:
                    pass
        except Exception as e:
            return {"status": "error", "message": f"Microphone hardware capture failed: {e}. Note: sounddevice/soundfile needs working audio hardware."}
            
    if not transcript:
        return {"status": "completed", "transcript": "", "output": "No voice command detected."}
        
    # Execute command
    output = execute_agent("jarvis", transcript)
    
    append_audit({
        "action": "jarvis_voice_command",
        "transcript": transcript,
        "output_preview": output[:100] if output else "",
        "user": user.get("user_id") or user.get("api_key")
    })
    
    return {
        "status": "completed",
        "transcript": transcript,
        "output": output
    }

@router.post("/execute")
async def execute_command(data: dict, user: dict = Depends(get_current_user)):
    command = data.get("command", "")
    if not command:
        raise HTTPException(400, "Command required")
        
    from api.deps import execute_agent
    output = execute_agent("jarvis", command)
    
    result = {
        "status": "executed",
        "command": command,
        "output": output
    }
    append_audit({
        "action": "jarvis_execute",
        "command": command,
        "output_preview": output[:100] if output else "",
        "user": user.get("user_id") or user.get("api_key")
    })
    return result

# Fix #16: ElevenLabs key — read from env inside endpoint, not at import time
ELEVENLABS_BASE_URL="https://api.elevenlabs.io/v1"

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

@router.post("/tts")
async def jarvis_tts(data: dict, user: dict = Depends(get_current_user)):
    if not AIOHTTP_AVAILABLE:
        raise HTTPException(500, "aiohttp not installed")
    api_key = os.environ.get("ELEVENLABS_API_KEY")  # Fix #16: read at call time
    if not api_key:
        raise HTTPException(500, "ELEVENLABS_API_KEY not configured")
    
    text = data.get("text", "")
    voice_id = data.get("voice_id", "rachel")
    model = data.get("model", "eleven_monolingual_v1")
    stability = data.get("stability", 0.5)
    similarity_boost = data.get("similarity_boost", 0.75)
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = {"text": text, "model_id": model, "voice_settings": {"stability": stability, "similarity_boost": similarity_boost}}
            headers = {"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"}
            async with session.post(f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}", json=payload, headers=headers) as resp:
                if resp.status == 200:
                    audio_bytes = await resp.read()
                    import base64
                    audio_base64 = base64.b64encode(audio_bytes).decode()
                    return {"audio_base64": audio_base64, "format": "mp3"}
                else:
                    error = await resp.text()
                    raise HTTPException(500, f"TTS failed: {error}")
    except Exception as e:
        raise HTTPException(500, f"TTS error: {str(e)}")

# Fix #5: JARVIS_TASKS_DIR defined but ensure_dir NOT called at module level
JARVIS_TASKS_DIR = BASE_DIR / "data" / "jarvis_tasks"

def load_tasks():
    ensure_dir(JARVIS_TASKS_DIR)  # Fix #5: lazy init inside function
    tasks = []
    for f in sorted(JARVIS_TASKS_DIR.glob("*.json")):
        tasks.append(json.loads(f.read_text()))
    return tasks

def save_task(task):
    (JARVIS_TASKS_DIR / f"{task['id']}.json").write_text(json.dumps(task, indent=2))

@router.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user)):
    try:
        return {"tasks": load_tasks()}
    except Exception as e:
        return {"tasks": [], "error": str(e)}

@router.post("/tasks")
async def create_task(data: dict, user: dict = Depends(get_current_user)):
    task = {"id": str(uuid.uuid4())[:8], "title": data.get("title", ""), "description": data.get("description", ""), "status": "pending", "created": get_timestamp()}
    save_task(task)
    append_audit({"action": "jarvis_task_created", "title": task["title"], "user": user.get("user_id") or user.get("api_key")})
    return task

@router.get("/tasks/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    path = JARVIS_TASKS_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    return json.loads(path.read_text())

@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, data: dict, user: dict = Depends(get_current_user)):
    path = JARVIS_TASKS_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    for k, v in data.items():
        task[k] = v
    task["updated"] = get_timestamp()
    save_task(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    path = JARVIS_TASKS_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    path.unlink()
    return {"status": "deleted"}

@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    path = JARVIS_TASKS_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "completed"
    task["completed_at"] = get_timestamp()
    save_task(task)
    append_audit({"action": "jarvis_task_completed", "task_id": task_id, "user": user.get("user_id") or user.get("api_key")})
    return task

# Fix #5: JARVIS_SCHEDULE_DIR defined but ensure_dir NOT called at module level
JARVIS_SCHEDULE_DIR = BASE_DIR / "data" / "jarvis_schedule"

def load_schedule():
    ensure_dir(JARVIS_SCHEDULE_DIR)  # Fix #5: lazy init inside function
    events = []
    for f in sorted(JARVIS_SCHEDULE_DIR.glob("*.json")):
        events.append(json.loads(f.read_text()))
    return events

def save_event(event):
    (JARVIS_SCHEDULE_DIR / f"{event['id']}.json").write_text(json.dumps(event, indent=2))

@router.get("/schedule")
async def list_schedule(user: dict = Depends(get_current_user)):
    return {"events": load_schedule()}

@router.post("/schedule")
async def create_event(data: dict, user: dict = Depends(get_current_user)):
    event = {"id": str(uuid.uuid4())[:8], "title": data.get("title", ""), "start": data.get("start", ""), "end": data.get("end", ""), "recurrence": data.get("recurrence", "none"), "created": get_timestamp()}
    save_event(event)
    append_audit({"action": "jarvis_event_created", "title": event["title"], "user": user.get("user_id") or user.get("api_key")})
    return event

@router.delete("/schedule/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    path = JARVIS_SCHEDULE_DIR / f"{event_id}.json"
    if not path.exists():
        raise HTTPException(404, "Event not found")
    path.unlink()
    return {"status": "deleted"}

# Fix #5: BRIEFINGS_DIR defined but ensure_dir NOT called at module level
BRIEFINGS_DIR = BASE_DIR / "data" / "briefings"

def load_briefings():
    ensure_dir(BRIEFINGS_DIR)  # Fix #5: lazy init inside function
    briefings = []
    for f in sorted(BRIEFINGS_DIR.glob("*.json"), reverse=True):
        briefings.append(json.loads(f.read_text()))
    return briefings

def save_briefing(briefing):
    (BRIEFINGS_DIR / f"{briefing['id']}.json").write_text(json.dumps(briefing, indent=2))

@router.post("/briefing")
async def generate_briefing(data: dict, user: dict = Depends(get_current_user)):
    from api.deps import execute_agent
    from api.kanban import load_kanban_tasks
    
    briefing_type = data.get("type", "daily")
    
    # Gather context
    tasks = load_kanban_tasks()
    active_tasks = [t for t in tasks if t.get("status") in ["triage", "todo", "in_progress", "blocked"]]
    task_summary = "\\n".join([f"- {t.get('title')} ({t.get('status')})" for t in active_tasks[:10]])
    
    prompt = f"""You are Jarvis, an elite AI executive assistant. 
Generate a professional, concise '{briefing_type}' briefing for the user.

Current Active Tasks:
{task_summary}

Please summarize the current state of affairs, suggest 2-3 priorities for the day, and maintain a polite, executive tone.
Format the briefing in clean Markdown."""
    
    content = execute_agent("gemini", prompt)
    
    briefing = {"id": str(uuid.uuid4())[:8], "type": briefing_type, "content": content, "created": get_timestamp()}
    save_briefing(briefing)
    append_audit({"action": "briefing_generated", "type": briefing_type, "user": user.get("user_id") or user.get("api_key")})
    return briefing

@router.get("/briefings")
async def list_briefings(user: dict = Depends(get_current_user)):
    return {"briefings": load_briefings()}

@router.get("/briefings/{briefing_id}")
async def get_briefing(briefing_id: str, user: dict = Depends(get_current_user)):
    path = BRIEFINGS_DIR / f"{briefing_id}.json"
    if not path.exists():
        raise HTTPException(404, "Briefing not found")
    return json.loads(path.read_text())