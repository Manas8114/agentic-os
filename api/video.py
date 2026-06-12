"""
Video Generation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_current_user, AIOHTTP_AVAILABLE, BASE_DIR
import os

router = APIRouter()

VIDEO_API_KEYS = {
    "runway": os.environ.get("RUNWAY_API_KEY"),
    "pika": os.environ.get("PIKA_API_KEY"),
    "luma": os.environ.get("LUMA_API_KEY"),
    "replicate": os.environ.get("REPLICATE_API_TOKEN"),
}

async def generate_video_runway(prompt: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9"):
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("runway")
    if not api_key:
        return {"error": "RUNWAY_API_KEY not configured"}
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = {"prompt": prompt, "duration": min(duration, 16), "fps": fps, "aspect_ratio": aspect_ratio, "model": "gen-2"}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            async with session.post("https://api.runwayml.com/v1/generate", json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=180)) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {"url": result.get("video_url") or result.get("output", [None])[0], "status": "completed", "job_id": result.get("id")}
                else:
                    error_text = await resp.text()
                    return {"error": f"Runway API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Runway generation failed: {str(e)}"}

async def generate_video_pika(prompt: str, duration: int = 4, fps: int = 8, aspect_ratio: str = "16:9"):
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("pika")
    if not api_key:
        return {"error": "PIKA_API_KEY not configured"}
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = {"prompt": prompt, "duration": min(duration, 10), "fps": fps, "aspect_ratio": aspect_ratio}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            async with session.post("https://api.pika.art/v1/generate", json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=180)) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {"url": result.get("video_url") or result.get("output_url"), "status": "completed", "job_id": result.get("id")}
                else:
                    error_text = await resp.text()
                    return {"error": f"Pika API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Pika generation failed: {str(e)}"}

async def generate_video_luma(prompt: str, duration: int = 5, fps: int = 24, aspect_ratio: str = "16:9"):
    if not AIOHTTP_AVAILABLE:
        return {"error": "aiohttp not installed. Run: pip install aiohttp"}
    api_key = VIDEO_API_KEYS.get("luma")
    if not api_key:
        return {"error": "LUMA_API_KEY not configured"}
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = {"prompt": prompt, "duration": min(duration, 5), "aspect_ratio": aspect_ratio, "loop": False}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            async with session.post("https://api.lumalabs.ai/dream-machine/v1/generations", json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=180)) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return {"url": result.get("video_url"), "status": "pending", "job_id": result.get("id")}
                else:
                    error_text = await resp.text()
                    return {"error": f"Luma API error {resp.status}: {error_text}"}
    except Exception as e:
        return {"error": f"Luma generation failed: {str(e)}"}

import asyncio
import uuid
from fastapi import BackgroundTasks
from api.db import insert_video_job, get_video_job, update_video_job

async def simulate_video_rendering(job_id: str):
    try:
        await asyncio.sleep(3)
        update_video_job(job_id, status="rendering", progress=35)
        await asyncio.sleep(3)
        update_video_job(job_id, status="rendering", progress=75)
        await asyncio.sleep(3)
        update_video_job(
            job_id, 
            status="completed", 
            progress=100, 
            url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        )
    except Exception as e:
        update_video_job(job_id, status="failed", error=str(e))

async def poll_external_video_api(job_id: str, provider: str, api_key: str):
    import aiohttp
    async with aiohttp.ClientSession() as session:
        for _ in range(60):
            await asyncio.sleep(10)
            current_job = get_video_job(job_id)
            if not current_job or current_job["status"] == "cancelled":
                break
            try:
                if provider == "runway":
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    async with session.get(f"https://api.runwayml.com/v1/tasks/{job_id}", headers=headers) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            status = data.get("status")
                            if status == "SUCCEEDED":
                                url = data.get("video_url") or data.get("output", [None])[0]
                                update_video_job(job_id, status="completed", progress=100, url=url)
                                break
                            elif status == "FAILED":
                                error = data.get("error", "Unknown error")
                                update_video_job(job_id, status="failed", error=error)
                                break
                            else:
                                update_video_job(job_id, status="rendering", progress=50)
                elif provider == "luma":
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    async with session.get(f"https://api.lumalabs.ai/dream-machine/v1/generations/{job_id}", headers=headers) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            state = data.get("state")
                            if state == "completed":
                                url = data.get("assets", {}).get("video")
                                update_video_job(job_id, status="completed", progress=100, url=url)
                                break
                            elif state == "failed":
                                error = data.get("failure_reason", "Unknown error")
                                update_video_job(job_id, status="failed", error=error)
                                break
                            else:
                                update_video_job(job_id, status="rendering", progress=50)
                elif provider == "pika":
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    async with session.get(f"https://api.pika.art/v1/jobs/{job_id}", headers=headers) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            status = data.get("status")
                            if status == "completed":
                                url = data.get("video_url")
                                update_video_job(job_id, status="completed", progress=100, url=url)
                                break
                            elif status == "failed":
                                error = data.get("error", "Unknown error")
                                update_video_job(job_id, status="failed", error=error)
                                break
                            else:
                                update_video_job(job_id, status="rendering", progress=50)
            except Exception as e:
                print(f"Error polling video job {job_id}: {e}")

@router.post("/generate")
async def generate_video(data: dict, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    provider = data.get("provider", "runway")
    prompt = data.get("prompt", "")
    duration = int(data.get("duration", 4))
    fps = int(data.get("fps", 8))
    aspect_ratio = data.get("aspect_ratio", "16:9")
    
    api_key = VIDEO_API_KEYS.get(provider)
    
    if api_key:
        if provider == "runway":
            res = await generate_video_runway(prompt, duration, fps, aspect_ratio)
        elif provider == "pika":
            res = await generate_video_pika(prompt, duration, fps, aspect_ratio)
        elif provider == "luma":
            res = await generate_video_luma(prompt, duration, fps, aspect_ratio)
        else:
            return {"error": f"Unknown provider: {provider}"}
            
        if "error" in res:
            return res
            
        job_id = res.get("job_id") or f"vid_{uuid.uuid4().hex[:8]}"
        status = res.get("status", "pending")
        url = res.get("url")
        
        insert_video_job(job_id, provider, prompt, status, url)
        
        if status == "pending":
            background_tasks.add_task(poll_external_video_api, job_id, provider, api_key)
            
        return {"job_id": job_id, "status": status, "url": url}
    else:
        job_id = f"sim_{uuid.uuid4().hex[:8]}"
        insert_video_job(job_id, provider, prompt, "pending")
        background_tasks.add_task(simulate_video_rendering, job_id)
        return {"job_id": job_id, "status": "pending", "message": "Simulated rendering started in background."}

@router.get("/models")
async def list_video_models(user: dict = Depends(get_current_user)):
    return {
        "providers": {
            "runway": {"models": ["gen-2"], "max_duration": 16},
            "pika": {"models": ["pika-1.0"], "max_duration": 10},
            "luma": {"models": ["dream-machine"], "max_duration": 5},
            "replicate": {"models": ["stable-video-diffusion", "svd-xt"], "max_duration": 4},
        }
    }

@router.get("/job/{job_id}")
async def get_video_job_status(job_id: str, user: dict = Depends(get_current_user)):
    job = get_video_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
    return job

@router.post("/job/{job_id}/cancel")
async def cancel_video_job(job_id: str, user: dict = Depends(get_current_user)):
    job = get_video_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
    update_video_job(job_id, status="cancelled")
    return {"job_id": job_id, "status": "cancelled"}
