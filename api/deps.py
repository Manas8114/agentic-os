"""
Shared dependencies and utilities for API routers.
All routers import from this module to avoid circular imports.
"""
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import Depends, Header, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ─── Environment & Constants ────────────────────────────────────────

AGENTIC_OS_API_KEY = os.environ.get("AGENTIC_OS_API_KEY")
AGENTIC_OS_SECRET_KEY = os.environ.get("AGENTIC_OS_SECRET_KEY")

if not AGENTIC_OS_API_KEY:
    AGENTIC_OS_API_KEY = "local-dev-key"
    os.environ["AGENTIC_OS_API_KEY"] = AGENTIC_OS_API_KEY
if not AGENTIC_OS_SECRET_KEY or AGENTIC_OS_SECRET_KEY == "dev-secret-change-in-production":
    AGENTIC_OS_SECRET_KEY = hashlib.sha256(
        f"agentic-os:{AGENTIC_OS_API_KEY}:{Path.home()}".encode("utf-8")
    ).hexdigest()
    os.environ["AGENTIC_OS_SECRET_KEY"] = AGENTIC_OS_SECRET_KEY

VALID_API_KEYS = {AGENTIC_OS_API_KEY}
SECRET_KEY = AGENTIC_OS_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

BASE_DIR = Path(__file__).parent.parent.resolve()

# aiohttp for external API calls (optional import)
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

# HTTP Bearer scheme for JWT tokens
bearer_scheme = HTTPBearer(auto_error=False)

# ─── Models ─────────────────────────────────────────────────────────

class BrainUpdate(BaseModel):
    content: str

class SkillRunRequest(BaseModel):
    input: Optional[str] = ""
    agent: Optional[str] = "auto"

class ScheduleJobRequest(BaseModel):
    name: str
    skill: str
    cron: str
    enabled: bool = True

class SettingsUpdate(BaseModel):
    settings: dict

class BackupRestoreRequest(BaseModel):
    file: str

class ChatRequest(BaseModel):
    agent: str
    message: str

class KanbanTaskCreate(BaseModel):
    title: str
    body: str = ""
    status: str = "triage"
    priority: str = "medium"
    assignee: str = ""

class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None

class KanbanComplete(BaseModel):
    summary: str = ""

class KanbanBlock(BaseModel):
    reason: str = ""

class KanbanCommentCreate(BaseModel):
    message: str

class KanbanLinkCreate(BaseModel):
    parent_id: str
    child_id: str

class GoalCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    target_date: str = ""

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[str] = None

class JournalSave(BaseModel):
    content: str

class RouterSuggest(BaseModel):
    task: str

class RouterRoute(BaseModel):
    task: str
    agent: str

class TokenRequest(BaseModel):
    api_key: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

# ─── Helper Functions ───────────────────────────────────────────────

def read_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

def write_file(path: Path, content: str) -> bool:
    path.write_text(content, encoding="utf-8")
    return True

def list_dir(path: Path) -> List[str]:
    if not path.exists():
        return []
    return sorted([p.name for p in path.iterdir() if not p.name.startswith(".")])

def get_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()

def append_audit(entry: dict):
    audit_file = BASE_DIR / "audit" / "audit.log"
    entry["timestamp"] = get_timestamp()
    event_id = str(uuid.uuid4())[:8]
    entry["id"] = event_id
    audit_file.parent.mkdir(parents=True, exist_ok=True)
    with open(audit_file, "a") as f:
        f.write(json.dumps(entry) + "\n")
        
    # Also log to SQLite Timeline
    try:
        from api.db import insert_timeline_event
        title = f"Action: {entry.get('action')}"
        if "skill" in entry:
            title = f"Ran skill: {entry['skill']}"
        insert_timeline_event(
            event_type=entry.get("action", "unknown"),
            title=title,
            description=entry.get("output_preview", ""),
            metadata=entry,
            agent=entry.get("agent", "system"),
            status="info"
        )
    except Exception as e:
        print(f"Failed to log to timeline db: {e}")

