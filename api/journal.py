"""
Journal endpoints: daily entries with search.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from api.deps import BASE_DIR, JOURNAL_DIR, ensure_dir, append_audit, get_current_user, get_timestamp, JournalSave
import datetime

router = APIRouter()

@router.get("/entries")
async def list_journal_entries(user: dict = Depends(get_current_user)):
    try:
        ensure_dir(JOURNAL_DIR)
        entries = []
        for f in sorted(JOURNAL_DIR.glob("*.md"), reverse=True):
            entries.append({
                "date": f.stem,
                "preview": f.read_text()[:200],
                "modified": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return {"entries": entries}
    except Exception as e:
        return {"entries": [], "error": str(e)}

@router.get("/entries/{entry_date}")
async def get_journal_entry(entry_date: str, user: dict = Depends(get_current_user)):
    try:
        path = JOURNAL_DIR / f"{entry_date}.md"
        ensure_dir(JOURNAL_DIR)
        content = path.read_text() if path.exists() else ""
        return {"date": entry_date, "content": content}
    except Exception as e:
        return {"date": entry_date, "content": "", "error": str(e)}

@router.put("/entries/{entry_date}")
async def save_journal_entry(entry_date: str, data: JournalSave, user: dict = Depends(get_current_user)):
    try:
        ensure_dir(JOURNAL_DIR)
        path = JOURNAL_DIR / f"{entry_date}.md"
        path.write_text(data.content)
        append_audit({"action": "journal_saved", "date": entry_date, "user": user.get("user_id") or user.get("api_key")})
        return {"status": "saved", "date": entry_date}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/search")
async def search_journal(q: str = Query(""), user: dict = Depends(get_current_user)):
    try:
        ensure_dir(JOURNAL_DIR)
        if not q:
            return {"results": []}
        results = []
        for f in JOURNAL_DIR.glob("*.md"):
            content = f.read_text()
            if q.lower() in content.lower():
                results.append({"date": f.stem, "preview": content[:200]})
        return {"results": results, "query": q}
    except Exception as e:
        return {"results": [], "error": str(e)}