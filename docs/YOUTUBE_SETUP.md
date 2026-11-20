# YouTube Shorts connection

The app uses the YouTube Data API v3 server-side OAuth flow. An API key can read public data but cannot upload a video. The app requests only `youtube.upload` and `youtube.readonly`: the former uploads video content; the latter verifies the selected channel name. Google issues expiring access tokens and an offline refresh token; the backend encrypts both before storing them.

## Google Cloud setup

1. In Google Cloud Console, create/select a project and enable **YouTube Data API v3**.
2. Configure the OAuth consent screen for the Google account that owns/manages the target YouTube channel. Add the owner as a test user while the consent screen is in testing.
3. Create an OAuth client ID of type **Web application**.
4. Add the exact authorized redirect URI:
   - Local: `http://localhost:5000/api/youtube/callback`
   - Production: `https://<your-backend>.onrender.com/api/youtube/callback`
5. Set these backend environment variables (Render service only):
   - `YOUTUBE_OAUTH_CLIENT_ID`
   - `YOUTUBE_OAUTH_CLIENT_SECRET`
   - `YOUTUBE_OAUTH_REDIRECT_URI` (same exact URL as above)
6. Set the production `BACKEND_URL` to the Render HTTPS origin and keep `FRONTEND_URL` set to the Vercel origin.
7. Sign in to the dashboard and open **YouTube Studio**. Connect the Google account that owns the intended channel; confirm the channel name displayed before uploading.

## Niche research and Gemini Short generation

The dashboard's **Creator Workflow** uses the public YouTube Data API to find short videos uploaded in the last 90 days for the configured niche, then ranks observed videos by views per hour. This is a performance signal, not a guarantee of virality, and the workflow does not copy competitor scripts.

1. In Google Cloud Console, enable **YouTube Data API v3** and create a restricted API key for server-side use.
2. Add `YOUTUBE_DATA_API_KEY` to the Render backend environment. Do not add it to Vercel or a `NEXT_PUBLIC_` variable.
3. Configure Gemini in **API Integrations** (or set backend `GEMINI_API_KEY`). The text default is `gemini-3.1-flash-lite`.
4. Keep backend `GEMINI_VIDEO_MODEL=gemini-omni-1.2-flash`. Video generation requires paid Gemini API access. At Google's currently published 720p rate, 18 seconds is about USD $1.26 and 24 seconds about $1.68, plus text and input charges. Verify current pricing in Google AI Studio before production use.
5. For production, configure `MEDIA_STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Production generation refuses local-only storage because Render's local filesystem is ephemeral.
6. In the dashboard, choose **Creator Workflow**, set the niche and optional topic, and start generation. It saves the script/prompts and final MP4 on the workflow and Instagram Downloads pages. Publishing remains separate. Use YouTube Studio's private upload flow to upload the downloaded MP4 if desired.

Gemini's generated avatar, spoken audio, wording, and lip-sync can vary. Review the full video and caption before posting.

## OAuth publishing status and token lifetime

- For a first private test, add your own Google account as a test user in the consent screen. Google documents that an **External / Testing** app's refresh tokens expire after 7 days when it requests YouTube scopes. That means reconnecting weekly during testing.
- For ongoing use, set the app to **In production** after configuring the app identity and support details. Google may require OAuth verification for the requested scopes. Complete any verification Google requires before relying on long-lived authorization. Even in production, a user can revoke access or Google can invalidate tokens; reconnect is supported.
- Do not treat the access token as permanent. The backend refreshes access tokens using the encrypted refresh token and reports when reauthorization is needed.

## Upload behavior

- Uploads are MP4, limited to 100 MB by this dashboard.
- The upload form sends each video to the connected channel as **private**. It does not publish videos publicly or set a publish time.
- Each upload uses an idempotency key. An uncertain upload result is held for review rather than retried automatically, to avoid duplicate videos.
- Before upload, select whether the video is made for kids. The app does not guess this audience declaration.
- Review the video, title, description, audience setting, and any applicable altered/synthetic-media disclosure in YouTube Studio before making it public.
- Revoke the dashboard's connection with **Disconnect**. The app attempts Google's token-revocation endpoint and removes its encrypted local grant.

Google API references: [OAuth authorization](https://developers.google.com/youtube/data/guides/authentication), [videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert).
