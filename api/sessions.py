"""
Session Replay endpoints: opencode/Hermes session logs.
"""
from fastapi import APIRouter, Depends
from api.deps import get_current_user
from pathlib import Path
import datetime

router = APIRouter()

@router.get("/list")
async def list_sessions(user: dict = Depends(get_current_user)):
    try:
        sessions = []
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_dir = sessions_dir / "log"
        if log_dir.exists():
            for f in sorted(log_dir.glob("*.log"), reverse=True)[:20]:
                sessions.append({
                    "id": f.stem, "name": f.stem, "size": f.stat().st_size,
                    "modified": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "source": "opencode",
                })
        hermes_sessions = Path.home() / ".hermes" / "sessions.json"
        if hermes_sessions.exists():
            sessions.append({
                "id": "hermes-sessions", "name": "Hermes Session Archive",
                "size": hermes_sessions.stat().st_size,
                "modified": datetime.datetime.fromtimestamp(hermes_sessions.stat().st_mtime).isoformat(),
                "source": "hermes",
            })
        return {"sessions": sessions}
    except Exception as e:
        return {"sessions": [], "error": str(e)}

@router.get("/{session_id}/replay")
async def get_session_replay(session_id: str, user: dict = Depends(get_current_user)):
    try:
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_file = sessions_dir / "log" / f"{session_id}.log"
        if log_file.exists():
            content = log_file.read_text()
            lines = content.split("\n")
            messages = [line for line in lines if "user:" in line.lower() or "assistant:" in line.lower()]
            return {"session_id": session_id, "lines": len(lines), "messages": messages[:100], "content": content[:5000]}
        return {"session_id": session_id, "messages": [], "content": "Session log not found"}
    except Exception as e:
        return {"session_id": session_id, "messages": [], "error": str(e)}