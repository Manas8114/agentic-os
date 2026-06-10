#!/usr/bin/env python3
"""
Shared Agent Foundation — Core Abstraction Layer for All Agents
Extracts Hermes capabilities into reusable components for opencode, Hermes, Gemini, Claude, OpenClaw, Codex, Jarvis, Odysseus
"""

import asyncio
import hashlib
import json
import math
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Set, List, Dict, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field


class AgentType(Enum):
    """Supported agent types in Agentic OS"""
    OPENCODE = "opencode"
    HERMES = "hermes"
    GEMINI = "gemini"
    CLAUDE = "claude"
    OPENCLAW = "openclaw"
    CODEX = "codex"
    JARVIS = "jarvis"
    ODYSSEUS = "odysseus"


@dataclass
class AgentCapabilities:
    """Standardized capability definitions"""
    memory: bool = False
    scheduling: bool = False
    channels: bool = False
    skills: bool = False
    voice: bool = False
    browser: bool = False
    subagents: bool = False
    web_search: bool = False
    multimodal: bool = False
    code_generation: bool = False
    file_operations: bool = False
    git_management: bool = False
    infrastructure: bool = False
    reasoning: bool = False
    planning: bool = False


# Default capability profiles per agent type
AGENT_CAPABILITY_PROFILES: Dict[AgentType, AgentCapabilities] = {
    AgentType.OPENCODE: AgentCapabilities(
        code_generation=True, file_operations=True, git_management=True,
        infrastructure=True, skills=True
    ),
    AgentType.HERMES: AgentCapabilities(
        memory=True, scheduling=True, channels=True, skills=True,
        voice=True, browser=True, subagents=True
    ),
    AgentType.GEMINI: AgentCapabilities(
        web_search=True, multimodal=True, skills=True, reasoning=True
    ),
    AgentType.CLAUDE: AgentCapabilities(
        reasoning=True, planning=True, skills=True
    ),
    AgentType.OPENCLAW: AgentCapabilities(
        code_generation=True, file_operations=True, skills=True, reasoning=True
    ),
    AgentType.CODEX: AgentCapabilities(
        code_generation=True, file_operations=True, git_management=True, skills=True
    ),
    AgentType.JARVIS: AgentCapabilities(
        voice=True, scheduling=True, channels=True, skills=True, memory=True
    ),
    AgentType.ODYSSEUS: AgentCapabilities(
        planning=True, reasoning=True, skills=True, memory=True, web_search=True
    ),
}


