# LWAVEE — Official Meta Instagram Graph API Setup Guide

Step-by-step setup for configuring Meta App credentials for **@lw_avee**.

## 1. Prerequisites
1. Instagram account switched to **Professional Account** (Creator or Business) in the Instagram app.
2. Instagram account linked to a **Facebook Page** in Meta Business Suite.

## 2. Meta Developer Portal Configuration
1. Go to [developers.facebook.com](https://developers.facebook.com) and create or select your App.
2. Select App Type: **Business**.
3. Under Add Products: Add **Instagram** / **Facebook Login for Business**.
4. Set Valid OAuth Redirect URIs:
   - Development: `http://localhost:5000/api/instagram/callback`
   - Production: `https://<your-backend>.onrender.com/api/instagram/callback`
5. Configure permissions requested:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

## 3. Account Verification
When you connect via LWAVEE's **Connect Instagram** button:
1. Meta redirects to the official Facebook authorization screen.
2. Select your Facebook Page and linked Instagram Professional account.
3. LWAVEE automatically exchanges the authorization code for a **60-day long-lived access token** via `fb_exchange_token`.
4. The token is encrypted using AES-256-GCM before saving to MongoDB Atlas.
