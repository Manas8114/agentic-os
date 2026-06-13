"""
Agentic OS API — Modular Router Aggregation
All endpoint routers are imported and registered here.
"""
from fastapi import APIRouter

# Import all routers
from api.auth import router as auth_router
from api.brain import router as brain_router
from api.skills import router as skills_router
from api.scheduler import router as scheduler_router
from api.kanban import router as kanban_router
from api.goals import router as goals_router
from api.journal import router as journal_router
from api.chat import router as chat_router
from api.agent_health import router as agent_health_router
from api.router import router as router_router
from api.analytics import router as analytics_router
from api.image import router as image_router
from api.video import router as video_router
from api.jarvis import router as jarvis_router
from api.memory import router as memory_router
from api.knowledge_graph import router as knowledge_graph_router
from api.handoffs import router as handoffs_router
from api.context import router as context_router
from api.cost import router as cost_router
from api.plugins import router as plugins_router
from api.backup import router as backup_router
from api.standards import router as standards_router
from api.sessions import router as sessions_router
from api.system import router as system_router
from api.swarm import router as swarm_router
from api.settings import router as settings_router
from api.webhooks import router as webhooks_router
from api.seo import router as seo_router

# Aggregate router
api_router = APIRouter()

# Register all routers with /api prefix
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(brain_router, prefix="/brain", tags=["brain"])
api_router.include_router(skills_router, prefix="/skills", tags=["skills"])
api_router.include_router(scheduler_router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(kanban_router, prefix="/kanban", tags=["kanban"])
api_router.include_router(goals_router, prefix="/goals", tags=["goals"])
api_router.include_router(journal_router, prefix="/journal", tags=["journal"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(agent_health_router, prefix="/agents", tags=["agent-health"])
api_router.include_router(router_router, prefix="/router", tags=["router"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(image_router, prefix="/image", tags=["image"])
api_router.include_router(video_router, prefix="/video", tags=["video"])
api_router.include_router(jarvis_router, prefix="/jarvis", tags=["jarvis"])
api_router.include_router(memory_router, prefix="/memory", tags=["memory"])
api_router.include_router(knowledge_graph_router, prefix="/knowledge-graph", tags=["knowledge-graph"])
api_router.include_router(handoffs_router, prefix="/handoffs", tags=["handoffs"])
api_router.include_router(context_router, prefix="/context", tags=["context"])
api_router.include_router(cost_router, prefix="/cost", tags=["cost"])
api_router.include_router(plugins_router, prefix="/plugins", tags=["plugins"])
api_router.include_router(backup_router, prefix="/backup", tags=["backup"])
api_router.include_router(standards_router, prefix="/standards", tags=["standards"])
api_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
api_router.include_router(system_router, tags=["system"])
api_router.include_router(swarm_router, prefix="/swarm", tags=["swarm"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(seo_router, prefix="/seo", tags=["seo"])