@dataclass
class AgentConfig:
    """Standardized agent configuration"""
    name: str
    agent_type: AgentType
    system_prompt: str
    model: str
    max_turns: int = 50
    auto_approve: bool = False
    temperature: float = 0.7
    max_tokens: int = 8192
    allowed_tools: List[str] = field(default_factory=list)
    capabilities: AgentCapabilities = field(default_factory=AgentCapabilities)
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class SharedMemoryLayer:
    """
    Shared Memory Layer - Abstracts all memory operations
    Provides: Vector DB, Knowledge Graph, Journal, Brain files
    """
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.brain_dir = base_dir / "brain"
        self.journal_dir = base_dir / "brain" / "journal"
        self.vector_db_file = base_dir / "data" / "vector-memory.json"
        self.kg_file = base_dir / "data" / "knowledge-graph.json"
        
    def load_brain_file(self, filename: str) -> str:
        """Load a brain markdown file"""
        path = self.brain_dir / filename
        if path.exists():
            return path.read_text()
        return ""
    
    def save_brain_file(self, filename: str, content: str, commit: bool = False) -> bool:
        """Save a brain markdown file"""
        path = self.brain_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return True
    
    def list_brain_files(self) -> List[str]:
        """List all brain files"""
        if self.brain_dir.exists():
            return [f.name for f in self.brain_dir.glob("*.md")]
        return []
    
    def load_journal_entry(self, date: str) -> Dict[str, Any]:
        """Load a journal entry by date"""
        path = self.journal_dir / f"{date}.md"
        if path.exists():
            content = path.read_text()
            return {"date": date, "content": content, "preview": content[:200]}
        return {"date": date, "content": "", "preview": ""}
    
    def save_journal_entry(self, date: str, content: str) -> bool:
        """Save a journal entry"""
        path = self.journal_dir / f"{date}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return True
    
    def list_journal_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent journal entries"""
        if not self.journal_dir.exists():
            return []
        entries = []
        for f in sorted(self.journal_dir.glob("*.md"), reverse=True)[:limit]:
            content = f.read_text()
            entries.append({"date": f.stem, "preview": content[:200], "content": content})
        return entries
    
    def search_journal(self, query: str) -> List[Dict[str, Any]]:
        """Search journal entries by query"""
        query_lower = query.lower()
        results = []
        for f in self.journal_dir.glob("*.md"):
            content = f.read_text()
            if query_lower in content.lower():
                results.append({
                    "date": f.stem,
                    "preview": content[:200],
                    "content": content
                })
        return results
    
    # Vector DB operations
    def load_vector_db(self) -> Dict:
        if self.vector_db_file.exists():
            try:
                return json.loads(self.vector_db_file.read_text())
            except:
                pass
        return {"vectors": [], "metadata": [], "version": 1}
    
    def save_vector_db(self, data: Dict):
        self.vector_db_file.parent.mkdir(parents=True, exist_ok=True)
        self.vector_db_file.write_text(json.dumps(data, indent=2))
    
    async def index_content(self, source: str, content_id: str, text: str, metadata: Dict = None):
        """Index content into vector DB"""
        from server import generate_embedding, hash_to_vector
        embedding = await generate_embedding(text)
        
        vector_db = self.load_vector_db()
        
        existing_idx = None
        for i, meta in enumerate(vector_db["metadata"]):
            if meta.get("source") == source and meta.get("content_id") == content_id:
                existing_idx = i
                break
        
        entry = {
            "source": source,
            "content_id": content_id,
            "text": text[:500],
            "embedding": embedding,
            "metadata": metadata or {},
            "indexed_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if existing_idx is not None:
            vector_db["vectors"][existing_idx] = embedding
            vector_db["metadata"][existing_idx] = entry
        else:
            vector_db["vectors"].append(embedding)
            vector_db["metadata"].append(entry)
        
        self.save_vector_db(vector_db)
    
    async def semantic_search(self, query: str, top_k: int = 10, min_score: float = 0.3) -> List[Dict]:
        """Search vector DB for similar content"""
        from server import generate_embedding, cosine_similarity
        query_embedding = await generate_embedding(query)
        
        vector_db = self.load_vector_db()
        if not vector_db["vectors"]:
            return []
        
        results = []
        for i, (embedding, metadata) in enumerate(zip(vector_db["vectors"], vector_db["metadata"])):
            score = cosine_similarity(query_embedding, embedding)
            if score >= min_score:
                results.append({
                    "score": round(score, 4),
                    "source": metadata.get("source"),
                    "content_id": metadata.get("content_id"),
                    "text_preview": metadata.get("text", "")[:200],
                    "metadata": metadata.get("metadata", {}),
                    "indexed_at": metadata.get("indexed_at"),
                })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
    
    async def reindex_all(self) -> int:
        """Re-index all memory sources"""
        indexed = 0
        # This would re-index brain, journal, skills, audit
        return indexed


class SharedSkillsLayer:
    """
    Shared Skills Layer - Abstracts skill management
    Provides: Skill discovery, execution, analytics, eval
    """
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.skills_dir = base_dir / "skills"
    
    def list_skills(self) -> List[Dict]:
        """List all available skills"""
        skills = []
        if self.skills_dir.exists():
            for d in self.skills_dir.iterdir():
                if d.is_dir() and not d.name.startswith("_"):
                    skill_md = d / "SKILL.md"
                    if skill_md.exists():
                        skills.append(self._parse_skill(d, skill_md))
        return skills
    
    def _parse_skill(self, skill_dir: Path, skill_md: Path) -> Dict:
        """Parse skill from directory"""
        content = skill_md.read_text()
        # Parse frontmatter and content
        skill = {
            "name": skill_dir.name,
            "path": str(skill_dir),
            "description": "",
            "version": "1.0.0",
            "author": "Agentic OS",
            "category": "general",
            "primary_agent": "opencode",
            "tags": [],
            "has_learnings": False,
            "eval_criteria": [],
            "scores": [],
        }
        
        # Parse frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                import yaml
                try:
                    fm = yaml.safe_load(parts[1])
                    skill.update(fm)
                except:
                    pass
        
        # Check for learnings, eval
        learnings = skill_dir / "learnings.md"
        skill["has_learnings"] = learnings.exists()
        
        eval_file = skill_dir / "eval.json"
        if eval_file.exists():
            try:
                skill["eval_criteria"] = json.loads(eval_file.read_text())
            except:
                pass
        
        score_history = skill_dir / "score-history.json"
        if score_history.exists():
            try:
                skill["scores"] = json.loads(score_history.read_text())
            except:
                pass
        
        return skill
    
    def get_skill(self, name: str) -> Optional[Dict]:
        """Get a specific skill by name"""
        skills = self.list_skills()
        for s in skills:
            if s["name"] == name:
                return s
        return None
    
    def get_skill_learnings(self, name: str) -> str:
        """Get skill learnings"""
        learnings_file = self.skills_dir / name / "learnings.md"
        if learnings_file.exists():
            return learnings_file.read_text()
        return ""
    
    def get_skill_eval(self, name: str) -> Dict:
        """Get skill evaluation data"""
        eval_file = self.skills_dir / name / "eval.json"
        score_file = self.skills_dir / name / "score-history.json"
        result = {"criteria": [], "scores": []}
        if eval_file.exists():
            try:
                result["criteria"] = json.loads(eval_file.read_text())
            except:
                pass
        if score_file.exists():
            try:
                result["scores"] = json.loads(score_file.read_text())
            except:
                pass
        return result
    
    async def execute_skill(self, name: str, input_data: str = "", agent: str = "auto") -> Dict:
        """Execute a skill via the agent"""
        skill = self.get_skill(name)
        if not skill:
            return {"error": f"Skill not found: {name}", "status": "failed"}
        
        # Build prompt
        skill_md = (self.skills_dir / name / "SKILL.md").read_text()
        learnings = self.get_skill_learnings(name)
        
        prompt = f"Execute the '{name}' skill.\n\n"
        prompt += f"## Skill Instructions\n{skill_md}\n\n"
        if learnings and learnings.strip():
            prompt += f"## Past Learnings\n{learnings}\n\n"
        if input_data:
            prompt += f"## Input\n{input_data}\n\n"
        
        # Import here to avoid circular dependency
        from server import execute_agent, get_skill_agent, load_routing_rules
        
        if agent == "auto":
            routing_rules = load_routing_rules()
            agent = get_skill_agent(name, routing_rules)
        
        try:
            response = await execute_agent(agent, prompt)
            return {
                "status": "completed",
                "agent": agent,
                "output": response,
                "skill": name,
            }
        except Exception as e:
            return {"status": "failed", "error": str(e), "skill": name}


class SharedToolsLayer:
    """
    Shared Tools Layer - Abstracts tool execution
    Provides: Tool registration, execution, logging, analytics
    """
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.tools: Dict[str, Callable] = {}
        self.tool_logs: List[Dict] = []
    
    def register_tool(self, name: str, func: Callable, description: str = "", 
                      parameters: Dict = None, permissions: List[str] = None):
        """Register a tool"""
        self.tools[name] = {
            "function": func,
            "description": description,
            "parameters": parameters or {},
            "permissions": permissions or [],
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }
    
    def get_tool(self, name: str) -> Optional[Dict]:
        """Get a tool by name"""
        return self.tools.get(name)
    
    def list_tools(self) -> List[Dict]:
        """List all registered tools"""
        return [
            {
                "name": name,
                "description": info["description"],
                "parameters": info["parameters"],
                "permissions": info["permissions"],
            }
            for name, info in self.tools.items()
        ]
    
    async def execute_tool(self, name: str, params: Dict = None, 
                          agent: str = "system", context: Dict = None) -> Any:
        """Execute a tool"""
        tool = self.tools.get(name)
        if not tool:
            raise ValueError(f"Tool not found: {name}")
        
        start_time = time.time()
        try:
            # Call the function
            if asyncio.iscoroutinefunction(tool["function"]):
                result = await tool["function"](**(params or {}))
            else:
                result = tool["function"](**(params or {}))
            
            # Log execution
            self.tool_logs.append({
                "tool": name,
                "agent": agent,
                "params": params,
                "result": str(result)[:500],
                "duration_ms": int((time.time() - start_time) * 1000),
                "success": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            return result
        except Exception as e:
            self.tool_logs.append({
                "tool": name,
                "agent": agent,
                "params": params,
                "error": str(e),
                "duration_ms": int((time.time() - start_time) * 1000),
                "success": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            raise
    
    def get_tool_analytics(self, tool_name: str = None) -> Dict:
        """Get tool execution analytics"""
        logs = self.tool_logs
        if tool_name:
            logs = [l for l in logs if l["tool"] == tool_name]
        
        total = len(logs)
        successful = len([l for l in logs if l.get("success", False)])
        
        return {
            "tool": tool_name or "all",
            "total_executions": total,
            "successful": successful,
            "success_rate": successful / total if total > 0 else 0,
            "avg_duration_ms": sum(l.get("duration_ms", 0) for l in logs) / total if total > 0 else 0,
        }


class SharedContextLayer:
    """
    Shared Context Layer - Abstracts context management
    Provides: Context injection, budgets, trimming, validation
    """
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.memory_layer = SharedMemoryLayer(base_dir)
        self.skills_layer = SharedSkillsLayer(base_dir)
        self.default_budget = 8000  # tokens
    
    async def inject_context(self, task: str, agent: str = "auto", 
                            max_items: int = 10, include_sources: List[str] = None) -> Dict:
        """
        Inject relevant context for a task
        Sources: semantic, kg, skills, journal, brain, screen
        """
        sources = include_sources or ["semantic", "kg", "skills", "journal", "brain"]
        
        results = {
            "semantic_matches": [],
            "knowledge_graph": {"entities": [], "relations": []},
            "recent_skills": [],
            "recent_journal": [],
            "business_brain": "",
            "active_projects": "",
            "screen_activity": {},
            "injected_context": "",
        }
        
        # 1. Semantic search
        if "semantic" in sources:
            try:
                results["semantic_matches"] = await self.memory_layer.semantic_search(
                    task, top_k=max_items, min_score=0.25
                )
            except Exception as e:
                print(f"Semantic search error: {e}")
        
        # 2. Knowledge graph
        if "kg" in sources:
            try:
                kg_results = await self._search_knowledge_graph(task)
                results["knowledge_graph"]["entities"] = kg_results.get("entities", [])[:10]
                results["knowledge_graph"]["relations"] = kg_results.get("relations", [])[:15]
            except Exception as e:
                print(f"Knowledge graph search error: {e}")
        
        # 3. Brain files
        if "brain" in sources:
            try:
                brain_dir = self.base_dir / "brain"
                if (brain_dir / "business-brain.md").exists():
                    results["business_brain"] = (brain_dir / "business-brain.md").read_text()[:2000]
                if (brain_dir / "active-projects.md").exists():
                    results["active_projects"] = (brain_dir / "active-projects.md").read_text()[:2000]
            except Exception as e:
                print(f"Brain files error: {e}")
        
        # 4. Recent journal
        if "journal" in sources:
            try:
                recent_journal = self.memory_layer.list_journal_entries(5)
                results["recent_journal"] = recent_journal
            except Exception as e:
                print(f"Recent journal error: {e}")
        
        # 5. Recent skills
        if "skills" in sources:
            try:
                from server import load_agent_performance
                perf_data = load_agent_performance()
                for agent_name, data in perf_data.items():
                    if data.get("history"):
                        recent = data["history"][-5:]
                        for run in recent:
                            results["recent_skills"].append({
                                "agent": agent_name,
                                "skill": run.get("skill"),
                                "timestamp": run.get("timestamp"),
                                "success": run.get("success"),
                            })
            except Exception as e:
                print(f"Recent skills error: {e}")
        
        # Build injected context string
        context_parts = []
        
        if results["business_brain"]:
            context_parts.append(f"## Business Context\n{results['business_brain'][:1500]}")
        
        if results["active_projects"]:
            context_parts.append(f"## Active Projects\n{results['active_projects'][:1000]}")
        
        if results["semantic_matches"]:
            context_parts.append("## Relevant Memory (Semantic Search)")
            for match in results["semantic_matches"][:5]:
                context_parts.append(f"- [{match['source']}] {match['text_preview'][:200]} (score: {match['score']})")
        
        if results["knowledge_graph"]["entities"]:
            context_parts.append("## Related Entities (Knowledge Graph)")
            for entity in results["knowledge_graph"]["entities"][:8]:
                context_parts.append(f"- {entity['name']} ({entity['type']}): {len(entity.get('mentions', []))} mentions")
        
        if results["recent_skills"]:
            context_parts.append("## Recent Skill Activity")
            for run in results["recent_skills"][-5:]:
                status = "✓" if run.get("success") else "✗"
                context_parts.append(f"- {status} {run.get('agent')}: {run.get('skill')} ({run.get('timestamp', '')[:19]})")
        
        if results["recent_journal"]:
            context_parts.append("## Recent Journal")
            for entry in results["recent_journal"][-3:]:
                preview = entry.get("preview", "")[:150] if isinstance(entry, dict) else str(entry)[:150]
                context_parts.append(f"- {entry.get('date', '')}: {preview}")
        
        results["injected_context"] = "\n\n".join(context_parts)
        return results
    
    async def _search_knowledge_graph(self, query: str) -> Dict:
        """Search knowledge graph for entities"""
        kg_file = self.base_dir / "data" / "knowledge-graph.json"
        if not kg_file.exists():
            return {"entities": [], "relations": []}
        
        try:
            kg = json.loads(kg_file.read_text())
            query_lower = query.lower()
            matched_entities = []
            
            for name, entity in kg["entities"].items():
                if query_lower in name.lower() or query_lower in entity.get("type", "").lower():
                    matched_entities.append({"name": name, **entity})
            
            matched_names = {e["name"] for e in matched_entities}
            relations = []
            for rel in kg["relations"]:
                if rel["source"] in matched_names or rel["target"] in matched_names:
                    relations.append(rel)
            
            return {
                "entities": matched_entities[:20],
                "relations": relations[:30],
            }
        except Exception as e:
            print(f"Knowledge graph search error: {e}")
            return {"entities": [], "relations": []}


class SharedAgentCore:
    """
    Shared Agent Core - Main abstraction for all agents
    Combines Memory, Skills, Tools, Context layers
    """
    
    def __init__(self, base_dir: Path, agent_config: AgentConfig):
        self.base_dir = base_dir
        self.agent_config = agent_config
        self.agent_type = agent_config.agent_type
        
        # Initialize shared layers
        self.memory = SharedMemoryLayer(base_dir)
        self.skills = SharedSkillsLayer(base_dir)
        self.tools = SharedToolsLayer(base_dir)
        self.context = SharedContextLayer(base_dir)
        
        # Register default tools
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Register default tools available to all agents"""
        self.tools.register_tool(
            "read_brain_file",
            lambda filename: self.memory.load_brain_file(filename),
            "Read a brain markdown file",
            {"filename": {"type": "string"}},
        )
        
        self.tools.register_tool(
            "save_brain_file",
            lambda filename, content: self.memory.save_brain_file(filename, content),
            "Save a brain markdown file",
            {"filename": {"type": "string"}, "content": {"type": "string"}},
        )
        
        self.tools.register_tool(
            "load_journal",
            lambda date: self.memory.load_journal_entry(date),
            "Load a journal entry by date",
            {"date": {"type": "string"}},
        )
        
        self.tools.register_tool(
            "save_journal",
            lambda date, content: self.memory.save_journal_entry(date, content),
            "Save a journal entry",
            {"date": {"type": "string"}, "content": {"type": "string"}},
        )
        
        self.tools.register_tool(
            "semantic_search",
            lambda query, top_k=10: self.memory.semantic_search(query, top_k),
            "Search memory semantically",
            {"query": {"type": "string"}, "top_k": {"type": "integer", "default": 10}},
        )
        
        self.tools.register_tool(
            "execute_skill",
            lambda name, input_data="": self.skills.execute_skill(name, input_data),
            "Execute a skill by name",
            {"name": {"type": "string"}, "input_data": {"type": "string", "default": ""}},
        )
        
        self.tools.register_tool(
            "inject_context",
            lambda task, agent="auto", max_items=10: self.context.inject_context(task, agent, max_items),
            "Inject relevant context for a task",
            {"task": {"type": "string"}, "agent": {"type": "string", "default": "auto"}, 
             "max_items": {"type": "integer", "default": 10}},
        )
    
    async def execute_skill(self, name: str, input_data: str = "", agent: str = "auto") -> Dict:
        """Execute a skill using this agent's capabilities"""
        return await self.skills.execute_skill(name, input_data, agent)
    
    async def chat(self, message: str, context: Dict = None) -> str:
        """Process a chat message with optional context injection"""
        # Import execute_agent from server to maintain compatibility
        from server import execute_agent
        
        # Inject context if not provided
        if context is None:
            context_result = await self.context.inject_context(message, self.agent_type.value)
            injected = context_result.get("injected_context", "")
            if injected:
                message = f"{injected}\n\n---\n\n{message}"
        
        return await execute_agent(self.agent_type.value, message)
    
    def get_capabilities(self) -> AgentCapabilities:
        """Get this agent's capabilities"""
        return self.agent_config.capabilities
    
    def to_dict(self) -> Dict:
        """Serialize agent core config"""
        return {
            "name": self.agent_config.name,
            "type": self.agent_type.value,
            "model": self.agent_config.model,
            "max_turns": self.agent_config.max_turns,
            "auto_approve": self.agent_config.auto_approve,
            "temperature": self.agent_config.temperature,
            "max_tokens": self.agent_config.max_tokens,
            "allowed_tools": self.agent_config.allowed_tools,
            "capabilities": self.agent_config.capabilities.__dict__,
            "enabled": self.agent_config.enabled,
            "tools": list(self.tools.tools.keys()),
        }


