"""
Plugins endpoints: marketplace listing and installation.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, append_audit, get_current_user, get_timestamp
import json

router = APIRouter()

REG_FILE = BASE_DIR / "registry" / "plugins.json"

@router.get("/")
async def list_plugins(user: dict = Depends(get_current_user)):
    if not REG_FILE.exists():
        return {"plugins": []}
    return json.loads(REG_FILE.read_text())

@router.post("/install")
async def install_plugin(data: dict, user: dict = Depends(get_current_user)):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Plugin name required")
        
    import os
    import shutil
    import subprocess
    import urllib.parse
    
    skills_dir = BASE_DIR / "skills"
    is_git = name.startswith(("http://", "https://", "git@")) or name.endswith(".git")
    
    if is_git:
        parsed_url = urllib.parse.urlparse(name)
        folder_name = os.path.basename(parsed_url.path)
        if folder_name.endswith(".git"):
            folder_name = folder_name[:-4]
            
        target_dir = skills_dir / folder_name
        if target_dir.exists():
            return {"status": "already_installed"}
            
        try:
            subprocess.run(["git", "clone", name, str(target_dir)], check=True, capture_output=True)
            plugin_name = folder_name
        except Exception as e:
            raise HTTPException(500, f"Git clone failed: {e}")
    else:
        plugin_name = name
        target_dir = skills_dir / plugin_name
        if target_dir.exists():
            return {"status": "already_installed"}
            
        template_dir = skills_dir / "_template"
        if template_dir.exists():
            try:
                shutil.copytree(template_dir, target_dir)
                skill_md = target_dir / "SKILL.md"
                if skill_md.exists():
                    content = skill_md.read_text(encoding="utf-8")
                    content = content.replace("Template Skill", plugin_name.replace("-", " ").title())
                    content = content.replace("template", plugin_name)
                    skill_md.write_text(content, encoding="utf-8")
            except Exception as e:
                raise HTTPException(500, f"Failed to instantiate plugin template: {e}")
        else:
            target_dir.mkdir(parents=True, exist_ok=True)
            (target_dir / "SKILL.md").write_text(f"# {plugin_name.title()}\n\nBasic custom skill.", encoding="utf-8")
            
    reg = json.loads(REG_FILE.read_text()) if REG_FILE.exists() else {"plugins": []}
    if not any(p["name"] == plugin_name for p in reg["plugins"]):
        reg["plugins"].append({
            "name": plugin_name,
            "version": "1.0.0",
            "description": f"Custom skill: {plugin_name}",
            "author": "User",
            "installed": get_timestamp(),
            "type": "custom"
        })
        REG_FILE.write_text(json.dumps(reg, indent=2))
        
    append_audit({"action": "plugin_installed", "plugin": plugin_name, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "installed", "plugin": plugin_name}

@router.post("/uninstall")
async def uninstall_plugin(data: dict, user: dict = Depends(get_current_user)):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Plugin name required")
        
    reg = json.loads(REG_FILE.read_text()) if REG_FILE.exists() else {"plugins": []}
    
    found = False
    for p in reg["plugins"]:
        if p["name"] == name:
            reg["plugins"].remove(p)
            found = True
            break
            
    if not found:
        return {"status": "not_installed"}
        
    REG_FILE.write_text(json.dumps(reg, indent=2))
    
    target_dir = BASE_DIR / "skills" / name
    if target_dir.exists() and name != "_template":
        import shutil
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            raise HTTPException(500, f"Failed to delete skill directory: {e}")
            
    append_audit({"action": "plugin_uninstalled", "plugin": name, "user": user.get("user_id") or user.get("api_key")})
    return {"status": "uninstalled", "plugin": name}