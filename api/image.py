"""
Image generation endpoints.

The local dashboard can queue image ideas without requiring a paid provider.
Provider-backed generation can be added behind this stable contract later.
"""
from fastapi import APIRouter, Depends

from api.deps import get_current_user

router = APIRouter()


@router.get("/models")
async def list_image_models(user: dict = Depends(get_current_user)):
    return {
        "providers": {
            "local-placeholder": {
                "models": ["prompt-card"],
                "free_tier": True,
                "description": "Stores the prompt and returns a placeholder result.",
            }
        }
    }


@router.post("/generate")
async def generate_image(data: dict, user: dict = Depends(get_current_user)):
    import urllib.parse
    
    prompt = data.get("prompt", "a futuristic agentic OS")
    encoded_prompt = urllib.parse.quote(prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&nologo=true"
    
    return {
        "status": "completed",
        "provider": data.get("provider", "pollinations"),
        "model": data.get("model", "flux"),
        "prompt": prompt,
        "url": image_url,
        "message": "Generated image using Pollinations.ai",
    }