# Factory function to create agent cores
def create_agent_core(base_dir: Path, agent_type: AgentType, 
                     custom_config: Dict = None) -> SharedAgentCore:
    """Factory to create agent cores with standard configs"""
    
    default_configs = {
        AgentType.OPENCODE: AgentConfig(
            name="opencode",
            agent_type=AgentType.OPENCODE,
            system_prompt="You are the code generation and DevOps specialist within Agentic OS. Handle: code generation, file operations, git management, infrastructure-as-code, testing, debugging.",
            model="test-model",
            max_turns=50,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.OPENCODE],
        ),
        AgentType.HERMES: AgentConfig(
            name="hermes",
            agent_type=AgentType.HERMES,
            system_prompt="You are the memory and scheduling specialist within Agentic OS. Handle: persistent memory (SQLite FTS5), cron scheduling, Telegram/Discord/email channels, skill hub, voice mode, browser automation, subagent delegation.",
            model="openrouter/owl-alpha",
            max_turns=50,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.HERMES],
        ),
        AgentType.GEMINI: AgentConfig(
            name="gemini",
            agent_type=AgentType.GEMINI,
            system_prompt="You are the research and analysis specialist within Agentic OS. Handle: web search, multi-modal analysis (images/PDFs), data analysis, document understanding, competitive analysis, learning/research.",
            model="gemini-2.5-flash",
            max_turns=50,
            auto_approve=False,
            temperature=0.7,
            max_tokens=8192,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.GEMINI],
        ),
        AgentType.CLAUDE: AgentConfig(
            name="claude",
            agent_type=AgentType.CLAUDE,
            system_prompt="You are the strategic reasoning specialist within Agentic OS. Handle: complex analysis, architectural decisions, planning, code review, high-level problem solving.",
            model="claude-3-5-sonnet-20241022",
            max_turns=50,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "WebSearch"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.CLAUDE],
        ),
        AgentType.OPENCLAW: AgentConfig(
            name="openclaw",
            agent_type=AgentType.OPENCLAW,
            system_prompt="You are the autonomous coding specialist. Handle: code generation, file operations, autonomous task execution, multi-file editing.",
            model="openrouter/auto",
            max_turns=100,
            auto_approve=True,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.OPENCLAW],
        ),
        AgentType.CODEX: AgentConfig(
            name="codex",
            agent_type=AgentType.CODEX,
            system_prompt="You are the OpenAI Codex specialist. Handle: code generation, file operations, git management, testing, CI/CD.",
            model="gpt-4o",
            max_turns=50,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.CODEX],
        ),
        AgentType.JARVIS: AgentConfig(
            name="jarvis",
            agent_type=AgentType.JARVIS,
            system_prompt="You are the voice-first personal assistant. Handle: voice commands, scheduling, task management, notifications, daily briefings.",
            model="openrouter/owl-alpha",
            max_turns=30,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.JARVIS],
        ),
        AgentType.ODYSSEUS: AgentConfig(
            name="odysseus",
            agent_type=AgentType.ODYSSEUS,
            system_prompt="You are the autonomous planning and research agent. Handle: multi-step planning, deep research, knowledge synthesis, goal decomposition.",
            model="openrouter/auto",
            max_turns=200,
            auto_approve=False,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "WebSearch"],
            capabilities=AGENT_CAPABILITY_PROFILES[AgentType.ODYSSEUS],
        ),
    }
    
    config = default_configs.get(agent_type)
    if not config:
        raise ValueError(f"Unknown agent type: {agent_type}")
    
    # Apply custom overrides
    if custom_config:
        for key, value in custom_config.items():
            if hasattr(config, key):
                setattr(config, key, value)
    
    return SharedAgentCore(base_dir, config)


