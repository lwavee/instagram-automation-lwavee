# Meta / Instagram Graph API Integration Guide

This guide details the exact process for configuring and publishing Instagram Reels for **Learn With Avee** using the official Meta Instagram Graph API (v21.0).

---

## 1. Account Eligibility & Prerequisites
To publish content and access insights via the Meta Graph API, your account must meet these requirements:
1. **Instagram Professional Account**: The Instagram account must be converted to **Business** or **Creator** in the Instagram mobile app (`Settings -> Account type and tools -> Switch to Professional account`).
2. **Linked Facebook Page**: The Instagram Professional account must be connected to a Facebook Page that you administer in [Meta Business Suite](https://business.facebook.com).

> [!WARNING]
> Personal Instagram accounts do not support API publishing or insights retrieval. Unofficial scraping or login automation violates Meta's Terms of Service and is strictly prohibited in this platform.

---

## 2. Meta Developer Portal Setup
1. Visit [developers.facebook.com](https://developers.facebook.com/) and register as a developer.
2. Click **Create App** and choose the **Business** app type.
3. In the App Dashboard, add the following products:
   - **Instagram Graph API**
   - **Facebook Login for Business**
4. In **App Settings -> Basic**, retrieve your:
   - `App ID` (set as `INSTAGRAM_APP_ID`)
   - `App Secret` (set as `INSTAGRAM_APP_SECRET`)
5. In **Facebook Login -> Settings -> Valid OAuth Redirect URIs**, enter:
   - For Local Dev: `http://localhost:5000/api/instagram/callback`
   - For Production: `https://<your-backend-domain>/api/instagram/callback`

---

## 3. Required Meta Permissions
When requesting authorization, the app requests the following scopes:
- `instagram_basic`: Reads basic account profile and media counts.
- `instagram_content_publish`: Allows container creation and publishing of Reels, photos, and carousels.
- `instagram_manage_insights`: Retrieves post impressions, reach, saves, and follower metrics.
- `pages_show_list`: Discovers Facebook Pages managed by the user.
- `pages_read_engagement`: Reads page association tokens.

---

## 4. How Instagram Reel Publishing Works (2-Step Container Flow)

Publishing a Reel via Meta Graph API is asynchronous and requires two steps:

### Step 1: Create Media Container
```http
POST https://graph.facebook.com/v21.0/{ig-user-id}/media
Content-Type: application/json

{
  "media_type": "REELS",
  "video_url": "https://your-public-cdn.com/videos/reel-1.mp4",
  "caption": "🔥 3 AI Tools You Must Know in 2026! #LearnWithAvee #AITools",
  "share_to_feed": true,
  "access_token": "{long_lived_user_access_token}"
}
```
**Response:**
```json
{
  "id": "1789569345000" // Media Container ID
}
```

### Step 2: Poll Container Status
Meta downloads and transcodes the video on their servers. The platform polls every 5 seconds:
```http
GET https://graph.facebook.com/v21.0/{container-id}?fields=status_code&access_token={token}
```
Statuses:
- `IN_PROGRESS`: Transcoding.
- `FINISHED`: Ready to publish.
- `ERROR`: Transcoding failed (e.g. invalid codec or aspect ratio).

### Step 3: Publish Container
```http
POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish
Content-Type: application/json

{
  "creation_id": "{container-id}",
  "access_token": "{token}"
}
```
**Response:**
```json
{
  "id": "1800234567890" // Published Instagram Post ID
}
```

---

## 5. Media Video Specifications
For successful Reel publishing, media must conform to:
- **Aspect Ratio**: 9:16 (vertical, recommended 1080 x 1920 px)
- **Container**: MP4 or MOV
- **Video Codec**: H.264
- **Audio Codec**: AAC, 48kHz, mono or stereo
- **Frame Rate**: 23–60 fps
- **Duration**: 3 seconds to 15 minutes (under 90 seconds recommended for Reels)
- **File Size**: Max 100 MB via URL
