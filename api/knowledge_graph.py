"""
Knowledge graph endpoints: lightweight entity extraction, search, stats, reindex.
"""
import json
import re
from collections import Counter, defaultdict

from fastapi import APIRouter, Depends

from api.deps import BASE_DIR, append_audit, get_current_user

router = APIRouter()

KG_FILE = BASE_DIR / "data" / "knowledge-graph.json"

STOP_ENTITIES = {
    "The", "This", "That", "For", "With", "From", "When", "Where", "What", "Why",
    "How", "Agentic", "OS", "AI",
}


def load_graph():
    if KG_FILE.exists():
        try:
            graph = json.loads(KG_FILE.read_text(encoding="utf-8"))
            return normalize_graph(graph)
        except Exception:
            pass
    return {"entities": {}, "relations": [], "version": 1}


def save_graph(graph):
    KG_FILE.parent.mkdir(parents=True, exist_ok=True)
    KG_FILE.write_text(json.dumps(normalize_graph(graph), indent=2), encoding="utf-8")


def normalize_graph(graph):
    if "entities" in graph and isinstance(graph["entities"], dict):
        return {
            "entities": graph.get("entities", {}),
            "relations": graph.get("relations", graph.get("edges", [])),
            "version": graph.get("version", 1),
        }

    entities = {}
    for node in graph.get("nodes", []):
        name = node.get("name") or node.get("id") or node.get("label")
        if name:
            entities[name] = {
                "type": node.get("type", "unknown"),
                "mentions": node.get("mentions", []),
            }
    relations = []
    for edge in graph.get("edges", []):
        source = edge.get("source")
        target = edge.get("target")
        if source and target:
            relations.append({
                "source": source,
                "target": target,
                "type": edge.get("type", "co_occurs"),
                "source_count": edge.get("source_count", edge.get("weight", 1)),
            })
    return {"entities": entities, "relations": relations, "version": graph.get("version", 1)}


def entity_type(name):
    lowered = name.lower()
    if lowered in {"gcp", "gke", "cloud sql", "cloud cdn", "cloud run", "bigquery"}:
        return "gcp_service"
    if lowered in {"fastapi", "tailwind", "sqlite", "postgresql", "qdrant", "neo4j", "chromadb"}:
        return "tech_stack"
    if "agent" in lowered or name in {"CloudMart", "Agentic OS"}:
        return "project"
    return "proper_noun"


def extract_entities(text):
    candidates = re.findall(r"\b[A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*){0,3}\b", text)
    entities = []
    for candidate in candidates:
        name = candidate.strip()
        if len(name) < 3 or name in STOP_ENTITIES:
            continue
        entities.append(name)
    return entities


def source_documents():
    docs = []
    for root, pattern, source in [
        (BASE_DIR / "brain", "*.md", "brain"),
        (BASE_DIR / "brain" / "journal", "*.md", "journal"),
        (BASE_DIR / "skills", "SKILL.md", "skill"),
    ]:
        if not root.exists():
            continue
        files = root.rglob(pattern) if source == "skill" else root.glob(pattern)
        for path in files:
            try:
                docs.append({
                    "id": path.parent.name if source == "skill" else path.name,
                    "source": source,
                    "text": path.read_text(encoding="utf-8", errors="ignore"),
                })
            except Exception:
                continue
    return docs


def build_graph():
    entities = {}
    relation_counts = Counter()
    for doc in source_documents():
        names = extract_entities(doc["text"])
        unique_names = list(dict.fromkeys(names))
        for name in unique_names:
            entity = entities.setdefault(name, {"type": entity_type(name), "mentions": []})
            entity["mentions"].append({"source": doc["source"], "content_id": doc["id"]})
        for i, source in enumerate(unique_names[:40]):
            for target in unique_names[i + 1:40]:
                key = tuple(sorted((source, target)))
                relation_counts[key] += 1

    relations = [
        {"source": source, "target": target, "type": "co_occurs", "source_count": count}
        for (source, target), count in relation_counts.items()
    ]
    relations.sort(key=lambda rel: rel["source_count"], reverse=True)
    return {"entities": entities, "relations": relations[:500], "version": 1}


@router.get("/stats")
async def knowledge_graph_stats(user: dict = Depends(get_current_user)):
    graph = load_graph()
    entity_types = Counter(entity.get("type", "unknown") for entity in graph["entities"].values())
    relation_types = Counter(rel.get("type", "co_occurs") for rel in graph["relations"])
    return {
        "total_entities": len(graph["entities"]),
        "total_relations": len(graph["relations"]),
        "entity_types": dict(entity_types),
        "relation_types": dict(relation_types),
    }


@router.post("/search")
async def search_knowledge_graph(data: dict, user: dict = Depends(get_current_user)):
    graph = load_graph()
    query = str(data.get("query", "")).strip().lower()
    center = str(data.get("entity", "")).strip()
    limit = int(data.get("limit", 50))

    if center:
        matched_names = {center}
    elif query:
        matched_names = {
            name for name, entity in graph["entities"].items()
            if query in name.lower() or query in entity.get("type", "").lower()
        }
    else:
        matched_names = set(list(graph["entities"].keys())[:limit])

    related_names = set(matched_names)
    relations = []
    for rel in graph["relations"]:
        if rel["source"] in matched_names or rel["target"] in matched_names or not query and not center:
            relations.append(rel)
            related_names.add(rel["source"])
            related_names.add(rel["target"])
        if len(relations) >= limit:
            break

    entities = [
        {"name": name, **entity}
        for name, entity in graph["entities"].items()
        if name in related_names
    ][:limit]
    return {"entities": entities, "relations": relations[:limit]}


@router.post("/reindex")
async def reindex_knowledge_graph(user: dict = Depends(get_current_user)):
    graph = build_graph()
    save_graph(graph)
    append_audit({
        "action": "knowledge_graph_reindexed",
        "entities": len(graph["entities"]),
        "relations": len(graph["relations"]),
        "user": user.get("user_id") or user.get("api_key"),
    })
    return {"status": "reindexed", "indexed": len(graph["entities"]), "relations": len(graph["relations"])}
