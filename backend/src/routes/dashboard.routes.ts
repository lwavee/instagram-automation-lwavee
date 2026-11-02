import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { SocialPost } from "../models/SocialPost";
import { GeneratedScript } from "../models/GeneratedScript";
import { AutomationExecution } from "../models/AutomationExecution";
import { InstagramAccount } from "../models/InstagramAccount";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { ContentIdea } from "../models/ContentIdea";

const router = Router();

// GET /api/dashboard/stats
router.get(
  "/stats",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Post counts
      const [publishedCount, scheduledCount, draftCount, failedCount] = await Promise.all([
        SocialPost.countDocuments({ status: "published" }),
        SocialPost.countDocuments({ status: "scheduled" }),
        SocialPost.countDocuments({ status: { $in: ["draft", "review_pending"] } }),
        SocialPost.countDocuments({ status: "failed" }),
      ]);

      // 2. Metrics aggregations from published posts
      const metricsAgg = await SocialPost.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: "$metrics.likesCount" },
            totalComments: { $sum: "$metrics.commentsCount" },
            totalShares: { $sum: "$metrics.sharesCount" },
            totalSaves: { $sum: "$metrics.savesCount" },
            totalReach: { $sum: "$metrics.reachCount" },
            totalImpressions: { $sum: "$metrics.impressionsCount" },
          },
        },
      ]);

      const metrics = metricsAgg[0] || {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        totalReach: 0,
        totalImpressions: 0,
      };

      // 3. Instagram Account info
      const connectedAccount = await InstagramAccount.findOne({ isConnected: true });
      const followersCount = connectedAccount?.followersCount || 0;

      // Engagement rate formula: ((Likes + Comments + Saves + Shares) / Reach) * 100
      const totalInteractions =
        metrics.totalLikes + metrics.totalComments + metrics.totalShares + metrics.totalSaves;
      const engagementRate =
        metrics.totalReach > 0
          ? Number(((totalInteractions / metrics.totalReach) * 100).toFixed(2))
          : 0;

      // 4. Content & AI Stats
      const [totalIdeas, approvedIdeas, totalScripts, approvedScripts] = await Promise.all([
        ContentIdea.countDocuments(),
        ContentIdea.countDocuments({ status: "approved" }),
        GeneratedScript.countDocuments(),
        GeneratedScript.countDocuments({ status: "approved" }),
      ]);

      // 5. Top performing content
      const topPosts = await SocialPost.find({ status: "published" })
        .sort({ "metrics.reachCount": -1, "metrics.likesCount": -1 })
        .limit(5)
        .select("title mediaType caption metrics permalink publishedAt");

      // 6. Upcoming scheduled posts
      const upcomingPosts = await SocialPost.find({ status: "scheduled" })
        .sort({ scheduledPublishTime: 1 })
        .limit(5)
        .select("title mediaType scheduledPublishTime isAutoPublish");

      // 7. Recent automation executions
      const recentExecutions = await AutomationExecution.find()
        .sort({ startedAt: -1 })
        .limit(5)
        .select("workflowName triggerType status startedAt durationMs itemsProcessed");

      // 8. 7-day Analytics trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSnapshots = await AnalyticsSnapshot.find({
        snapshotDate: { $gte: sevenDaysAgo },
      }).sort({ snapshotDate: 1 });

      res.json({
        success: true,
        data: {
          kpi: {
            publishedPosts: publishedCount,
            scheduledPosts: scheduledCount,
            draftPosts: draftCount,
            failedPosts: failedCount,
            totalReach: metrics.totalReach,
            totalImpressions: metrics.totalImpressions,
            engagementRate,
            followersCount,
            autoPublishEnabled: req.user?.preferences?.autoPublishEnabled || false,
          },
          aiStats: {
            totalIdeas,
            approvedIdeas,
            totalScripts,
            approvedScripts,
          },
          topPerformingPosts: topPosts,
          upcomingScheduledPosts: upcomingPosts,
          recentAutomationExecutions: recentExecutions,
          analyticsTrend: recentSnapshots,
          connectedAccount: connectedAccount
            ? {
                username: connectedAccount.username,
                name: connectedAccount.name,
                followersCount: connectedAccount.followersCount,
                profilePictureUrl: connectedAccount.profilePictureUrl,
                lastSyncedAt: connectedAccount.lastSyncedAt,
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

