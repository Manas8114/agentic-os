"""
Standards endpoints: coding standards listing and discovery.
"""
from fastapi import APIRouter, Depends
from api.deps import BASE_DIR, get_current_user

router = APIRouter()

@router.get("/")
async def list_standards(user: dict = Depends(get_current_user)):
    std_dir = BASE_DIR / "standards"
    if not std_dir.exists():
        return {"standards": []}
    standards = []
    index_file = std_dir / "index.yml"
    index_content = index_file.read_text() if index_file.exists() else ""
    for f in std_dir.glob("*.md"):
        standards.append({"name": f.stem, "content": f.read_text()})
    return {"standards": standards, "index": index_content}

@router.post("/discover")
async def discover_standards(user: dict = Depends(get_current_user)):
    from api.deps import append_audit
    append_audit({"action": "standards_discovery_run", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "discovery_started", "message": "Scanning codebase for patterns..."}