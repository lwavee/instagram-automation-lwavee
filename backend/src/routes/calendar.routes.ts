import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { authenticateToken, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { SocialPost } from "../models/SocialPost";
import { ContentSchedule } from "../models/ContentSchedule";
import { objectId, publishTime } from "../services/publishInput";
import { postAccess, publishableStatuses } from "../services/publishingService";

const router = Router();

const rescheduleSchema = z.object({
  newPublishTime: publishTime.refine((value) => Date.parse(value) > Date.now(), "Choose a future time."),
  timezone: z.string().max(80).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
    catch { return false; }
  }).default("Asia/Kolkata"),
});

// GET /api/calendar/events
router.get(
  "/events",
  authenticateToken,
  requireRole(["admin"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { start, end } = req.query as Record<string, string>;

      const query: any = {
        ...postAccess(req.user!._id as Types.ObjectId),
        scheduledPublishTime: { $exists: true, $ne: null },
      };

      if (start && end) {
        if (!publishTime.safeParse(start).success || !publishTime.safeParse(end).success) {
          res.status(400).json({ success: false, error: { message: "Invalid calendar date range." } });
          return;
        }
        query.scheduledPublishTime = {
          $gte: new Date(start),
          $lte: new Date(end),
        };
      }

      const posts = await SocialPost.find(query)
        .select("title caption mediaType status scheduledPublishTime publishedAt isAutoPublish")
        .sort({ scheduledPublishTime: 1 });

      const events = posts.map((post) => ({
        id: post._id,
        title: post.title,
        date: post.scheduledPublishTime || post.publishedAt,
        status: post.status,
        mediaType: post.mediaType,
        isAutoPublish: post.isAutoPublish,
      }));

      res.json({
        success: true,
        data: {
          timezone: req.user?.preferences?.defaultTimezone || "Asia/Kolkata",
          events,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/calendar/reschedule/:id
router.put(
  "/reschedule/:id",
  authenticateToken,
  requireRole(["admin"]),
  validate(rescheduleSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { newPublishTime, timezone } = req.body;

      if (!objectId.safeParse(id).success) {
        res.status(400).json({ success: false, error: { message: "Invalid post ID." } });
        return;
      }
      const targetDate = new Date(newPublishTime);
      const post = await SocialPost.findOneAndUpdate({
        _id: id, ...postAccess(req.user!._id as Types.ObjectId), status: { $in: publishableStatuses },
        publishSubmittedAt: null, instagramPostId: { $in: [null, ""] }, facebookPostId: { $in: [null, ""] },
      }, {
        $set: { scheduledPublishTime: targetDate, status: "scheduled", retryCount: 0 },
        $unset: { publishMode: "", nextAttemptAt: "", processingDeadline: "", instagramMediaContainerId: "", instagramChildContainerIds: "" },
      }, { new: true });
      if (!post) {
        res.status(409).json({ success: false, error: { message: "This post is unavailable or cannot be rescheduled." } });
        return;
      }

      await ContentSchedule.findOneAndUpdate(
        { socialPostId: post._id },
        {
          $set: {
            targetPublishTime: targetDate,
            timezone,
            status: "scheduled",
          },
        },
        { upsert: true }
      );

      res.json({
        success: true,
        data: {
          message: "Post rescheduled successfully.",
          post,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

