"""
Scheduler endpoints: job listing, creation, deletion.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import (
    BASE_DIR, append_audit, get_current_user, get_timestamp,
    ScheduleJobRequest, load_kanban_tasks, save_kanban_task
)
import json
import uuid

router = APIRouter()

@router.get("/jobs")
async def list_jobs():
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs = []
    for f in sorted(jobs_dir.glob("*.json")):
        jobs.append(json.loads(f.read_text()))
    return jobs

@router.post("/jobs")
async def create_job(job: ScheduleJobRequest, user: dict = Depends(get_current_user)):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    job_data = {
        "id": str(uuid.uuid4())[:8],
        "name": job.name,
        "skill": job.skill,
        "cron": job.cron,
        "enabled": job.enabled,
        "created": get_timestamp(),
        "last_run": None,
        "next_run": None,
    }
    (jobs_dir / f"{job.name.replace(' ', '_')}.json").write_text(
        json.dumps(job_data, indent=2)
    )
    append_audit({"action": "job_created", "job": job.name, "user": user.get("user_id") or user.get("api_key")})
    return job_data

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    for f in jobs_dir.glob("*.json"):
        data = json.loads(f.read_text())
        if data.get("id") == job_id:
            f.unlink()
            append_audit({"action": "job_deleted", "job_id": job_id, "user": user.get("user_id") or user.get("api_key")})
            return {"status": "deleted"}
    raise HTTPException(404, "Job not found")