import mongoose from "mongoose";
import { SocialPost } from "../models/SocialPost";
import { processPost, recoverPublishing } from "./publishingService";

export class SchedulerService {
  static async processDuePosts() {
    const stats = { processed: 0, published: 0, skipped: 0, failed: 0, processing: 0 };
    if (mongoose.connection.readyState !== 1) return stats;

    const now = new Date();
    await recoverPublishing(now);
    const posts = await SocialPost.find({
      $or: [
        { status: "scheduled", scheduledPublishTime: { $lte: now } },
        { status: "processing", nextAttemptAt: { $lte: now } },
        { status: "publishing", publishSubmittedAt: null, leaseUntil: { $lte: now } },
      ],
    }).sort({ nextAttemptAt: 1, scheduledPublishTime: 1, _id: 1 }).limit(12);

    for (const post of posts) {
      stats.processed++;
      try {
        const status = await processPost(post);
        if (status === "published") stats.published++;
        else if (status === "failed" || status === "review_required") stats.failed++;
        else if (status === "processing") stats.processing++;
        else stats.skipped++;
      } catch {
        stats.failed++;
        console.warn("A publish worker could not complete its database update. The next cycle will recover the lease.");
      }
    }
    return stats;
  }
}

