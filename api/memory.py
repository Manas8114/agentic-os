"""
Memory endpoints: vector DB, knowledge graph, search, reindex.
"""
from fastapi import APIRouter, Depends, HTTPException
from api.deps import BASE_DIR, append_audit, get_current_user, generate_embedding, cosine_similarity, get_timestamp
import json
import os

router = APIRouter()

VECTOR_DB_FILE = BASE_DIR / "data" / "vector-memory.json"
KG_FILE = BASE_DIR / "data" / "knowledge-graph.json"

def load_vector_db():
    if VECTOR_DB_FILE.exists():
        try:
            return json.loads(VECTOR_DB_FILE.read_text())
        except Exception:  # Fix #14: was bare except:
            pass
    return {"vectors": [], "metadata": [], "version": 1}

def save_vector_db(data):
    VECTOR_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    VECTOR_DB_FILE.write_text(json.dumps(data, indent=2))

async def index_content(source: str, content_id: str, text: str, metadata: dict = None):
    embedding = await generate_embedding(text)
    vector_db = load_vector_db()
    existing_idx = None
    for i, meta in enumerate(vector_db["metadata"]):
        if meta.get("source") == source and meta.get("content_id") == content_id:
            existing_idx = i
            break
    entry = {"source": source, "content_id": content_id, "text": text[:500], "embedding": embedding, "metadata": metadata or {}, "indexed_at": get_timestamp()}
    if existing_idx is not None:
        vector_db["vectors"][existing_idx] = embedding
        vector_db["metadata"][existing_idx] = entry
    else:
        vector_db["vectors"].append(embedding)
        vector_db["metadata"].append(entry)
    save_vector_db(vector_db)

@router.get("/verification")
async def verify_memory(user: dict = Depends(get_current_user)):
    vector_db = load_vector_db()
    kg = {"nodes": [], "edges": []}
    if KG_FILE.exists():
        try:
            kg = json.loads(KG_FILE.read_text())
        except Exception:  # Fix #14: was bare except:
            pass
    return {
        "vector_db": {"vectors_count": len(vector_db["vectors"]), "metadata_count": len(vector_db["metadata"])},
        "knowledge_graph": {"nodes": len(kg.get("nodes", [])), "edges": len(kg.get("edges", []))},
        "brain_files": len(list((BASE_DIR / "brain").glob("*.md"))) if (BASE_DIR / "brain").exists() else 0,
        "journal_entries": len(list((BASE_DIR / "brain" / "journal").glob("*.md"))) if (BASE_DIR / "brain" / "journal").exists() else 0,
    }

@router.post("/initialize")
async def initialize_memory(data: dict, user: dict = Depends(get_current_user)):
    from api.deps import append_audit
    append_audit({"action": "memory_initialized", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "initialized", "message": "Memory system initialized"}

@router.post("/repair")
async def repair_memory(user: dict = Depends(get_current_user)):
    from api.deps import append_audit
    append_audit({"action": "memory_repair_requested", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "repair_started", "message": "Memory repair initiated"}

@router.post("/reindex")
async def reindex_memory(user: dict = Depends(get_current_user)):
    from api.deps import append_audit
    indexed = 0
    # Re-index brain files
    brain_dir = BASE_DIR / "brain"
    if brain_dir.exists():
        for f in brain_dir.glob("*.md"):
            content = f.read_text()
            await index_content("brain", f.name, content)
            indexed += 1
    # Re-index journal
    journal_dir = brain_dir / "journal"
    if journal_dir.exists():
        for f in journal_dir.glob("*.md"):
            content = f.read_text()
            await index_content("journal", f.stem, content)
            indexed += 1
    # Re-index skills
    skills_dir = BASE_DIR / "skills"
    if skills_dir.exists():
        for d in skills_dir.iterdir():
            if d.is_dir() and not d.name.startswith("_"):
                skill_md = d / "SKILL.md"
                if skill_md.exists():
                    content = skill_md.read_text()
                    await index_content("skill", d.name, content)
                    indexed += 1
    append_audit({"action": "memory_reindexed", "user": user.get("user_id") or user.get("api_key")})
    return {"status": "reindexed", "message": "Memory reindexed", "indexed": indexed}

@router.post("/search")
async def semantic_search(data: dict, user: dict = Depends(get_current_user)):
    query = str(data.get("query", "")).strip()
    top_k = int(data.get("top_k", 10))
    min_score = float(data.get("min_score", 0.3))
    if not query:
        return {"results": []}
    query_embedding = await generate_embedding(query)
    vector_db = load_vector_db()
    if not vector_db["vectors"]:
        return {"results": []}
    results = []
    for i, (embedding, metadata) in enumerate(zip(vector_db["vectors"], vector_db["metadata"])):
        score = cosine_similarity(query_embedding, embedding)
        if score >= min_score:
            results.append({"score": round(score, 4), "source": metadata.get("source"), "content_id": metadata.get("content_id"), "text_preview": metadata.get("text", "")[:200], "metadata": metadata.get("metadata", {}), "indexed_at": metadata.get("indexed_at")})
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"results": results[:top_k]}

@router.get("/vector-stats")
async def vector_stats(user: dict = Depends(get_current_user)):
    vector_db = load_vector_db()
    by_source = {}
    for item in vector_db.get("metadata", []):
        source = item.get("source", "unknown")
        by_source[source] = by_source.get(source, 0) + 1
    db_size = VECTOR_DB_FILE.stat().st_size if VECTOR_DB_FILE.exists() else 0
    total = len(vector_db.get("vectors", []))
    return {
        "vectors": total,
        "metadata": len(vector_db.get("metadata", [])),
        "dimension": 1536,
        "total_vectors": total,
        "embedding_dim": 1536,
        "by_source": by_source,
        "db_size_bytes": db_size,
    }
