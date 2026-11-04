import mongoose from "mongoose";
import { SocialPost, ISocialPost } from "../models/SocialPost";
import { ContentSchedule } from "../models/ContentSchedule";
import { AutomationExecution } from "../models/AutomationExecution";
import { ActivityLog } from "../models/ActivityLog";
import { InstagramService } from "./instagramService";

export class SchedulerService {
  /**
   * Evaluates due scheduled posts and publishes them safely if permitted
   */
  public static async processDuePosts(): Promise<{
    processed: number;
    published: number;
    skipped: number;
    failed: number;
  }> {
    const stats = { processed: 0, published: 0, skipped: 0, failed: 0 };

    // Guard: strictly do not execute database operations if MongoDB is disconnected
    if (mongoose.connection.readyState !== 1) {
      return stats;
    }

    const now = new Date();

    // 1. Find posts that are scheduled and due
    const duePosts = await SocialPost.find({
      status: "scheduled",
      scheduledPublishTime: { $lte: now },
    }).populate("instagramAccountId");

    if (duePosts.length === 0) {
      return stats;
    }

    const executionLog = await AutomationExecution.create({
      workflowName: "Workflow D — Content Publishing",
      triggerType: "scheduled",
      status: "running",
      startedAt: new Date(),
      logs: [{ timestamp: new Date(), message: `Found ${duePosts.length} due posts to process.`, level: "info" }],
    });

    for (const post of duePosts) {
      stats.processed++;

      // STRICT SAFETY GUARDRAIL:
      // "IMPORTANT: Never publish content automatically unless the user explicitly enables auto-publishing."
      if (!post.isAutoPublish) {
        post.status = "review_pending";
        post.publishingLogs.push({
          timestamp: new Date(),
          message: "Auto-publishing is NOT enabled for this post. Marked as review_pending for human approval.",
          level: "info",
        });
        await post.save();
        stats.skipped++;
        continue;
      }

      // Atomic lock: Transition to 'publishing' to prevent duplicate execution
      const lockedPost = await SocialPost.findOneAndUpdate(
        { _id: post._id, status: "scheduled" },
        {
          $set: { status: "publishing" },
          $push: {
            publishingLogs: {
              timestamp: new Date(),
              message: "Publishing initiated by automation scheduler.",
              level: "info",
            },
          },
        },
        { new: true }
      );

      if (!lockedPost) {
        // Post was already picked up by another concurrent run
        stats.skipped++;
        continue;
      }

      try {
        if (!lockedPost.instagramAccountId) {
          throw new Error("No connected Instagram account assigned to this post.");
        }

        // Call Instagram Graph API
        const publishResult = await InstagramService.publishReel({
          accountId: lockedPost.instagramAccountId.toString(),
          mediaType: lockedPost.mediaType as any,
          mediaUrl: lockedPost.mediaUrl,
          caption: `${lockedPost.caption}\n\n${lockedPost.hashtags.join(" ")}`,
          coverImageUrl: lockedPost.coverImageUrl,
        });

        if (publishResult.success) {
          lockedPost.status = "published";
          lockedPost.publishedAt = new Date();
          lockedPost.instagramPostId = publishResult.instagramPostId;
          lockedPost.permalink = publishResult.permalink;
          lockedPost.errorMessage = "";
          lockedPost.publishingLogs.push({
            timestamp: new Date(),
            message: `Successfully published: ID ${publishResult.instagramPostId}`,
            level: "info",
          });
          await lockedPost.save();

          // Update Schedule status
          await ContentSchedule.updateMany(
            { socialPostId: lockedPost._id },
            { $set: { status: "completed" } }
          );

          await ActivityLog.create({
            action: "INSTAGRAM_POST_PUBLISHED",
            performedBy: "Scheduler Automation",
            entityType: "SocialPost",
            entityId: lockedPost._id.toString(),
            details: { instagramPostId: publishResult.instagramPostId },
            status: "success",
          });

          stats.published++;
        } else {
          throw new Error(publishResult.error || publishResult.statusMessage);
        }
      } catch (postErr: any) {
        lockedPost.retryCount += 1;
        lockedPost.errorMessage = postErr.message;
        lockedPost.status = lockedPost.retryCount >= 3 ? "failed" : "scheduled";
        lockedPost.publishingLogs.push({
          timestamp: new Date(),
          message: `Publishing failed: ${postErr.message}. Retry count: ${lockedPost.retryCount}`,
          level: "error",
        });
        await lockedPost.save();

        stats.failed++;

        await ActivityLog.create({
          action: "INSTAGRAM_POST_PUBLISH_FAILED",
          performedBy: "Scheduler Automation",
          entityType: "SocialPost",
          entityId: lockedPost._id.toString(),
          details: { error: postErr.message },
          status: "failure",
        });
      }
    }

    executionLog.status = stats.failed > 0 ? "failed" : "completed";
    executionLog.finishedAt = new Date();
    executionLog.durationMs = Date.now() - executionLog.startedAt.getTime();
    executionLog.itemsProcessed = stats.processed;
    executionLog.payloadSummary = `Processed: ${stats.processed}, Published: ${stats.published}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`;
    await executionLog.save();

    return stats;
  }
}

