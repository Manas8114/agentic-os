"""
Analytics endpoints: skills analytics and trends.
"""
from fastapi import APIRouter, Depends
from api.deps import BASE_DIR, get_current_user
import json

router = APIRouter()

@router.get("/skills")
async def get_skill_analytics(user: dict = Depends(get_current_user)):
    try:
        skills_dir = BASE_DIR / "skills"
        analytics = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                eval_path = d / "eval.json"
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                eval_data = json.loads(eval_path.read_text()) if eval_path.exists() else {}
                avg_score = sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0
                analytics.append({
                    "name": d.name,
                    "total_runs": len(scores),
                    "avg_score": round(avg_score, 1),
                    "last_score": scores[-1].get("score", 0) if scores else 0,
                    "trend": "up" if len(scores) >= 2 and scores[-1].get("score", 0) > scores[-2].get("score", 0) else "down" if len(scores) >= 2 else "stable",
                })
        return {"skills": sorted(analytics, key=lambda x: x["total_runs"], reverse=True)}
    except Exception as e:
        return {"skills": [], "error": str(e)}

@router.get("/trends")
async def get_trend_analytics(user: dict = Depends(get_current_user)):
    try:
        skills_dir = BASE_DIR / "skills"
        trends = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                if scores:
                    trends.append({
                        "name": d.name,
                        "scores": [s.get("score", 0) for s in scores[-10:]],
                        "labels": [s.get("date", "") for s in scores[-10:]],
                    })
        return {"trends": trends}
    except Exception as e:
        return {"trends": [], "error": str(e)}