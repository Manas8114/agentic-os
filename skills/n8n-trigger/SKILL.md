---
name: n8n-trigger
description: Trigger an external n8n automation workflow via webhook.
---

# Trigger n8n Workflow

Use this skill when you need to hand off a task to an external n8n workflow, such as:
- Sending mass emails
- Scraping external websites
- Posting to social media

## How to use
1. The user must provide the `N8N_WEBHOOK_URL` in their environment or in the settings.
2. Formulate a JSON payload containing the required data for the automation.
3. Use a python script or `curl` to POST the payload to the webhook URL.

Example payload:
```json
{
  "action": "send_email",
  "subject": "Agentic OS Briefing",
  "body": "...",
  "recipients": ["user@example.com"]
}
```

Wait for a 200 OK response. If it fails, report the error.
