import { createHash, randomBytes } from "crypto";
import { Router, Response, NextFunction } from "express";
import multer from "multer";
import axios from "axios";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { YouTubeOAuthState } from "../models/YouTubeOAuthState";
import { YouTubeAccount } from "../models/YouTubeAccount";
import { YouTubeUpload } from "../models/YouTubeUpload";
import { YouTubeError, YouTubeService } from "../services/youtubeService";
import { env } from "../config/env";
import { ActivityLog } from "../models/ActivityLog";
import { decryptSensitive } from "../utils/encryption";

const router = Router();
const admin = requireRole(["admin"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "video/mp4") cb(new Error("Upload an MP4 video file."));
    else cb(null, true);
  },
});

function redirect(res: Response, success: boolean) {
  const url = new URL("/youtube", env.FRONTEND_URL);
  url.searchParams.set(success ? "youtube_connected" : "youtube_error", success ? "true" : "connection_failed");
  res.redirect(303, url.href);
}

router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  next();
});

router.post("/auth-url", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const state = randomBytes(32).toString("hex");
    const url = YouTubeService.getAuthorizationUrl(state);
    await YouTubeOAuthState.create({ _id: digest(state), userId: req.user!._id, expiresAt: new Date(Date.now() + 10 * 60_000) });
    res.json({ success: true, data: { url } });
  } catch (error) {
    if (error instanceof YouTubeError) res.status(error.statusCode).json({ success: false, error: { message: error.message } });
    else next(error);
  }
});

// Google returns to the Render backend while the user session cookie is scoped
// to the Vercel frontend. The one-use state is bound to the admin user when the
// auth URL is created and is sufficient CSRF protection for this callback.
router.get("/callback", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, state, error } = req.query;
    const attempt = typeof state === "string" && /^[a-f0-9]{64}$/.test(state)
      ? await YouTubeOAuthState.findOneAndDelete({ _id: digest(state), expiresAt: { $gt: new Date() } })
      : null;
    if (!attempt) return redirect(res, false);
    if (typeof error === "string" || typeof code !== "string" || !code || code.length > 4096) return redirect(res, false);
    await YouTubeService.exchangeAuthorizationCode(code, attempt.userId.toString());
    redirect(res, true);
  } catch {
    redirect(res, false);
  }
});

router.get("/account", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await YouTubeAccount.findOne({ userId: req.user!._id });
    res.json({ success: true, data: account ? {
      isConnected: true,
      channelId: account.channelId,
      channelTitle: account.channelTitle,
      tokenExpiresAt: account.tokenExpiresAt,
      connectedAt: account.connectedAt,
      scopes: account.scopes,
    } : { isConnected: false } });
  } catch (error) { next(error); }
});

router.get("/uploads", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const uploads = await YouTubeUpload.find({ userId: req.user!._id })
      .sort({ createdAt: -1 }).limit(30)
      .select("title description channelId videoId status createdAt updatedAt");
    res.json({ success: true, data: { uploads } });
  } catch (error) { next(error); }
});

const uploadFields = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().max(5000).default(""),
  madeForKids: z.enum(["true", "false"]).transform((value) => value === "true"),
}).strict();

