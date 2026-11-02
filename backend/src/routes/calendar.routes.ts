import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { SocialPost } from "../models/SocialPost";
import { ContentSchedule } from "../models/ContentSchedule";

const router = Router();

const rescheduleSchema = z.object({
  newPublishTime: z.string().datetime(),
  timezone: z.string().default("Asia/Kolkata"),
});

// GET /api/calendar/events
router.get(
  "/events",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { start, end } = req.query as Record<string, string>;

      const query: any = {
        scheduledPublishTime: { $exists: true, $ne: null },
      };

      if (start && end) {
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
  validate(rescheduleSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { newPublishTime, timezone } = req.body;

      const post = await SocialPost.findById(id);
      if (!post) {
        res.status(404).json({ success: false, error: { message: "Scheduled post not found." } });
        return;
      }

      const targetDate = new Date(newPublishTime);
      post.scheduledPublishTime = targetDate;
      if (post.status === "failed") {
        post.status = "scheduled"; // reset status if retrying
      }
      await post.save();

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
