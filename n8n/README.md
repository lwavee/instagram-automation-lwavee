# n8n Automation Engine for Learn With Avee

This directory contains the production-ready n8n Community Edition automation workflows and deployment configuration for **Learn With Avee**.

## Architectural Principles & Distinction
- **Primary Database**: MongoDB Atlas is the application database where scripts, research, social posts, and users are stored.
- **n8n Internal Database**: n8n **requires** PostgreSQL or SQLite for its internal workflow execution storage and credentials.
  - **Do NOT attempt to configure MongoDB as n8n's internal database.**
  - For persistent hosting on Render or Docker, use the included PostgreSQL setup (`n8n/docker-compose.yml` or Render PostgreSQL).

---

## Included Workflows

| File | Name | Schedule / Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| `workflows/workflow-a-daily-content-research.json` | **Workflow A — Daily Research** | Daily @ 08:00 AM IST | Discovers trending AI & tech topics, extracts articles, and saves them to MongoDB via backend API. |
| `workflows/workflow-b-ai-script-generation.json` | **Workflow B — Script Generation** | Webhook / On Demand | Takes approved topics and generates high-retention Hindi/Hinglish Reel scripts with 2s hooks, scenes, voiceovers, captions, and CTAs. |
| `workflows/workflow-c-content-approval.json` | **Workflow C — Content Approval** | Webhook | Human-in-the-loop gate: notifies the dashboard and pauses workflow until user approves. |
| `workflows/workflow-d-content-publishing.json` | **Workflow D — Content Publishing** | Every 15 minutes | Checks scheduled posts due for publishing, verifies account credentials, and triggers official Instagram Graph API. |
| `workflows/workflow-e-analytics.json` | **Workflow E — Analytics Sync** | Daily @ 23:55 PM IST | Pulls Instagram insights (reach, impressions, follower growth) and updates analytics snapshots. |
| `workflows/workflow-f-error-monitoring.json` | **Workflow F — Error Monitoring** | On Workflow Error | Detects failed workflow nodes, logs error code to backend, and triggers alert notifications. |

---

## Deployment Options

### Option 1: Render Web Service (Cloud)
In your Render dashboard or using `render.yaml`:
1. Deploy `learn-with-avee-n8n-db` (Render Managed PostgreSQL database).
2. Deploy `learn-with-avee-n8n` as a Docker Web Service referencing `n8n/Dockerfile`.
3. Provide environment variables:
   - `DB_TYPE=postgresdb`
   - `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD` (linked automatically by Render)
   - `BACKEND_API_URL=https://<your-backend-service>.onrender.com`
   - `N8N_WEBHOOK_SECRET=<your-shared-secret>`
   - `GENERIC_TIMEZONE=Asia/Kolkata`
   - `N8N_ENCRYPTION_KEY=<random-32-char-string>`

### Option 2: Docker Compose (Local / VPS)
```bash
cd n8n
docker compose up -d
```
Access the n8n UI at `http://localhost:5678`.

---

## How to Import Workflows into n8n
1. Log into your n8n dashboard (`http://localhost:5678`).
2. Go to **Workflows** -> click **Add Workflow** -> click the **...** (Options menu) -> **Import from File**.
3. Select any `.json` file from `n8n/workflows/`.
4. Review node settings and click **Activate** (toggle in upper right corner).

