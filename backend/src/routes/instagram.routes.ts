import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { InstagramAccount } from "../models/InstagramAccount";
import { InstagramService } from "../services/instagramService";
import { encryptSensitive } from "../utils/encryption";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

// GET /api/instagram/auth-url
router.get("/auth-url", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = InstagramService.getOAuthUrl();
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

// GET /api/instagram/account
router.get(
  "/account",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await InstagramAccount.findOne({ isConnected: true });

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

