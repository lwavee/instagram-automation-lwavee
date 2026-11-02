# Learn With Avee — AI-Powered Instagram Automation & Content Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/atlas)
[![n8n](https://img.shields.io/badge/Automation-n8n_Community-red.svg)](https://n8n.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Learn With Avee** is a production-grade, full-stack AI Instagram content lifecycle platform built from scratch. It discovers trending AI and technology updates, crafts high-retention Hindi/Hinglish Reel scripts, schedules posts in Asia/Kolkata timezone, coordinates n8n automation workflows, and publishes officially to Instagram using the Meta Graph API v21.0.

---

## ⚡ Key Highlights & Safety Architecture

- **Human-in-the-Loop Guardrail**: Auto-publishing is **strictly disabled by default**. Content is never automatically published to Instagram without explicit user authorization in Settings.
- **Dual-Database Architecture**:
  - **MongoDB Atlas** with Mongoose is the primary application database for user accounts, scripts, posts, media assets, and research.
  - **PostgreSQL** is used exclusively for persistent internal storage of n8n Community Edition.
- **Provider-Independent AI Studio**: Supports **Google Gemini**, **OpenAI**, and **OpenRouter** with server-side **AES-256-GCM authenticated encryption** for API keys.
- **Viral Hinglish/Hindi Script Engine**: Generates 2-second thumb-stopping hooks, scene-by-scene visual and voiceover breakdowns, on-screen text highlights, captions, hashtags, and CTAs tailored for Indian tech enthusiasts.
- **Official Meta Graph API v21.0**: Clean 2-step async container creation (`/media` -> `/media_publish`) for Instagram Reels and photos. No scraping or unofficial login bots.

---

## 📐 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15+, React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose ODM, Zod, JWT, Helmet, CORS, Rate-Limiting |
| **Database** | MongoDB Atlas (App Database) & PostgreSQL (n8n internal persistence) |
| **Automation** | n8n Community Edition (Docker), HMAC Webhook Authentication, Scheduled Jobs |
| **Hosting** | Vercel (Frontend), Render (Backend Web Service), Render (n8n Docker Service) |

---

## 🧭 Dashboard Views & Navigation

1. **Overview (`/`)**: Live KPI metrics, 7-day audience reach & impressions growth chart, upcoming scheduled posts, recent automation executions, and safety protocol status.
2. **Content Research (`/research`)**: Discover verified trending tech news, manage custom keywords, track source URLs, and generate 45s Reel concepts without hallucinations.
3. **AI Script Generator (`/scripts`)**: Interactive scriptwriting studio with 2s hooks, scene-by-scene audio/visual cards, caption/CTA formatter, and status workflow (draft, approve, reject).
4. **Content Calendar (`/calendar`)**: Interactive monthly and weekly schedule in `Asia/Kolkata` timezone with drag-and-drop reschedule modal and duplicate publishing locks.
5. **Media Library (`/media`)**: Video/image/audio asset manager with storage provider abstraction (Local, Cloudinary, Supabase), size inspection, and path traversal protection.
6. **Reel Manager (`/reels`)**: Dedicated 9:16 vertical Reel assembly simulator synchronizing approved scripts, audio narration, and video assets.
7. **Instagram Publishing (`/publishing`)**: Meta Graph API publishing queue, container status polling, publishing logs inspector, and manual approval gate.
8. **Automation Workflows (`/automation`)**: Visual control center for all 6 n8n workflows with on-demand trigger buttons, execution history, and error diagnostics.
9. **Analytics & Insights (`/analytics`)**: Reach, impressions, engagement rate, saves, shares, and audience growth charts across 7d, 30d, and 90d filters.
10. **Platform Settings (`/settings`)**: Critical Auto-Publishing authorization toggle, brand defaults (Hinglish/Hindi, IST), notifications center, and system activity audit log.
11. **API Integrations (`/integrations`)**: Encrypted API key management for Google Gemini, OpenAI, OpenRouter, Meta App credentials, and connection testing.

---

## 🔄 n8n Automation Workflows

All workflows are exportable and located in [`n8n/workflows/`](./n8n/workflows/):

- **Workflow A — Daily Content Research**: Runs daily at 08:00 AM IST to discover verified AI updates.
- **Workflow B — AI Script Generation**: Generates viral Hindi/Hinglish scripts on demand.
- **Workflow C — Content Approval Gate**: Human-in-the-loop gate notifying dashboard and pausing workflow.
- **Workflow D — Content Publishing**: Runs every 15 minutes to verify due posts, lock records, and call Meta Graph API.
- **Workflow E — Analytics Synchronization**: Syncs daily impressions and reach at 11:55 PM IST.
- **Workflow F — Error Monitoring**: Catches node errors, logs error details, and alerts the user.

---

## 🚀 Quick Start Guide (Local Development)

### 1. Prerequisites
- Node.js 18+ (tested on Node 22 & 24)
- npm or pnpm
- MongoDB running locally or MongoDB Atlas connection URI

### 2. Clone and Configure
```bash
git clone https://github.com/lwavee/instagram-automation-lwavee.git
cd instagram-automation-lwavee
```

Copy the environment template:
```bash
cp .env.example backend/.env
```
Fill in `MONGODB_URI`, `JWT_SECRET`, and `APP_ENCRYPTION_KEY` in `backend/.env`.

### 3. Install Dependencies & Build
```bash
# Install backend dependencies
cd backend && npm install && npm run build

# Install frontend dependencies
cd ../frontend && npm install && npm run build
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API (port 5000)
cd backend && npm run dev

# Terminal 2: Frontend Dashboard (port 3000)
cd frontend && npm run dev
```

Open your browser at `http://localhost:3000`.

### 5. Run Tests
```bash
cd backend && npm test
```

---

## 🌐 Production Deployment

- **Frontend on Vercel**: Connect repository, set root directory to `frontend`, add `NEXT_PUBLIC_BACKEND_URL`.
- **Backend on Render**: Deploy `backend` as a Node Web Service referencing `render.yaml`.
- **n8n on Render**: Deploy `n8n/Dockerfile` as a Docker Web Service linked to Render PostgreSQL.
- Detailed step-by-step instructions are available in [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md).
- Meta Developer setup instructions are in [`docs/META_INSTAGRAM_API_GUIDE.md`](./docs/META_INSTAGRAM_API_GUIDE.md).

---

## 🔒 Security & OWASP Compliance

1. **AES-256-GCM Encryption**: Third-party API keys and Instagram access tokens are encrypted server-side with an initialization vector (IV) and authentication tag.
2. **Path Traversal Protection**: Uploaded filenames are sanitized using `path.basename()` with strict destination boundary checks.
3. **Rate Limiting**: Brute-force protection on authentication endpoints (15 req / 15 min) and API routes (200 req / 15 min).
4. **Secure Cookies & Headers**: `HttpOnly`, `SameSite=Lax`, Helmet CSP, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
5. **No Credential Logging**: Sensitive passwords, tokens, and authorization headers are stripped from logs and JSON output.

---

## 📄 License
This project is open-source under the [MIT License](./package.json).