def run_cli(args: list, timeout: int = 30):
    # On Windows, use cmd.exe /c for .cmd files
    if os.name == 'nt' and args and args[0].endswith('.cmd'):
        # Use cmd.exe /c to execute .cmd files properly
        new_args = ['cmd.exe', '/c'] + args
        r = subprocess.run(new_args, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr


def find_cli_binary(name: str) -> str:
    """Find the full path to a CLI binary, checking common locations."""
    import shutil
    path = shutil.which(name)
    if path:
        # On Windows, prefer .cmd/.exe extension for subprocess
        if os.name == 'nt':
            path_obj = Path(path)
            for ext in [".cmd", ".exe"]:
                ext_path = path_obj.with_suffix(ext)
                if ext_path.exists():
                    return str(ext_path)
        return path
    # Common npm global bin locations
    npm_paths = [
        os.path.expanduser("~/.npm-global/bin"),
        os.path.expanduser("~/AppData/Roaming/npm"),
        os.path.expanduser("~/AppData/Roaming/npm/node_modules/.bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
    ]
    for npm_path in npm_paths:
        # Windows .cmd/.exe variants first
        if os.name == 'nt':
            for ext in [".cmd", ".exe", ""]:
                candidate_ext = Path(npm_path) / f"{name}{ext}"
                if candidate_ext.exists():
                    return str(candidate_ext)
        else:
            candidate = Path(npm_path) / name
            if candidate.exists():
                return str(candidate)
    return name  # fallback to name, let subprocess handle it


def strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences from text."""
    if not text:
        return ""
    import re
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    return ansi_escape.sub('', text)


def clean_hermes_output(raw: str) -> str:
    if not raw:
        return ""
    # Strip ANSI escape sequences (color codes, cursor movement, etc.)
    import re
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    raw = ansi_escape.sub('', raw)
    
    lines = raw.split('\n')
    in_box = False
    content_lines = []
    for line in lines:
        if '╭─' in line:
            in_box = True
            continue
        if '╰─' in line:
            in_box = False
            continue
        if in_box:
            cleaned = line.strip()
            if cleaned:
                content_lines.append(cleaned)
    if content_lines:
        return '\n'.join(content_lines)
    non_meta = [l.strip() for l in lines if l.strip() and not l.startswith(('Query:', 'Initializing', '──', 'Resume', 'Session:', 'Duration:', 'Messages:'))]
    return '\n'.join(non_meta[-5:]) or raw

def execute_agent(agent: str, message: str) -> str:
    try:
        if agent == "opencode":
            opencode_bin = find_cli_binary("opencode")
            try:
                code, out, err = run_cli([opencode_bin, "run", "--format", "json", message], timeout=30)
            except subprocess.TimeoutExpired:
                return f"⏱ Agent 'opencode' timed out.\n\nOpenCode's model is taking too long. Try running `opencode run \"{message[:60]}\"` directly in your terminal.\n\n**Message:** {message[:100]}"
            if code == 0:
                response_text = ""
                for line in (out or "").split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                        if event.get("type") == "text":
                            text = event.get("part", {}).get("text", "")
                            if text:
                                response_text += text + "\n"
                    except (json.JSONDecodeError, KeyError):
                        continue
                if response_text:
                    return response_text.strip()
                return f"**opencode**\n\nProcessed your message.\n\n**Message:** {message[:100]}"
            err_msg = (err or "").strip()
            return err_msg or f"opencode returned exit code {code}"

        elif agent == "hermes":
            hermes_bin = find_cli_binary("hermes")
            try:
                code, out, err = run_cli([hermes_bin, "chat", "-q", message], timeout=180)
            except subprocess.TimeoutExpired:
                return f"⏱ Hermes timed out.\n\nThe model took too long to respond. Try a shorter query or check your OpenRouter rate limits.\n\n**Message:** {message[:100]}"
            if code == 0:
                cleaned = clean_hermes_output(out or "")
                if cleaned:
                    return cleaned
                return f"**Hermes**\n\nReceived your message but the model returned an empty response. Try rephrasing your query.\n\n**Message:** {message}"
            err_msg = (err or "").strip()
            if "invalid choice" in err_msg or "usage:" in err_msg:
                return f"**Hermes needs setup**\n\nRun `hermes setup` or check your config.\n\n**Details:** {err_msg[:200]}"
            return err_msg or f"hermes returned exit code {code}"

        elif agent == "gemini":
            gemini_bin = find_cli_binary("gemini")
            for attempt, (args, to) in enumerate([
                (["-y", "--skip-trust", "-m", "gemini-2.5-flash"], 60),
                (["-y", "--skip-trust"], 40),
            ]):
                try:
                    code, out, err = run_cli([gemini_bin, *args, message], timeout=to)
                except subprocess.TimeoutExpired:
                    if attempt == 0:
                        continue
                    return f"⏱ Gemini timed out.\n\nTry running `gemini \"{message[:60]}\"` directly.\n\n**Message:** {message[:100]}"
                if code == 0:
                    # Strip ANSI codes from gemini output too
                    cleaned = strip_ansi(out or "")
                    return cleaned.strip() or f"**Gemini CLI**\n\nProcessed your query.\n\n**Message:** {message}"
                err_msg = (err or "").strip()
                if attempt == 0 and ("model" in err_msg.lower() or "not found" in err_msg.lower()):
                    continue
                if "auth" in err_msg.lower() or "login" in err_msg.lower():
                    return f"**Gemini needs re-auth**\n\nRun `gemini auth login` to re-authenticate.\n\n**Details:** {err_msg[:200]}"
                return err_msg or f"gemini returned exit code {code}"
            return "Gemini CLI did not return a response."

        elif agent == "codex":
            codex_bin = find_cli_binary("codex")
            try:
                code, out, err = run_cli([codex_bin, "exec", message, "--json"], timeout=120)
            except subprocess.TimeoutExpired:
                return f"⏱ Codex timed out.\n\nTry running `{codex_bin} exec \"{message[:60]}\" --json` directly.\n\n**Message:** {message[:100]}"
            if code == 0:
                # Parse JSONL output to extract agent message text
                response_text = ""
                for line in (out or "").split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                        if event.get("type") == "item.completed":
                            item = event.get("item", {})
                            if item.get("type") == "agent_message":
                                text = item.get("text", "")
                                if text:
                                    response_text += text + "\n"
                    except (json.JSONDecodeError, KeyError):
                        continue
                if response_text:
                    return response_text.strip()
                return f"**Codex**\n\nProcessed your query.\n\n**Message:** {message}"
            err_msg = (err or "").strip()
            if "auth" in err_msg.lower() or "login" in err_msg.lower():
                return f"**Codex needs auth**\n\nRun `codex auth login` to authenticate.\n\n**Details:** {err_msg[:200]}"
            return err_msg or f"codex returned exit code {code}"

        elif agent == "claude":
            try:
                from anthropic import Anthropic
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if not api_key:
                    return f"⚠ Claude needs ANTHROPIC_API_KEY environment variable set."
                client = Anthropic(api_key=api_key)
                model = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
                response = client.messages.create(
                    model=model,
                    max_tokens=4096,
                    messages=[{"role": "user", "content": message}]
                )
                return response.content[0].text if response.content else "**Claude**\n\nNo response received."
            except Exception as e:
                return f"⚠ Error communicating with claude: {str(e)}"

        elif agent == "openclaw":
            # Fix #12: direct Gemini call — no recursive execute_agent which swallows errors
            gemini_bin = find_cli_binary("gemini")
            prompt = f"You are OpenClaw, the orchestration agent. Coordinate and decompose the following task:\n\n{message}"
            try:
                code, out, err = run_cli([gemini_bin, "-y", "--skip-trust", "-m", "gemini-2.5-flash", prompt], timeout=60)
                return (out or "").strip() or f"OpenClaw: processed task."
            except subprocess.TimeoutExpired:
                return f"⏱ OpenClaw timed out."
            except FileNotFoundError:
                return f"⚠ Gemini CLI not installed (required by OpenClaw)."

        elif agent == "jarvis":
            # Fix #12: direct Gemini call
            gemini_bin = find_cli_binary("gemini")
            prompt = f"You are Jarvis, the voice-first executive assistant. Address the user's command politely and professionally:\n\n{message}"
            try:
                code, out, err = run_cli([gemini_bin, "-y", "--skip-trust", "-m", "gemini-2.5-flash", prompt], timeout=60)
                return (out or "").strip() or f"Jarvis: command processed."
            except subprocess.TimeoutExpired:
                return f"⏱ Jarvis timed out."
            except FileNotFoundError:
                return f"⚠ Gemini CLI not installed (required by Jarvis)."

        elif agent == "odysseus":
            # Fix #12: direct Gemini call
            gemini_bin = find_cli_binary("gemini")
            prompt = f"You are Odysseus, the autonomous planning and research agent. Outline a deep research plan for this objective:\n\n{message}"
            try:
                code, out, err = run_cli([gemini_bin, "-y", "--skip-trust", "-m", "gemini-2.5-flash", prompt], timeout=60)
                return (out or "").strip() or f"Odysseus: plan generated."
            except subprocess.TimeoutExpired:
                return f"⏱ Odysseus timed out."
            except FileNotFoundError:
                return f"⚠ Gemini CLI not installed (required by Odysseus)."

        elif agent == "antigravity":
            # Fix #12: direct Gemini call
            gemini_bin = find_cli_binary("gemini")
            research_prompt = f"""You are Antigravity — a research and discovery specialist within Agentic OS.
Your role: web research, experimentation, competitive analysis, technology scouting, synthesis.

INSTRUCTIONS:
- Use web search tools extensively for current information
- Synthesize findings into structured reports with citations
- Document experiments with hypothesis, method, results
- Track sources and confidence levels for all claims

TASK:
{message}"""
            try:
                code, out, err = run_cli([gemini_bin, "-y", "--skip-trust", "-m", "gemini-2.5-flash", research_prompt], timeout=60)
                return (out or "").strip() or f"Antigravity: research complete."
            except subprocess.TimeoutExpired:
                return f"⏱ Antigravity timed out."
            except FileNotFoundError:
                return f"⚠ Gemini CLI not installed (required by Antigravity)."

        else:
            return f"Unknown agent: {agent}"
    except subprocess.TimeoutExpired:
        return f"⏱ Agent '{agent}' timed out.\n\nRun `{agent} --help` in your terminal for CLI usage.\n\n**Message:** {message[:100]}"
    except FileNotFoundError:
        return f"⚠ Agent '{agent}' CLI not installed. Install it and try again."
    except Exception as e:
        return f"⚠ Error communicating with {agent}: {str(e)}"

# ─── Embedding & Vector Functions ───────────────────────────────────

EMBEDDING_DIM = 1536


# Initialize sentence transformer model lazily
_sentence_model = None

def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Using a lightweight, fast model
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        except ImportError:
            _sentence_model = False
    return _sentence_model

def local_embedding(text: str, dim: int = EMBEDDING_DIM) -> list:
    """Generate true semantic embedding locally if sentence-transformers is installed, else error."""
    model = get_sentence_model()
    if model:
        # Get 384-dimensional embedding
        vec = model.encode(text).tolist()
        # Pad to expected 1536 dimension to match schema compatibility
        if len(vec) < dim:
            vec.extend([0.0] * (dim - len(vec)))
        return vec[:dim]
    raise RuntimeError("GEMINI_API_KEY is missing and sentence-transformers is not installed. Real embeddings require a valid API key.")

async def generate_embedding(text: str) -> list:
    text = text[:8000]
    
    # Try local embedding first to save API usage
    try:
        return local_embedding(text)
    except RuntimeError:
        pass
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing and sentence-transformers is not installed. Real embeddings require a valid API key.")
    
    try:
        if not AIOHTTP_AVAILABLE:
            import urllib.request
            import urllib.parse
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
            payload = json.dumps({
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]}
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    vec = data["embedding"]["values"]
                    if len(vec) < EMBEDDING_DIM:
                        vec.extend([0.0] * (EMBEDDING_DIM - len(vec)))
                    return vec[:EMBEDDING_DIM]
                return local_embedding(text)
        else:
            import aiohttp
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]}
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        vec = data["embedding"]["values"]
                        if len(vec) < EMBEDDING_DIM:
                            vec.extend([0.0] * (EMBEDDING_DIM - len(vec)))
                        return vec[:EMBEDDING_DIM]
                    return local_embedding(text)
    except Exception as e:
        print(f"Embedding error: {e}")
        return local_embedding(text)

def cosine_similarity(a: list, b: list) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

# ─── Agent Discovery ────────────────────────────────────────────────

def check_agent(name: str) -> dict:
    """Deep networking/execution check to verify agent responsiveness."""
    try:
        if name == "opencode":
            exists = shutil.which("opencode") is not None
            if exists:
                code, _, _ = run_cli(["opencode", "--help"], timeout=5)
                status = "online" if code == 0 else "warning"
            else:
                status = "offline"
        elif name == "hermes":
            exists = shutil.which("hermes") is not None
            if exists:
                code, _, _ = run_cli(["hermes", "--help"], timeout=5)
                status = "online" if code == 0 else "warning"
            else:
                status = "offline"
        elif name == "gemini":
            oauth = Path.home() / ".gemini" / "oauth_creds.json"
            exists = shutil.which("gemini") is not None
            # Fix #25: check for 'access_token' key in JSON instead of 'ya29' string prefix
            logged_in = False
            if oauth.exists():
                try:
                    creds = json.loads(oauth.read_text())
                    logged_in = bool(creds.get("access_token") or creds.get("token"))
                except Exception:
                    pass
            if exists and logged_in:
                code, _, _ = run_cli(["gemini", "--help"], timeout=5)
                status = "online" if code == 0 else "warning"
            else:
                status = "warning" if exists else "offline"
        elif name == "codex":
            exists = shutil.which("codex") is not None
            if exists:
                code, _, _ = run_cli(["codex", "--help"], timeout=5)
                status = "online" if code == 0 else "warning"
            else:
                status = "offline"
        elif name == "claude":
            has_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
            status = "online" if has_key else "offline"
        elif name in ("openclaw", "jarvis", "odysseus", "antigravity"):
            config_exists = (BASE_DIR / "agents" / name / f"{name}.json").exists()
            gemini_status = check_agent("gemini")["status"]
            status = gemini_status if config_exists and gemini_status in ("online", "warning") else "offline"
        else:
            status = "offline"
    except Exception:
        status = "offline"
    return {"name": name, "status": status}

# ─── Data Helpers ───────────────────────────────────────────────────

KANBAN_DIR = BASE_DIR / "data" / "kanban"
GOALS_FILE = BASE_DIR / "data" / "goals.json"
JOURNAL_DIR = BASE_DIR / "brain" / "journal"

def ensure_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)

def load_kanban_tasks():
    ensure_dir(KANBAN_DIR)
    tasks = []
    for f in sorted(KANBAN_DIR.glob("*.json")):
        tasks.append(json.loads(f.read_text()))
    return tasks

def save_kanban_task(task: dict):
    ensure_dir(KANBAN_DIR)
    (KANBAN_DIR / f"{task['id']}.json").write_text(json.dumps(task, indent=2))

def load_goals():
    if GOALS_FILE.exists():
        return json.loads(GOALS_FILE.read_text())
    return []

def save_goals(goals: list):
    GOALS_FILE.write_text(json.dumps(goals, indent=2))

# ─── Authentication ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    if len(password.encode('utf-8')) > 72:
        password = hashlib.sha256(password.encode()).hexdigest()
    try:
        from passlib.hash import bcrypt
        return bcrypt.hash(password)
    except Exception:
        return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = hashlib.sha256(plain_password.encode()).hexdigest()
    if hashed_password.startswith(('$2b$', '$2a$', '$2y$')):
        try:
            from passlib.hash import bcrypt
            return bcrypt.verify(plain_password, hashed_password)
        except Exception:
            return False
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    import jwt
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

async def get_current_user(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    """Authenticate using either X-API-Key header or Authorization: Bearer <token>"""
    if credentials and credentials.scheme.lower() == "bearer":
        payload = decode_token(credentials.credentials)
        if payload:
            return {"user_id": payload.get("sub"), "scopes": payload.get("scopes", [])}
    if x_api_key and x_api_key in VALID_API_KEYS:
        return {"api_key": x_api_key}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication (provide X-API-Key or Authorization: Bearer <token>)",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_optional_user(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    """Returns user if authenticated, None otherwise (doesn't raise 401)"""
    if credentials and credentials.scheme.lower() == "bearer":
        payload = decode_token(credentials.credentials)
        if payload:
            return {"user_id": payload.get("sub"), "scopes": payload.get("scopes", [])}
    if x_api_key and x_api_key in VALID_API_KEYS:
        return {"api_key": x_api_key}
    return None

# ─── Auto Context Injection ─────────────────────────────────────────

async def auto_inject_context(task: str, agent: str) -> str:
    """Auto-inject relevant context based on rules"""
    try:
        from api.context import inject_context  # Import later to avoid circular
        return await inject_context(task, agent)
    except Exception:
        return ""
