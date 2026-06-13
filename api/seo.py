from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uuid
import asyncio
from typing import List

from api.deps import get_current_user, append_audit, execute_agent
from api.kanban import save_kanban_task

router = APIRouter()

class SEOKeywordsRequest(BaseModel):
    keywords: List[str]
    intent: str = "informational"
    tone: str = "professional"

async def process_seo_keyword(job_id: str, keyword: str, intent: str, tone: str):
    # 1. Create a tracking task in the Kanban
    task = {
        "id": f"SEO-{uuid.uuid4().hex[:8].upper()}",
        "title": f"Generate SEO: {keyword}",
        "body": f"Automatically generating {intent} content for keyword: {keyword}. Tone: {tone}.",
        "status": "in_progress",
        "tags": ["seo", "programmatic"]
    }
    save_kanban_task(task)
    
    # 2. Run the agent to generate content
    prompt = f"""You are an elite SEO content writer.
Write a comprehensive, highly ranking blog post for the keyword: "{keyword}".
The intent is: {intent}.
The tone should be: {tone}.

Requirements:
- Provide an engaging H1 title.
- Include proper H2 and H3 structures.
- Make it at least 800 words.
- Format strictly in Markdown.
"""
    try:
        content = await asyncio.to_thread(execute_agent, "gemini", prompt)
        
        # 3. Save to memory so it's queryable and inter-linkable
        from api.memory import index_content
        await index_content(
            source="seo_pipeline", 
            content_id=task["id"], 
            text=content, 
            metadata={
                "title": f"SEO Content: {keyword}",
                "tags": "seo, auto-generated, article",
                "keyword": keyword,
                "intent": intent,
                "tone": tone
            }
        )
        
        # 4. Mark task complete
        task["status"] = "completed"
        save_kanban_task(task)
        
    except Exception as e:
        task["status"] = "blocked"
        task["body"] += f"\n\nERROR: {str(e)}"
        save_kanban_task(task)

def run_bulk_seo(job_id: str, req: SEOKeywordsRequest):
    # Run async tasks in a new event loop context if needed, or simply run them sequentially 
    # to avoid hitting API rate limits
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def process_all():
        for kw in req.keywords:
            await process_seo_keyword(job_id, kw, req.intent, req.tone)
            await asyncio.sleep(2) # rate limit protection
            
    loop.run_until_complete(process_all())
    loop.close()

@router.post("/programmatic")
async def trigger_programmatic_seo(
    req: SEOKeywordsRequest, 
    background_tasks: BackgroundTasks, 
    user: dict = Depends(get_current_user)
):
    """
    Takes a list of keywords and bulk-generates SEO-optimized articles,
    saving them directly into the Agentic OS Memory Vault.
    """
    if not req.keywords:
        raise HTTPException(status_code=400, detail="No keywords provided")
        
    job_id = f"job_seo_{uuid.uuid4().hex[:8]}"
    
    background_tasks.add_task(run_bulk_seo, job_id, req)
    
    append_audit({
        "action": "programmatic_seo_triggered",
        "keywords_count": len(req.keywords),
        "job_id": job_id,
        "user": user.get("user_id") or user.get("api_key")
    })
    
    return {
        "status": "processing",
        "job_id": job_id,
        "message": f"Started programmatic SEO pipeline for {len(req.keywords)} keywords.",
        "keywords": req.keywords
    }
