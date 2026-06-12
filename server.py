#!/usr/bin/env python3
"""
Agentic OS — FastAPI Backend (Modular Architecture)
Multi-agent orchestration server for opencode, Hermes, Gemini CLI
"""
import os
import argparse
import uuid
import json
import time
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Fix #23: record server start time for accurate uptime reporting
_SERVER_START = time.time()

BASE_DIR = Path(__file__).parent
DASHBOARD_DIR = BASE_DIR / "dashboard"

# api.deps validates auth environment variables during import, so load the
# Hermes env file before importing any API router modules.
HERMES_ENV = Path.home() / ".hermes" / ".env"
if HERMES_ENV.exists():
    for line in HERMES_ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if k in ("OPENROUTER_API_KEY", "AGENTIC_OS_API_KEY", "AGENTIC_OS_SECRET_KEY"):
                os.environ[k] = v

# Import API module with all routers.
from api import api_router

# ─── WebSocket Connection Manager ───────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str):
        dead = []
        for cid, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:  # Fix #13: was bare except:
                print(f"[WS] Broadcast error for {cid}: {e}")
                dead.append(cid)
        for cid in dead:
            self.active_connections.pop(cid, None)

manager = ConnectionManager()

# ─── FastAPI App ────────────────────────────────────────────────────

app = FastAPI(title="Agentic OS", version="1.1.0")

# aiohttp for external API calls (optional import)
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(api_router, prefix="/api")

# ─── WebSocket Endpoint ─────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=None),
    api_key: str = Query(default=None),
):
    # Fix #3: Validate auth before accepting the connection
    from api.deps import VALID_API_KEYS, decode_token
    authenticated = False
    if token:
        payload = decode_token(token)
        authenticated = payload is not None
    if not authenticated and api_key:
        authenticated = api_key in VALID_API_KEYS
    if not authenticated:
        await websocket.close(code=1008)  # Policy Violation — unauthenticated
        return

    client_id = str(uuid.uuid4())[:8]
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for testing, or handle specific message types
            try:
                msg = json.loads(data)
                if msg.get("type") == "request_status":
                    # Return current agent status
                    from api.deps import check_agent, BASE_DIR as _BASE
                    agents = [check_agent(a) for a in ["opencode", "hermes", "gemini", "codex", "claude", "openclaw", "jarvis", "odysseus", "antigravity"]]
                    skills_dir = _BASE / "skills"
                    skills_count = len([d for d in skills_dir.iterdir() if d.is_dir() and not d.name.startswith("_")]) if skills_dir.exists() else 0
                    await websocket.send_text(json.dumps({
                        "type": "agent_status",
                        "data": {
                            "agents": agents,
                            "skills_count": skills_count,
                            "uptime": time.time() - _SERVER_START,  # Fix #23: actual uptime in seconds
                        }
                    }))
                elif msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(client_id)

# Serve dashboard static files
if DASHBOARD_DIR.exists():
    app.mount("/dashboard", StaticFiles(directory=DASHBOARD_DIR, html=True), name="dashboard")

# ─── CLI Entrypoint ────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agentic OS Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8080, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run("server:app", host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()
