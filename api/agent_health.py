"""
Agent Health endpoints: status, stats, refresh.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import check_agent, get_current_user, get_timestamp, append_audit, BASE_DIR
import time
import os

router = APIRouter()

@router.get("/status")
async def get_status():
    agents = [check_agent(a) for a in ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]]
    skills_dir = BASE_DIR / "skills"
    skills_count = len([d for d in skills_dir.iterdir() if d.is_dir() and not d.name.startswith("_")]) if skills_dir.exists() else 0
    return {
        "status": "healthy",
        "agents": agents,
        "skills_count": skills_count,
        "uptime": time.time(),
    }

@router.get("/health")
async def get_agent_health(user: dict = Depends(get_current_user)):
    try:
        import subprocess
        import shutil
        import psutil
        
        agents = []
        for name in ["opencode", "hermes", "gemini"]:
            info = check_agent(name)
            
            # Real subprocess checks
            uptime_ms = 0
            if info["status"] == "online":
                try:
                    start_time = time.time()
                    subprocess.run([name, "--version"] if name != "gemini" else [name, "--help"], capture_output=True, timeout=3)
                    uptime_ms = int((time.time() - start_time) * 1000)
                except Exception:
                    pass
            
            info["uptime"] = uptime_ms
            info["success_rate"] = 100 if info["status"] == "online" else 0
            info["last_seen"] = get_timestamp()
            agents.append(info)
            
        disk = shutil.disk_usage(BASE_DIR)
        disk_used = disk.used / (1024**3)
        disk_total = disk.total / (1024**3)
        
        memory_used = psutil.Process(os.getpid()).memory_info().rss / (1024**2) if 'psutil' in globals() else 0
        
        return {
            "agents": agents, 
            "updated": get_timestamp(),
            "system": {
                "memory_mb": round(memory_used, 1),
                "disk_used_gb": round(disk_used, 1),
                "disk_total_gb": round(disk_total, 1)
            }
        }
    except Exception as e:
        return {"agents": [], "error": str(e), "updated": get_timestamp()}

@router.get("/{name}/stats")
async def get_agent_stats(name: str, user: dict = Depends(get_current_user)):
    try:
        if name not in ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]:
            raise HTTPException(400, "Invalid agent")
        info = check_agent(name)
        return {
            "name": name,
            "status": info["status"],
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "avg_response_time": 0,
            "last_seen": get_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/health/refresh")
async def refresh_agent_health(user: dict = Depends(get_current_user)):
    try:
        agents = []
        for name in ["opencode", "hermes", "gemini"]:
            info = check_agent(name)
            agents.append(info)
        append_audit({"action": "agent_health_refreshed", "user": user.get("user_id") or user.get("api_key")})
        return {"agents": agents, "updated": get_timestamp()}
    except Exception as e:
        return {"agents": [], "error": str(e)}