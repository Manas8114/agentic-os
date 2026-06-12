"""
Brain endpoints: file listing, reading, and writing.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, read_file, write_file, list_dir, append_audit, get_current_user

router = APIRouter()

@router.get("/")
async def list_brain():
    files = list_dir(BASE_DIR / "brain")
    brain_data = {}
    for f in files:
        path = BASE_DIR / "brain" / f
        if path.is_file():
            brain_data[f] = read_file(path)
    return brain_data

@router.get("/{file_name}")
async def get_brain_file(file_name: str):
    path = BASE_DIR / "brain" / file_name
    if not path.exists() or path.is_dir():
        raise HTTPException(404, "File not found")
    return {"name": file_name, "content": read_file(path)}

@router.put("/{file_name}")
async def update_brain_file(file_name: str, content: str, user: dict = Depends(get_current_user)):
    path = BASE_DIR / "brain" / file_name
    write_file(path, content)
    append_audit({"action": "brain_update", "file": file_name, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "ok", "file": file_name}