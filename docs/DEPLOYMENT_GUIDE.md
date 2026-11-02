# Deployment & Infrastructure Guide — Learn With Avee

This document provides deployment instructions for the **Learn With Avee** AI Instagram Automation platform.

---

## Architecture Overview

```
                                  +-----------------------------+
                                  |   Next.js 15+ Frontend      |
                                  |       (Hosted on Vercel)    |
                                  +--------------+--------------+
                                                 | HTTPS API
                                                 v
                                  +-----------------------------+
                                  |   Express.js Backend API    |
                                  |     (Render Web Service)    |
                                  +----+--------------------+---+
                                       |                    |
                 Mongoose / Atlas TLS  |                    | Webhooks (HMAC)
                                       v                    v
+-------------------------------+      +--------------+     +-------------------------------+
|       MongoDB Atlas           |                     |     |    n8n Community Edition      |
|  (App Data: Scripts, Posts,   |                     |     |     (Render Docker Service)   |
|   Research, Media, Users)     |                     |     +---------------+---------------+
+-------------------------------+                     |                     |
                                                      |                     v
                                                      |     +-------------------------------+
                                                      |     |     Render PostgreSQL DB      |
                                                      |     |    (n8n Internal Persistence) |
                                                      |     +-------------------------------+
                                                      |
                                                      v
                                        +-----------------------------+
                                        |  Meta Instagram Graph API   |
                                        | (Reel Container Publishing) |
                                        +-----------------------------+
```

---

## 1. MongoDB Atlas Setup
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write permissions.
3. Under **Network Access**, whitelist `0.0.0.0/0` (or Render's outbound IPs).
4. Copy the connection URI:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/learn_with_avee?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment (Render Web Service)
1. Connect your GitHub repository `https://github.com/lwavee/instagram-automation-lwavee` to Render.
2. Create a new **Web Service** with:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Configure Environment Variables in Render Dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<your-mongodb-atlas-uri>`
   - `JWT_SECRET`: `<generated-32-byte-hex-string>`
   - `APP_ENCRYPTION_KEY`: `<generated-32-byte-hex-string>`
   - `FRONTEND_URL`: `https://<your-vercel-app>.vercel.app`
   - `BACKEND_URL`: `https://<your-backend-app>.onrender.com`
   - `N8N_BASE_URL`: `https://<your-n8n-app>.onrender.com`
   - `N8N_WEBHOOK_SECRET`: `<your-secure-webhook-secret>`
   - `MEDIA_STORAGE_PROVIDER`: `cloudinary` (or `supabase`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

> [!NOTE]
> **Render Free Tier Cold Starts**: Render's free tier spins down web services after 15 minutes of inactivity. Incoming requests can take 30–50 seconds to boot on cold start. The application frontend includes clear loading states to handle this smoothly.

---

## 3. n8n Community Edition Deployment (Render Docker Service)
1. In Render, create a **PostgreSQL Database** named `learn-with-avee-n8n-db`.
2. Create a **Web Service** using the Docker environment:
   - **Dockerfile Path**: `n8n/Dockerfile`
   - **Health Check Path**: `/healthz`
3. Set environment variables:
   - `DB_TYPE`: `postgresdb`
   - `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD` (link to database)
   - `N8N_ENCRYPTION_KEY`: `<32-char-random-string>`
   - `GENERIC_TIMEZONE`: `Asia/Kolkata`
   - `BACKEND_API_URL`: `https://<your-backend-app>.onrender.com`
   - `N8N_WEBHOOK_SECRET`: `<same-secret-as-backend>`

---

## 4. Frontend Deployment (Vercel)
1. Import the repository in [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Next.js**.
4. Configure Environment Variable:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://<your-backend-app>.onrender.com`
5. Click **Deploy**.

