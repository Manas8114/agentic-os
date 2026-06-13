"""
Image generation endpoints.

The local dashboard can queue image ideas without requiring a paid provider.
Provider-backed generation can be added behind this stable contract later.
"""
from fastapi import APIRouter, Depends, HTTPException
import os
import aiohttp

from api.deps import get_current_user

router = APIRouter()


@router.get("/models")
async def list_image_models(user: dict = Depends(get_current_user)):
    return {
        "providers": {
            "openai": {
                "models": ["dall-e-3", "dall-e-2"],
                "free_tier": False,
                "description": "OpenAI DALL-E image generation",
            }
        }
    }


@router.post("/generate")
async def generate_image(data: dict, user: dict = Depends(get_current_user)):
    provider = data.get("provider", "openai")
    prompt = data.get("prompt", "a futuristic agentic OS")
    model = data.get("model", "dall-e-3")
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured. Real image generation requires an active key.")
        
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model,
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024"
            }
            async with session.post("https://api.openai.com/v1/images/generations", json=payload, headers=headers) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    image_url = result["data"][0]["url"]
                    return {
                        "status": "completed",
                        "provider": provider,
                        "model": model,
                        "prompt": prompt,
                        "url": image_url,
                        "message": f"Generated image using {provider}",
                    }
                else:
                    error_text = await resp.text()
                    raise HTTPException(status_code=resp.status, detail=f"OpenAI API error: {error_text}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
