import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { SocialPost } from "../models/SocialPost";
import { ContentSchedule } from "../models/ContentSchedule";
import { InstagramAccount } from "../models/InstagramAccount";
import { InstagramService } from "../services/instagramService";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(2),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
  mediaUrl: z.string().url(),
  coverImageUrl: z.string().optional(),
  mediaType: z.enum(["REELS", "IMAGE", "CAROUSEL", "VIDEO"]).default("REELS"),
  scheduledPublishTime: z.string().optional(),
  isAutoPublish: z.boolean().optional(),
  scriptId: z.string().optional(),
  instagramAccountId: z.string().optional(),
});

// GET /api/posts
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, mediaType, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (status) query.status = status;
      if (mediaType) query.mediaType = mediaType;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [posts, total] = await Promise.all([
        SocialPost.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("instagramAccountId", "username name profilePictureUrl")
          .populate("scriptId", "reelTitle openingHook"),
        SocialPost.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          posts,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:id
router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await SocialPost.findById(req.params.id)
        .populate("instagramAccountId")
        .populate("scriptId");

      if (!post) {
        res.status(404).json({ success: false, error: { message: "Post not found." } });
        return;
      }
      res.json({ success: true, data: { post } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts
router.post(
  "/",
  authenticateToken,
  validate(createPostSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        title,
        caption,
        hashtags = [],
        mediaUrl,
        coverImageUrl,
        mediaType,
        scheduledPublishTime,
        isAutoPublish,
        scriptId,
        instagramAccountId,
      } = req.body;

      // Find active Instagram account if not provided
      let accountId = instagramAccountId;
      if (!accountId) {
        const defaultAccount = await InstagramAccount.findOne({ isConnected: true });
        if (defaultAccount) accountId = defaultAccount._id;
      }

      const scheduledDate = scheduledPublishTime ? new Date(scheduledPublishTime) : undefined;
      const status = scheduledDate ? "scheduled" : "draft";

      const post = await SocialPost.create({
        title,
        caption,
        hashtags,
        mediaUrl,
        coverImageUrl: coverImageUrl || "",
        mediaType,
        scriptId: scriptId || undefined,
        instagramAccountId: accountId || undefined,
        scheduledPublishTime: scheduledDate,
        status,
        isAutoPublish: Boolean(isAutoPublish && req.user?.preferences?.autoPublishEnabled),
      });

      if (scheduledDate) {
        await ContentSchedule.create({
          socialPostId: post._id,
          scriptId: scriptId || undefined,
          targetPublishTime: scheduledDate,
          status: "scheduled",
        });
      }

      await ActivityLog.create({
        action: "POST_CREATED",
        performedBy: req.user!.email,
        entityType: "SocialPost",
        entityId: post._id.toString(),
        details: { title, status },
        status: "success",
      });

      res.status(201).json({
        success: true,
        data: { post },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/publish-now (Manual publish triggered by user)
router.post(
  "/:id/publish-now",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await SocialPost.findById(req.params.id);
      if (!post) {
        res.status(404).json({ success: false, error: { message: "Post not found." } });
        return;
      }

      if (post.status === "publishing") {
        res.status(409).json({ success: false, error: { message: "Post is already currently publishing." } });
        return;
      }

      // Find account
      let account = await InstagramAccount.findById(post.instagramAccountId);
      if (!account) {
        account = await InstagramAccount.findOne({ isConnected: true });
      }

      if (!account) {
        res.status(400).json({
          success: false,
          error: {
            message: "No connected Instagram Professional account found. Please connect an account in Settings -> Integrations first.",
          },
        });
        return;
      }

      post.status = "publishing";
      post.publishingLogs.push({
        timestamp: new Date(),
        message: `Manual publish triggered by ${req.user!.email}`,
        level: "info",
      });
      await post.save();

      // Trigger Instagram API publish
      const publishResult = await InstagramService.publishReel({
        accountId: account._id.toString(),
        mediaType: post.mediaType as any,
        mediaUrl: post.mediaUrl,
        caption: `${post.caption}\n\n${post.hashtags.join(" ")}`,
        coverImageUrl: post.coverImageUrl,
      });

      if (publishResult.success) {
        post.status = "published";
        post.publishedAt = new Date();
        post.instagramPostId = publishResult.instagramPostId;
        post.permalink = publishResult.permalink;
        post.errorMessage = "";
        post.publishingLogs.push({
          timestamp: new Date(),
          message: `Published successfully: ID ${publishResult.instagramPostId}`,
          level: "info",
        });
        await post.save();

        await ActivityLog.create({
          action: "INSTAGRAM_MANUAL_PUBLISH_SUCCESS",
          performedBy: req.user!.email,
          entityType: "SocialPost",
          entityId: post._id.toString(),
          details: { instagramPostId: publishResult.instagramPostId },
          status: "success",
        });

        res.json({
          success: true,
          data: {
            post,
            result: publishResult,
          },
        });
      } else {
        post.status = "failed";
        post.errorMessage = publishResult.error || publishResult.statusMessage;
        post.publishingLogs.push({
          timestamp: new Date(),
          message: `Publish failed: ${post.errorMessage}`,
          level: "error",
        });
        await post.save();

        res.status(400).json({
          success: false,
          error: {
            message: post.errorMessage,
            setupRequired: !account.accessTokenEncrypted,
          },
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await SocialPost.findByIdAndDelete(req.params.id);
      await ContentSchedule.deleteMany({ socialPostId: req.params.id });
      res.json({ success: true, data: { message: "Post deleted successfully." } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
