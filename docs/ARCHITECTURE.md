# LWAVEE — System Architecture

## 1. High-Level Overview

**LWAVEE** is a production-grade, zero-subscription-cost Instagram AI Automation & Content Management SaaS designed specifically for creator accounts (such as **@lw_avee**).

```
                     ┌────────────────────────────────────────────────────────┐
                     │              Vercel Frontend (Next.js 15/16)          │
                     │         Modern Tailwind / shadcn SaaS Dashboard        │
                     └─────────────────────────┬──────────────────────────────┘
                                               │ HTTPS / Bearer JWT
                                               ▼
                     ┌────────────────────────────────────────────────────────┐
                     │               Render Backend API (Node / Express)      │
                     │   Auth • AI Studio • Calendar • Meta Graph API Engine  │
                     └───────┬─────────────────────────┬──────────────┬───────┘
                             │                         │              │
           ┌─────────────────┴────────┐   ┌────────────┴────┐   ┌─────┴──────────────────┐
           │   MongoDB Atlas (Cloud)  │   │ OpenRouter AI   │   │ Meta Graph API v21.0   │
           │ primary database         │   │ Llama 3.3 / Free│   │ Official Reels & Posts │
           └──────────────────────────┘   └─────────────────┘   └────────────────────────┘
                             ▲
                             │ Scheduled Every 15 Min
                     ┌───────┴────────────────────────┐
                     │  GitHub Actions Cloud Worker   │
                     │  .github/workflows/scheduler   │
                     └────────────────────────────────┘
```

## 2. Core Modules

1. **Dashboard & Content Studio (`apps/web` or `frontend/`)**:
   - Modern Next.js App Router interface.
   - Comprehensive 13-section sidebar navigation.
   - Real-time KPI metrics, content calendars, preview cards, and one-click manual approval gates.

2. **Backend API (`apps/api` or `backend/`)**:
   - Express REST API running on Node.js in strict TypeScript.
   - Bound to `0.0.0.0` and `process.env.PORT` for Render production deployment.
   - JWT authentication + AES-256-GCM secret encryption at rest.

3. **Shared Contracts (`packages/shared/`)**:
   - Shared domain interfaces and Zod validation schemas across both apps.

4. **Zero-Local-PC Scheduler (`.github/workflows/instagram-scheduler.yml`)**:
   - Triggers `POST /api/internal/scheduler/run` every 15 minutes.
   - Authenticated via `x-scheduler-secret`.
   - Never depends on a user's computer remaining awake.

5. **Approval Workflow Gate**:
   - Every AI-generated post enters `PENDING_APPROVAL`.
   - Content cannot be queued, scheduled, or published until a human explicitly reviews and approves it.
