# Learn With Avee — Implementation Tasks

## Phase 1: Repository Initialization & Architecture Setup
- [x] Inspect existing workspace and verify clean baseline
- [x] Initialize Root `package.json`, `.gitignore`, `.env.example`, `render.yaml`, `vercel.json`
- [x] Initialize `backend/` with TypeScript, Express, Mongoose, Zod, JWT, Helmet, CORS
- [x] Initialize `frontend/` with Next.js 15+, Tailwind CSS, Lucide icons, Recharts, dark/light theme
- [x] Establish centralized environment schema and AES-256 encryption utilities

## Phase 2: MongoDB Models, Authentication & Core Backend APIs
- [x] Design and implement 14 Mongoose models with validation & indexes:
  1. `User`
  2. `InstagramAccount`
  3. `ContentIdea`
  4. `ResearchArticle`
  5. `GeneratedScript`
  6. `SocialPost`
  7. `ContentSchedule`
  8. `MediaAsset`
  9. `AutomationExecution`
  10. `AnalyticsSnapshot`
  11. `AIProviderConfig`
  12. `IntegrationConfig`
  13. `Notification`
  14. `ActivityLog`
- [x] Implement secure encryption/decryption for credentials & API keys (AES-256-GCM)
- [x] Implement JWT authentication, password hashing (bcryptjs), secure cookies, RBAC, rate-limiting
- [x] Implement REST APIs for all required routes:
  - `/api/auth` (register, login, logout, me, preferences)
  - `/api/dashboard` (real stats, reach, engagement, top content, execution logs)
  - `/api/research` (query topics, fetch feeds/APIs, save articles)
  - `/api/content-ideas` (generate ideas, approve/reject, status)
  - `/api/scripts` (Hindi/Hinglish Reel/Carousel/Story scripts, hook, CTA, regenerate)
  - `/api/media` (upload, metadata, link to scripts, storage provider abstraction)
  - `/api/posts` (create, edit, delete, draft/review/scheduled/published states)
  - `/api/calendar` (calendar events, reschedule, Asia/Kolkata timezone support)
  - `/api/instagram` (OAuth URL, callback, token exchange, account info, publish reel/photo)
  - `/api/analytics` (insights, reach, growth, engagement breakdown)
  - `/api/automation` (trigger workflows, executions history, retry failed)
  - `/api/integrations` (save/test credentials with server-side encryption)
  - `/api/settings` (brand profile, defaults, publishing mode)
  - `/api/webhooks/n8n` (signed webhooks for n8n bidirectional communication)

## Phase 3: Premium SaaS Frontend Dashboard (Next.js & Tailwind CSS)
- [x] Design system: Linear/Vercel/Notion inspired premium dark mode (default) + light mode
- [x] Core layout: Responsive sidebar, brand header, breadcrumbs, user profile, status pills
- [x] Dashboard Overview: Live KPI stats, reach/impressions chart, upcoming posts, recent executions
- [x] Content Research: Topic explorer, trend discovery, keyword manager, research results table
- [x] AI Script Generator: Hindi/Hinglish script studio, hook generator, scene breakdown, CTA selector
- [x] Content Calendar: Monthly/weekly/daily view, drag-and-drop or reschedule, status badges
- [x] Media Library: Video/image/audio asset manager, tag filter, upload modal, media preview
- [x] Reel Manager: Dedicated Reel production view with script sync, voiceover, caption & preview
- [x] Instagram Publishing: Connect account banner, manual approval gate, publishing queue, safety checklist
- [x] Automation Workflows: Workflow visualizer, trigger buttons, execution history, retry actions
- [x] Analytics & Reports: Audience growth, reel engagement, top hashtags, exportable summary
- [x] Settings & Integrations: Safe API key management (Gemini, OpenAI, Meta, Cloudinary), toggles

## Phase 4: AI Provider Integration & Content Research Engine
- [x] Provider abstraction layer: Google Gemini, OpenAI, OpenRouter
- [x] Connection testing & fallback handling
- [x] Hindi / Hinglish prompt engineering for Instagram Reels (hooks, retention, tone)
- [x] Content research providers (Perplexity/Tavily/Google Search/RSS fallback)

## Phase 5: n8n Automation Workflows & Webhooks
- [x] Exportable n8n Workflow JSONs:
  - Workflow A: Daily Content Research
  - Workflow B: AI Script Generation
  - Workflow C: Content Approval (Human-in-the-loop gate)
  - Workflow D: Content Publishing (Schedule check & verification)
  - Workflow E: Analytics Synchronization
  - Workflow F: Error Monitoring & Auto-Retry
- [x] Webhook HMAC signature verification and idempotency handling
- [x] Docker Compose & Render configuration for n8n with PostgreSQL

## Phase 6: Instagram Graph API Integration
- [x] Official Meta OAuth 2.0 flow implementation
- [x] Container creation & Reel publishing (`/media`, `/media_publish`)
- [x] Status polling and error mapping
- [x] Insights API retrieval (`impressions`, `reach`, `saved`, `shares`, `comments`, `likes`)
- [x] Clear setup guides & mock mode fallback for safe offline evaluation

## Phase 7: Scheduling, Auto-Publishing Guardrails & Safety
- [x] Guardrails: STRICT requirement that auto-publishing requires explicit user opt-in
- [x] Asia/Kolkata timezone handling
- [x] Duplicate publishing prevention logic
- [x] Retry queue with exponential backoff

## Phase 8: Testing, Security Audit, Documentation & Deployment
- [x] Unit & integration tests for Auth, DB, Encryption, APIs, Webhooks, Scheduler
- [x] TypeScript check and build verification across backend & frontend
- [x] Security audit (OWASP, PII masking, CSRF, rate-limiting, secret management)
- [x] Comprehensive documentation (README, Meta API Setup, Deployment Guide for Render/Vercel)
