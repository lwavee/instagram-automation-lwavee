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

## Upload behavior

- Uploads are MP4, limited to 100 MB by this dashboard.
- The upload form sends each video to the connected channel as **private**. It does not publish videos publicly or set a publish time.
- Each upload uses an idempotency key. An uncertain upload result is held for review rather than retried automatically, to avoid duplicate videos.
- Before upload, select whether the video is made for kids. The app does not guess this audience declaration.
- Review the video, title, description, audience setting, and any applicable altered/synthetic-media disclosure in YouTube Studio before making it public.
- Revoke the dashboard's connection with **Disconnect**. The app attempts Google's token-revocation endpoint and removes its encrypted local grant.

Google API references: [OAuth authorization](https://developers.google.com/youtube/data/guides/authentication), [videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert).
