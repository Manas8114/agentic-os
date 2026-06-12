"""
Backup endpoints: create, list, restore.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, append_audit, get_current_user, BackupRestoreRequest, get_timestamp
from datetime import datetime
import tarfile
import json

router = APIRouter()

@router.get("/")
async def list_backups(user: dict = Depends(get_current_user)):
    backup_dir = BASE_DIR / "backups"
    backups = []
    for f in sorted(backup_dir.glob("*.tar.gz"), reverse=True):
        backups.append({"name": f.name, "size": f.stat().st_size, "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat()})
    return backups

@router.post("/")
async def create_backup(user: dict = Depends(get_current_user)):
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"agentic-os-{ts}.tar.gz"
    with tarfile.open(backup_file, "w:gz") as tar:
        for dir_name in ["brain", "skills", "agents", "registry", "standards", "prompts"]:
            d = BASE_DIR / dir_name
            if d.exists():
                tar.add(d, arcname=dir_name)
    append_audit({"action": "backup_created", "file": backup_file.name, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "ok", "file": backup_file.name, "size": backup_file.stat().st_size}

@router.post("/restore")
async def restore_backup(data: BackupRestoreRequest, user: dict = Depends(get_current_user)):
    backup_file = BASE_DIR / "backups" / data.file
    if not backup_file.exists():
        raise HTTPException(404, "Backup file not found")
    with tarfile.open(backup_file, "r:gz") as tar:
        tar.extractall(path=BASE_DIR)
    append_audit({"action": "backup_restored", "file": data.file, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "restored"}