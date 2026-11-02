import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { SocialPost } from "../models/SocialPost";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";
import { InstagramAccount } from "../models/InstagramAccount";

const router = Router();

// GET /api/analytics/overview
router.get(
  "/overview",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { range = "30d" } = req.query as Record<string, string>;
      const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Aggregated post stats
      const posts = await SocialPost.find({
        status: "published",
        publishedAt: { $gte: startDate },
      }).sort({ publishedAt: -1 });

      const totals = posts.reduce(
        (acc, p) => {
          acc.reach += p.metrics?.reachCount || 0;
          acc.impressions += p.metrics?.impressionsCount || 0;
          acc.likes += p.metrics?.likesCount || 0;
          acc.comments += p.metrics?.commentsCount || 0;
          acc.shares += p.metrics?.sharesCount || 0;
          acc.saves += p.metrics?.savesCount || 0;
          return acc;
        },
        { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
      );

      const account = await InstagramAccount.findOne({ isConnected: true });

      // Daily breakdown for charts
      const dailyBreakdown: Record<string, { date: string; reach: number; impressions: number; posts: number }> = {};

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyBreakdown[dateStr] = { date: dateStr, reach: 0, impressions: 0, posts: 0 };
      }

      for (const p of posts) {
        if (p.publishedAt) {
          const dateStr = p.publishedAt.toISOString().split("T")[0];
          if (dailyBreakdown[dateStr]) {
            dailyBreakdown[dateStr].reach += p.metrics?.reachCount || 0;
            dailyBreakdown[dateStr].impressions += p.metrics?.impressionsCount || 0;
            dailyBreakdown[dateStr].posts += 1;
          }
        }
      }

      res.json({
        success: true,
        data: {
          range,
          totals: {
            ...totals,
            postsCount: posts.length,
            followers: account?.followersCount || 0,
            avgEngagementRate:
              totals.reach > 0
                ? Number((((totals.likes + totals.comments + totals.shares + totals.saves) / totals.reach) * 100).toFixed(2))
                : 0,
          },
          chartData: Object.values(dailyBreakdown),
          topPosts: posts.slice(0, 5),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

