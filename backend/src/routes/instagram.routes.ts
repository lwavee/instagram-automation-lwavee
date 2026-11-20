import { createHash, randomBytes } from "crypto";
import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { InstagramAccount, IInstagramAccount } from "../models/InstagramAccount";
import { MetaOAuthState } from "../models/MetaOAuthState";
import { InstagramService, canPublishPage } from "../services/instagramService";
import { MetaError, readDeauthorization, requiredMetaPermissions } from "../services/metaGraph";
import { env } from "../config/env";

const router = Router();
const admin = requireRole(["admin"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function redirect(res: Response, key: "connected" | "error", value: string) {
  const url = new URL("/integrations", env.FRONTEND_URL);
  url.searchParams.set(key, value);
  res.redirect(303, url.href);
}

function summary(account: IInstagramAccount | null) {
  const permissions = requiredMetaPermissions();
  if (!account) return { isConnected: false, health: "disconnected", permissions };
  const connected = Boolean(account.isConnected && env.META_APP_ID && env.META_FACEBOOK_PAGE_ID &&
    account.authorizationAppId === env.META_APP_ID && account.pageId === env.META_FACEBOOK_PAGE_ID &&
    account.username.toLowerCase() === env.META_INSTAGRAM_USERNAME?.replace(/^@/, "").toLowerCase() &&
    account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now() &&
    permissions.every((permission) => account.permissions.includes(permission)));
  return {
    isConnected: connected,
    health: connected ? "authorized" : account.isConnected ? "reconnect_required" : "disconnected",
    graphVersion: env.META_GRAPH_API_VERSION,
    account: {
      id: account._id, instagramId: account.instagramId, username: account.username, name: account.name,
      profilePictureUrl: account.profilePictureUrl, followersCount: account.followersCount,
      followsCount: account.followsCount, mediaCount: account.mediaCount, tokenExpiresAt: account.tokenExpiresAt,
      lastSyncedAt: account.lastSyncedAt, permissions: account.permissions,
      page: account.pageId ? { id: account.pageId, name: account.pageName, canPublish: connected && canPublishPage(account.pageTasks) } : undefined,
    },
  };
}

router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  next();
});

router.post("/auth-url", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const state = randomBytes(32).toString("hex");
    const url = InstagramService.getOAuthUrl(state);
    await MetaOAuthState.create({
      _id: digest(state), sessionHash: digest(req.cookies.auth_token), userId: req.user!._id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    res.json({ success: true, data: { url } });
  } catch (error) {
    if (error instanceof MetaError) res.status(503).json({ success: false, error: { message: error.message } });
    else next(error);
  }
});

router.get("/callback", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response) => {
  const { code, state, error } = req.query;
  try {
    const attempt = typeof state === "string" && /^[a-f0-9]{64}$/.test(state)
      ? await MetaOAuthState.findOneAndDelete({
        _id: digest(state), sessionHash: digest(req.cookies.auth_token), userId: req.user!._id,
        expiresAt: { $gt: new Date() },
      })
      : null;
    if (!attempt) return redirect(res, "error", "Invalid or expired Meta authorization state. Start again from Integrations.");
    if (typeof error === "string") return redirect(res, "error", "Meta authorization was cancelled or declined.");
    if (typeof code !== "string" || !code || code.length > 4096) {
      return redirect(res, "error", "Meta did not return a valid authorization code.");
    }

    await InstagramService.handleOAuthCallback(code, req.user!._id.toString());
    redirect(res, "connected", "true");
  } catch (err) {
    const message = err instanceof MetaError ? err.message
      : (err as { code?: number }).code === 11000 ? "That Instagram account is already owned by another dashboard user."
      : "The Meta connection could not be saved. Start again from Integrations.";
    redirect(res, "error", message);
  }
});

router.get("/account", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await InstagramAccount.findOne({ userId: req.user!._id }).sort({ isConnected: -1, updatedAt: -1 });
    res.json({ success: true, data: summary(account) });
  } catch (error) { next(error); }
});

router.post("/health", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await InstagramAccount.findOne({ userId: req.user!._id, isConnected: true }).sort({ updatedAt: -1 }).select("+accessTokenEncrypted");
    if (!account) {
      res.status(409).json({ success: false, error: { message: "Connect Meta before checking authorization." } });
      return;
    }
    await InstagramService.refreshHealth(account);
    res.json({ success: true, data: summary(await InstagramAccount.findById(account._id)) });
  } catch (error) {
    if (error instanceof MetaError) res.status(error.retryable ? 503 : 409).json({ success: false, error: { message: error.message } });
    else next(error);
  }
});

router.post("/disconnect", authenticateToken, admin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await MetaOAuthState.deleteMany({ userId: req.user!._id });
    await InstagramAccount.updateMany({ userId: req.user!._id }, {
      $set: { isConnected: false, permissions: [], pageTasks: [] },
      $unset: { accessTokenEncrypted: "", pageTokenEncrypted: "", tokenExpiresAt: "" },
    });
    res.json({ success: true, data: { message: "Disconnected from this dashboard. You can also remove the app under Facebook Business Integrations." } });
  } catch (error) { next(error); }
});

router.post("/deauthorize", async (req, res, next) => {
  const signed = readDeauthorization(req.body?.signed_request, env.META_APP_SECRET);
  if (!signed || !env.META_APP_ID) {
    res.sendStatus(400);
    return;
  }
  try {
    await InstagramAccount.updateMany({
      authorizationAppId: env.META_APP_ID, metaUserId: signed.userId, lastAuthorizedAt: { $lte: signed.issuedAt },
    }, {
      $set: { isConnected: false, permissions: [], pageTasks: [] },
      $unset: { accessTokenEncrypted: "", pageTokenEncrypted: "", tokenExpiresAt: "" },
    });
    res.sendStatus(200);
  } catch (error) { next(error); }
});

export default router;

