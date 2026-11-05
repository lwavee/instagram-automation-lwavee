# LWAVEE — Production Deployment Guide

Zero-subscription-cost deployment architecture leveraging modern free-tier services.

## 1. Services Matrix

| Component | Provider | Configuration |
| :--- | :--- | :--- |
| **Frontend** | Vercel | Root: `frontend/` (Next.js preset) |
| **Backend** | Render | Root: `backend/` (Node service, bound to `0.0.0.0`) |
| **Database** | MongoDB Atlas | Free M0 Cluster (`instagram_automation`) |
| **Cloud Scheduler** | GitHub Actions | `.github/workflows/instagram-scheduler.yml` (every 15 min) |
| **Media Storage** | Cloudinary | Free tier media hosting |
| **AI Engine** | OpenRouter | Free & low-cost models (Llama 3.3, Gemini Flash) |

## 2. Environment Variables Mapping

### Render Backend Web Service:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.pjl4e3p.mongodb.net/instagram_automation?retryWrites=true&w=majority
JWT_SECRET=<32_char_secret>
APP_ENCRYPTION_KEY=<64_hex_char_aes_key>
FRONTEND_URL=https://<your-project>.vercel.app
BACKEND_URL=https://<your-backend>.onrender.com
SCHEDULER_SECRET=<random_secret_matching_github_actions>
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Vercel Frontend:
```env
NEXT_PUBLIC_BACKEND_URL=https://<your-backend>.onrender.com
```

### GitHub Actions Secrets:
```
BACKEND_API_URL=https://<your-backend>.onrender.com
SCHEDULER_SECRET=<same_secret_as_render>
```