# Global agent registry
class AgentRegistry:
    """Registry for managing all agent cores"""
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.agents: Dict[str, SharedAgentCore] = {}
        self._load_all_agents()
    
    def _load_all_agents(self):
        """Load all available agent cores"""
        for agent_type in AgentType:
            try:
                core = create_agent_core(self.base_dir, agent_type)
                self.agents[agent_type.value] = core
            except Exception as e:
                print(f"Failed to load agent {agent_type.value}: {e}")
    
    def get_agent(self, agent_type: str) -> Optional[SharedAgentCore]:
        """Get an agent core by type"""
        return self.agents.get(agent_type)
    
    def list_agents(self) -> List[Dict]:
        """List all registered agents with their configs"""
        return [core.to_dict() for core in self.agents.values()]
    
    def get_agent_for_task(self, task: str) -> SharedAgentCore:
        """Determine best agent for a task based on capabilities"""
        # Use routing rules from server
        from server import load_routing_rules, get_skill_agent
        
        routing_rules = load_routing_rules()
        agent_name = get_skill_agent(task, routing_rules)
        return self.get_agent(agent_name)


# Legacy compatibility functions
async def execute_agent_shared(agent: str, message: str, base_dir: Path = None) -> str:
    """Execute agent using shared core (legacy compatibility)"""
    if base_dir is None:
        base_dir = Path(__file__).parent
    
    registry = AgentRegistry(base_dir)
    core = registry.get_agent(agent)
    if core:
        return await core.chat(message)
    
    # Fallback to original server.execute_agent
    from server import execute_agent as original_execute
    return await original_execute(agent, message)


# Export for backward compatibility
__all__ = [
    "AgentType",
    "AgentCapabilities",
    "AgentConfig",
    "SharedMemoryLayer",
    "SharedSkillsLayer",
    "SharedToolsLayer",
    "SharedContextLayer",
    "SharedAgentCore",
    "AgentRegistry",
    "create_agent_core",
    "AGENT_CAPABILITY_PROFILES",
    "execute_agent_shared",
]