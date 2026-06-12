import sqlite3
import json
import uuid
import threading
from datetime import datetime, timezone
from pathlib import Path

# Locate the data directory inside the project root
BASE_DIR = Path(__file__).parent.parent.resolve()
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "system.db"

# Ensure data dir exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# We use threading.local to manage a SQLite connection per thread since SQLite
# connections cannot safely be shared across threads in FastAPI by default.
_local = threading.local()
_db_lock = threading.Lock()

def get_db():
    """Get a thread-local database connection."""
    if not hasattr(_local, "conn"):
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn

def init_db():
    """Initialize the database schema."""
    conn = get_db()
    cursor = conn.cursor()

    # Timeline events for the Unified Timeline
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timeline_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            metadata TEXT,
            agent TEXT,
            status TEXT
        )
    """)

    # Agent chat sessions and logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            agent TEXT NOT NULL,
            task TEXT,
            status TEXT,
            log_data TEXT
        )
    """)

    # Voice Captures for OMI
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS voice_captures (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            transcript TEXT NOT NULL,
            summary TEXT,
            action_items TEXT,
            topics TEXT,
            duration REAL,
            source TEXT,
            processed INTEGER DEFAULT 0
        )
    """)

    # Run migrations for voice_captures to add columns if they don't exist
    try:
        cursor.execute("ALTER TABLE voice_captures ADD COLUMN action_items TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE voice_captures ADD COLUMN topics TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE voice_captures ADD COLUMN source TEXT")
    except sqlite3.OperationalError:
        pass

    # Video Jobs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_jobs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            provider TEXT NOT NULL,
            prompt TEXT NOT NULL,
            status TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            url TEXT,
            error TEXT
        )
    """)

    conn.commit()

# Call init_db on module load to ensure tables exist
init_db()

# --- Timeline Helpers ---

def insert_timeline_event(event_type: str, title: str, description: str = "", metadata: dict = None, agent: str = "system", status: str = "info"):
    """Insert an event into the timeline."""
    with _db_lock:
        conn = get_db()
        cursor = conn.cursor()
        event_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        meta_str = json.dumps(metadata) if metadata else "{}"
        
        cursor.execute("""
            INSERT INTO timeline_events (id, timestamp, type, title, description, metadata, agent, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (event_id, timestamp, event_type, title, description, meta_str, agent, status))
        conn.commit()
    return event_id

def get_timeline(limit: int = 100):
    """Retrieve recent timeline events."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM timeline_events
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    
    events = []
    for row in cursor.fetchall():
        events.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "type": row["type"],
            "title": row["title"],
            "description": row["description"],
            "metadata": json.loads(row["metadata"]),
            "agent": row["agent"],
            "status": row["status"]
        })
    return events

# --- Session Helpers ---

def create_session(agent: str, task: str):
    conn = get_db()
    cursor = conn.cursor()
    session_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO agent_sessions (id, started_at, agent, task, status, log_data)
        VALUES (?, ?, ?, ?, 'running', '[]')
    """, (session_id, timestamp, agent, task))
    conn.commit()
    return session_id

def update_session(session_id: str, status: str, log_data: list):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE agent_sessions 
        SET status = ?, log_data = ?
        WHERE id = ?
    """, (status, json.dumps(log_data), session_id))
    conn.commit()

def get_sessions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agent_sessions ORDER BY started_at DESC")
    sessions = []
    for row in cursor.fetchall():
        sessions.append({
            "id": row["id"],
            "started_at": row["started_at"],
            "agent": row["agent"],
            "task": row["task"],
            "status": row["status"],
            "log_data": json.loads(row["log_data"])
        })
    return sessions

# --- Voice Capture Helpers ---

def insert_voice_capture(capture_id: str, transcript: str, summary: str, action_items: list, topics: list, duration: float, source: str):
    conn = get_db()
    cursor = conn.cursor()
    timestamp = datetime.now(timezone.utc).isoformat()
    action_items_str = json.dumps(action_items)
    topics_str = json.dumps(topics)
    
    cursor.execute("""
        INSERT INTO voice_captures (id, timestamp, transcript, summary, action_items, topics, duration, source, processed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (capture_id, timestamp, transcript, summary, action_items_str, topics_str, duration, source))
    conn.commit()

def get_voice_captures(limit: int = 100):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM voice_captures
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    
    captures = []
    for row in cursor.fetchall():
        try:
            action_items = json.loads(row["action_items"]) if row["action_items"] else []
        except:
            action_items = []
        try:
            topics = json.loads(row["topics"]) if row["topics"] else []
        except:
            topics = []
            
        captures.append({
            "id": row["id"],
            "created": row["timestamp"],
            "transcription": row["transcript"],
            "summary": row["summary"],
            "action_items": action_items,
            "topics": topics,
            "duration": row["duration"] or 0.0,
            "source": row["source"] or "push-to-talk",
        })
    return captures

def get_voice_capture(capture_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM voice_captures WHERE id = ?", (capture_id,))
    row = cursor.fetchone()
    if not row:
        return None
        
    try:
        action_items = json.loads(row["action_items"]) if row["action_items"] else []
    except:
        action_items = []
    try:
        topics = json.loads(row["topics"]) if row["topics"] else []
    except:
        topics = []
        
    return {
        "id": row["id"],
        "created": row["timestamp"],
        "transcription": row["transcript"],
        "summary": row["summary"],
        "action_items": action_items,
        "topics": topics,
        "duration": row["duration"] or 0.0,
        "source": row["source"] or "push-to-talk",
    }

def delete_voice_capture(capture_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM voice_captures WHERE id = ?", (capture_id,))
    conn.commit()

# --- Video Job Helpers ---

def insert_video_job(job_id: str, provider: str, prompt: str, status: str = "pending", url: str = None):
    conn = get_db()
    cursor = conn.cursor()
    timestamp = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO video_jobs (id, timestamp, provider, prompt, status, progress, url, error)
        VALUES (?, ?, ?, ?, ?, 0, ?, NULL)
    """, (job_id, timestamp, provider, prompt, status, url))
    conn.commit()

def get_video_job(job_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM video_jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "provider": row["provider"],
        "prompt": row["prompt"],
        "status": row["status"],
        "progress": row["progress"],
        "url": row["url"],
        "error": row["error"]
    }

def update_video_job(job_id: str, status: str, progress: int = None, url: str = None, error: str = None):
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    updates.append("status = ?")
    params.append(status)
    
    if progress is not None:
        updates.append("progress = ?")
        params.append(progress)
    if url is not None:
        updates.append("url = ?")
        params.append(url)
    if error is not None:
        updates.append("error = ?")
        params.append(error)
        
    params.append(job_id)
    query = f"UPDATE video_jobs SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, tuple(params))
    conn.commit()

def list_video_jobs(limit: int = 100):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM video_jobs
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    
    jobs = []
    for row in cursor.fetchall():
        jobs.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "provider": row["provider"],
            "prompt": row["prompt"],
            "status": row["status"],
            "progress": row["progress"],
            "url": row["url"],
            "error": row["error"]
        })
    return jobs