router.post("/upload", authenticateToken, admin, upload.single("video"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let record: any;
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: "Select an MP4 video to upload." } });
      return;
    }
    const parsed = uploadFields.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: parsed.error.issues[0]?.message || "Enter a valid title and description." } });
      return;
    }
    const idempotencyKey = req.get("Idempotency-Key");
    if (!idempotencyKey || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
      res.status(400).json({ success: false, error: { message: "A unique Idempotency-Key is required for each upload attempt." } });
      return;
    }
    const account = await YouTubeAccount.findOne({ userId: req.user!._id }).select("+accessTokenEncrypted +refreshTokenEncrypted");
    if (!account) {
      res.status(409).json({ success: false, error: { message: "Connect a YouTube channel before uploading." } });
      return;
    }
    const payloadHash = digest(Buffer.concat([
      req.file.buffer,
      Buffer.from("\n" + parsed.data.title + "\n" + parsed.data.description, "utf8"),
    ]).toString("base64"));
    const prior = await YouTubeUpload.findOne({ userId: req.user!._id, idempotencyKey });
    if (prior) {
      if (prior.payloadHash !== payloadHash) {
        res.status(409).json({ success: false, error: { message: "This upload key was already used for different content. Create a new upload attempt." } });
        return;
      }
      if (prior.status === "uploaded_private") {
        res.json({ success: true, data: { status: prior.status, videoId: prior.videoId, videoUrl: `https://www.youtube.com/watch?v=${prior.videoId}`, duplicate: true } });
        return;
      }
      res.status(409).json({ success: false, error: { message: prior.status === "unknown"
        ? "The previous upload result is uncertain. Check YouTube Studio before retrying to avoid a duplicate."
        : "This upload attempt already exists. Check its status before retrying." } });
      return;
    }
    record = await YouTubeUpload.create({
      userId: req.user!._id,
      idempotencyKey,
      payloadHash,
      title: parsed.data.title,
      description: parsed.data.description,
      channelId: account.channelId,
      status: "uploading",
    });

    const accessToken = await YouTubeService.getValidAccessToken(account);
    const init = await axios.post(
      "https://youtube.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        snippet: {
          title: parsed.data.title,
          description: parsed.data.description,
          categoryId: "27",
          defaultLanguage: "hi",
        },
        status: {
          privacyStatus: "private",
          selfDeclaredMadeForKids: parsed.data.madeForKids,
          containsSyntheticMedia: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
          "X-Upload-Content-Length": String(req.file.size),
        },
        timeout: 20000,
        maxRedirects: 0,
      },
    );
    const uploadUrl = init.headers.location;
    if (typeof uploadUrl !== "string" || !uploadUrl.startsWith("https://www.googleapis.com/upload/")) {
      await YouTubeUpload.updateOne({ _id: record._id }, { $set: { status: "failed", errorMessage: "Upload session was not created." } });
      res.status(502).json({ success: false, error: { message: "YouTube did not create an upload session." } });
      return;
    }
    let response;
    try {
      response = await axios.put(uploadUrl, req.file.buffer, {
        headers: { "Content-Type": "video/mp4", "Content-Length": String(req.file.size) },
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        maxRedirects: 0,
      });
    } catch {
      await YouTubeUpload.updateOne({ _id: record._id }, { $set: { status: "unknown", errorMessage: "Upload result could not be confirmed." } });
      res.status(202).json({ success: false, data: { status: "unknown" }, error: { message: "YouTube may have received the video, but the result could not be confirmed. Check YouTube Studio before retrying." } });
      return;
    }
    const videoId = response.data?.id;
    if (typeof videoId !== "string" || !/^[-\w]{6,}$/.test(videoId)) {
      await YouTubeUpload.updateOne({ _id: record._id }, { $set: { status: "unknown", errorMessage: "YouTube returned no video ID." } });
      res.status(202).json({ success: false, data: { status: "unknown" }, error: { message: "YouTube returned an uncertain upload result. Check YouTube Studio before retrying." } });
      return;
    }
    await YouTubeUpload.updateOne({ _id: record._id }, { $set: { status: "uploaded_private", videoId } });
    await ActivityLog.create({
      action: "YOUTUBE_VIDEO_UPLOADED_PRIVATE",
      performedBy: req.user!.email,
      entityType: "YouTubeUpload",
      entityId: String(record._id),
      details: { videoId, channelId: account.channelId, title: parsed.data.title },
      status: "success",
    });
    res.status(201).json({ success: true, data: { status: "uploaded_private", videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}` } });
  } catch (error) {
    if (record?._id) await YouTubeUpload.updateOne({ _id: record._id }, { $set: { status: "failed", errorMessage: "Upload failed before completion." } }).catch(() => undefined);
    if (error instanceof YouTubeError) {
      res.status(error.statusCode).json({ success: false, error: { message: error.message } });
    } else if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status === 401 || status === 403
        ? "YouTube rejected the upload authorization. Reconnect the channel and check upload access."
        : status === 429 || (status !== undefined && status >= 500)
        ? "YouTube is temporarily unavailable or rate-limiting uploads. Retry with a new upload attempt after checking YouTube Studio."
        : "YouTube rejected the upload. Check the video format, title, and channel permissions.";
      res.status(status === 401 || status === 403 ? 403 : 502).json({ success: false, error: { message } });
    } else next(error);
  }
});

router.post("/disconnect", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await YouTubeAccount.findOne({ userId: req.user!._id }).select("+refreshTokenEncrypted");
    if (account) {
      try {
        await axios.post("https://oauth2.googleapis.com/revoke", new URLSearchParams({ token: decryptSensitive(account.refreshTokenEncrypted) }), {
          timeout: 10000,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch { /* Local disconnect still removes this app's stored authorization. */ }
      await YouTubeAccount.deleteOne({ _id: account._id, userId: req.user!._id });
    }
    await YouTubeOAuthState.deleteMany({ userId: req.user!._id });
    res.json({ success: true, data: { message: "YouTube was disconnected from this dashboard." } });
  } catch (error) { next(error); }
});

export default router;
