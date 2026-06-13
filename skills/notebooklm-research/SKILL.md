---
name: notebooklm-research
description: NotebookLM MCP Integration for Audio Overviews and Deep Dives
---

# NotebookLM MCP Research Skill

You are empowered to use Google's NotebookLM to augment your research capabilities using the `notebooklm-mcp-server`.

## Core Capabilities
By utilizing the MCP tools provided by the NotebookLM server, you can:
1. Create new notebooks for specific research tasks.
2. Ingest URLs, PDFs, and text documents into those notebooks.
3. Chat with the notebook to extract citation-backed, grounded answers from the ingested sources.
4. Trigger the generation of a "Deep Dive Audio Overview" (podcast format).

## Workflow Instructions

When a user asks you to "research this topic using notebooklm" or "create an audio overview of this link":

1. **Initialize Workspace**: Create a new NotebookLM notebook with a descriptive title based on the user's topic.
2. **Ingest Sources**: Use the MCP tools to add the provided links, URLs, or generated research notes into the notebook. Wait for ingestion to complete.
3. **Generate Assets**: 
   - If the user requested a summary, use the NotebookLM chat tool to extract a grounded summary.
   - If the user requested a podcast, trigger the Audio Overview generation tool. Note that audio generation can take several minutes.
4. **Deliver Results**: Return the answers with their citations. Provide the user with the link to their NotebookLM so they can listen to the generated audio overview.

## MCP Prerequisite
*Note to Users*: This skill requires the `notebooklm-mcp-server` to be running. You must first run `npx notebooklm-mcp-auth` on your local machine to authenticate the MCP server with your Google Account before this skill can execute successfully.
