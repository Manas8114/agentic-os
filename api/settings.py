"""
Settings endpoints.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.deps import BASE_DIR, get_current_user
import json

router = APIRouter()

class SettingsData(BaseModel):
    settings: dict

@router.get("/")
async def get_settings(user: dict = Depends(get_current_user)):
    settings_file = BASE_DIR / "data" / "settings.json"
    try:
        if settings_file.exists():
            return {"settings": json.loads(settings_file.read_text())}
        return {"settings": {}}
    except Exception as e:
        return {"settings": {}, "error": str(e)}

@router.put("/")
async def update_settings(data: SettingsData, user: dict = Depends(get_current_user)):
    settings_file = BASE_DIR / "data" / "settings.json"
    try:
        settings_file.parent.mkdir(parents=True, exist_ok=True)
        settings_file.write_text(json.dumps(data.settings, indent=2))
        return {"status": "success", "settings": data.settings}
    except Exception as e:
        return {"status": "error", "error": str(e)}
