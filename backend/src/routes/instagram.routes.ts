import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { InstagramAccount } from "../models/InstagramAccount";
import { User } from "../models/User";
import { InstagramService, verifyOAuthState } from "../services/instagramService";
import { encryptSensitive } from "../utils/encryption";
import { ActivityLog } from "../models/ActivityLog";
import { env } from "../config/env";

const router = Router();

// GET /api/instagram/auth-url
router.get("/auth-url", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user ? req.user._id.toString() : "";
    const url = InstagramService.getOAuthUrl(userId);
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message,
        tip: "Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in Settings or backend environment variables.",
      },
    });
  }
});

// GET /api/instagram/callback (Browser callback from official Meta OAuth authorization)
router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state, error, error_description, error_reason } = req.query as Record<string, string>;

  // 1. Check if user cancelled authorization or Meta returned an error
  if (error || error_description) {
    const errorMsg = error_description || error_reason || error || "Meta authorization was declined or cancelled.";
    console.warn(`Meta OAuth error received: ${errorMsg}`);
    res.redirect(`${env.FRONTEND_URL}/integrations?error=${encodeURIComponent(errorMsg)}`);
    return;
  }

  // 2. Validate code and state parameters
  if (!code || !state) {
    res.redirect(
      `${env.FRONTEND_URL}/integrations?error=${encodeURIComponent("Missing authorization code or state parameter.")}`
    );
    return;
  }

  // 3. Cryptographically verify state and retrieve userId
  let userId = "";
  try {
    const statePayload = verifyOAuthState(state);
    userId = statePayload.userId;
  } catch (stateErr: any) {
    console.error(`Invalid OAuth state: ${stateErr.message}`);
    res.redirect(
      `${env.FRONTEND_URL}/integrations?error=${encodeURIComponent(
        "Security verification failed: invalid or expired OAuth state. Please try connecting again."
      )}`
    );
    return;
  }

  // 4. Verify authentic user existence
  const user = await User.findById(userId);
  if (!user) {
    res.redirect(
      `${env.FRONTEND_URL}/integrations?error=${encodeURIComponent("Authenticated user not found. Please log in again.")}`
    );
    return;
  }

  // 5. Exchange code, verify eligibility, encrypt tokens and store account
  try {
    const account = await InstagramService.handleOAuthCallback(code, userId, undefined, user.email);
    res.redirect(
      `${env.FRONTEND_URL}/integrations?connected=true&username=${encodeURIComponent(account.username)}`
    );
  } catch (oauthErr: any) {
    console.error("Instagram OAuth exchange failed:", oauthErr.message);
    const friendlyMsg =
      oauthErr.response?.data?.error?.message ||
      oauthErr.message ||
      "Failed to complete Instagram authorization exchange.";
    res.redirect(`${env.FRONTEND_URL}/integrations?error=${encodeURIComponent(friendlyMsg)}`);
  }
});

// GET /api/instagram/account
router.get(
  "/account",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await InstagramAccount.findOne({
        $or: [{ userId: req.user!._id, isConnected: true }, { isConnected: true }],
      }).sort({ updatedAt: -1 });

      if (!account) {
        res.json({
          success: true,
          data: {
            isConnected: false,
            message: "No Instagram Professional account connected yet.",
            setupRequirements: {
              accountType: "Instagram Professional (Business or Creator)",
              facebookPageRequired: true,
              metaAppRequired: true,
              permissions: [
                "instagram_basic",
                "instagram_content_publish",
                "instagram_manage_insights",
                "pages_show_list",
                "pages_read_engagement",
              ],
            },
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          isConnected: true,
          account: {
            id: account._id,
            instagramId: account.instagramId,
            username: account.username,
            name: account.name,
            accountType: account.accountType,
            profilePictureUrl: account.profilePictureUrl,
            followersCount: account.followersCount,
            followsCount: account.followsCount,
            mediaCount: account.mediaCount,
            tokenExpiresAt: account.tokenExpiresAt,
            lastSyncedAt: account.lastSyncedAt,
            permissions: account.permissions,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/instagram/connect-token (Manual connection for local testing / production tokens)
const manualConnectSchema = z.object({
  instagramId: z.string().min(3),
  username: z.string().min(2),
  accessToken: z.string().min(10),
  name: z.string().optional(),
  accountType: z.enum(["BUSINESS", "CREATOR"]).default("BUSINESS"),
  followersCount: z.number().optional(),
});

router.post(
  "/connect-token",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { instagramId, username, accessToken, name, accountType, followersCount } = req.body;

      const accessTokenEncrypted = encryptSensitive(accessToken);

      const account = await InstagramAccount.findOneAndUpdate(
        { instagramId },
        {
          $set: {
            userId: req.user!._id,
            username,
            name: name || username,
            accountType: accountType || "BUSINESS",
            accessTokenEncrypted,
            isConnected: true,
            followersCount: followersCount || 100,
            lastSyncedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      await ActivityLog.create({
        action: "INSTAGRAM_ACCOUNT_CONNECTED",
        performedBy: req.user!.email,
        entityType: "InstagramAccount",
        entityId: account._id.toString(),
        status: "success",
      });

      res.json({
        success: true,
        data: {
          message: "Instagram account connected successfully.",
          account,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/instagram/disconnect
router.post(
  "/disconnect",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await InstagramAccount.updateMany({}, { $set: { isConnected: false } });

      await ActivityLog.create({
        action: "INSTAGRAM_ACCOUNT_DISCONNECTED",
        performedBy: req.user!.email,
        status: "success",
      });

      res.json({
        success: true,
        data: { message: "Instagram account disconnected." },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

