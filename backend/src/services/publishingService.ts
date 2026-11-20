import { randomUUID } from "crypto";
import { FilterQuery, Types } from "mongoose";
import { IInstagramAccount, InstagramAccount } from "../models/InstagramAccount";
import { ISocialPost, SocialPost } from "../models/SocialPost";
import { User } from "../models/User";
import { ContentSchedule } from "../models/ContentSchedule";
import { decryptSensitive } from "../utils/encryption";
import { canPublishPage, InstagramService } from "./instagramService";
import { graph, MetaError } from "./metaGraph";
import { checkedMedia, publishCaption } from "./publishInput";

const leaseMs = 120_000;
export const publishableStatuses = ["draft", "review_pending", "approved", "scheduled", "failed"];
const neverSubmitted = { publishSubmittedAt: null, instagramPostId: { $in: ["", null] }, facebookPostId: { $in: ["", null] } };
const digits = /^\d+$/;

export function postAccess(userId: Types.ObjectId): FilterQuery<ISocialPost> {
  return { $or: [{ userId }, { userId: null }] };
}

export async function enqueueManual(postId: string, userId: Types.ObjectId) {
  return SocialPost.findOneAndUpdate({
    _id: postId, ...postAccess(userId), ...neverSubmitted,
    status: { $in: publishableStatuses },
  }, {
    $set: { userId, status: "processing", publishMode: "manual", nextAttemptAt: new Date(), retryCount: 0, errorMessage: "" },
    $unset: { processingDeadline: "", instagramMediaContainerId: "", instagramChildContainerIds: "" },
    $push: { publishingLogs: { timestamp: new Date(), message: "Publication requested by an administrator.", level: "info" } },
  }, { new: true });
}

export async function requirePublishingAccount(userId: Types.ObjectId, id?: Types.ObjectId) {
  return InstagramAccount.findOne({
    userId,
    isConnected: true,
    ...(id ? { _id: id } : {}),
  }).sort({ lastSyncedAt: -1 }).select("+accessTokenEncrypted +pageTokenEncrypted");
}

function pageToken(account: IInstagramAccount) {
  InstagramService.userToken(account);
  if (!account.pageId || !digits.test(account.pageId) || !canPublishPage(account.pageTasks) || !account.pageTokenEncrypted) {
    throw new MetaError("The Facebook Page grant cannot create content. Reconnect with the Page content task.", false, true);
  }
  try { return decryptSensitive(account.pageTokenEncrypted); }
  catch { throw new MetaError("The stored Page grant could not be read. Reconnect the account.", false, true); }
}

async function containerStatus(id: string, token: string) {
  if (!digits.test(id)) throw new MetaError("Invalid Instagram container. Review the post before publishing.");
  const result = await graph<{ status_code?: string }>("GET", "/" + id, { fields: "status_code" }, token);
  if (result.status_code === "ERROR" || result.status_code === "EXPIRED") {
    throw new MetaError("Instagram media processing reported " + result.status_code + ". Check media format and URL.");
  }
  if (result.status_code === "PUBLISHED") {
    throw new MetaError("Instagram reports this container was already published. Check the account before taking further action.", false, false, true);
  }
  if (result.status_code === "FINISHED") return true;
  if (result.status_code === "IN_PROGRESS") return false;
  throw new MetaError("Instagram returned an unknown container status.", true);
}

async function createContainer(id: string, payload: Record<string, string | boolean>, token: string) {
  const result = await graph<{ id?: string }>("POST", "/" + id + "/media", payload, token);
  if (!result.id || !digits.test(result.id)) throw new MetaError("Instagram did not return a media container.", true);
  return result.id;
}

export async function recoverPublishing(now: Date) {
  await SocialPost.updateMany({
    status: "publishing",
    $and: [
      { $or: [{ leaseUntil: { $lte: now } }, { leaseUntil: null }] },
      { $or: [{ publishSubmittedAt: { $type: "date" } }, { publishClaim: null }] },
    ],
  }, {
    $set: { status: "review_required", errorMessage: "Publication outcome is unknown. Check the destination before creating a replacement post." },
    $unset: { publishClaim: "", leaseUntil: "", nextAttemptAt: "" },
  });
}

export async function processPost(candidate: ISocialPost, now = new Date()) {
  const claim = randomUUID();
  const post = await SocialPost.findOneAndUpdate({
    _id: candidate._id, ...neverSubmitted,
    $or: [
      { status: "scheduled", scheduledPublishTime: { $lte: now } },
      { status: "processing", nextAttemptAt: { $lte: now } },
      { status: "publishing", leaseUntil: { $lte: now }, publishClaim: { $type: "string" } },
    ],
  }, {
    $set: { status: "publishing", publishClaim: claim, leaseUntil: new Date(now.getTime() + leaseMs) },
  }, { new: true });
  if (!post) return "skipped";

  const lock = { _id: post._id, status: "publishing", publishClaim: claim };
  const manual = post.publishMode === "manual";
  let submitted = false;
  let account: IInstagramAccount | null = null;

  const checkpoint = async (fields: Record<string, unknown>) => {
    const update = await SocialPost.updateOne({ ...lock, leaseUntil: { $gt: new Date() } }, {
      $set: { ...fields, leaseUntil: new Date(Date.now() + leaseMs) },
    });
    if (!update.matchedCount) throw new Error("Publishing lease expired.");
  };
  const finish = async (
    status: ISocialPost["status"], message: string, fields: Record<string, unknown> = {}, clearSubmission = false,
  ) => {
    const update = await SocialPost.updateOne(lock, {
      $set: { status, errorMessage: ["failed", "review_required", "review_pending"].includes(status) ? message : "", ...fields },
      $unset: { publishClaim: "", leaseUntil: "", ...(fields.nextAttemptAt ? {} : { nextAttemptAt: "" }),
        ...(clearSubmission ? { publishSubmittedAt: "" } : {}) },
      $push: { publishingLogs: { timestamp: new Date(), message, level: status === "failed" || status === "review_required" ? "error" : "info" } },
    });
    if (update.matchedCount && status !== "processing") {
      const scheduleStatus = status === "published" ? "completed" : status === "review_pending" ? "cancelled" : "failed";
      await ContentSchedule.updateMany({ socialPostId: post._id }, { $set: { status: scheduleStatus } }).catch(() => {
        console.warn("Could not update the calendar projection after saving publication state.");
      });
    }
    return update.matchedCount ? status : "skipped";
  };

  try {
    const owner = post.userId ? await User.findById(post.userId) : null;
    if (!owner?.isActive || owner.role !== "admin" ||
        (!manual && (!post.isAutoPublish || !owner.preferences.autoPublishEnabled))) {
      return finish("review_pending", "An active administrator must approve this post or enable automatic publishing.");
    }
    const media = checkedMedia({
      destination: post.destination, mediaType: post.mediaType, caption: post.caption, hashtags: post.hashtags,
      mediaUrl: post.mediaUrl, coverImageUrl: post.coverImageUrl, mediaItems: post.mediaItems,
    });
    account = await requirePublishingAccount(owner._id as Types.ObjectId, post.instagramAccountId);
    if (!account) throw new MetaError("Connect the configured Instagram account and Facebook Page before publishing.", false, true);
    const token = pageToken(account);
    await checkpoint({ instagramAccountId: account._id });
    const caption = publishCaption(media.caption, media.hashtags);
    let endpoint: string;
    let payload: Record<string, string>;
    let containerId = post.instagramMediaContainerId;

    if (media.destination === "facebook") {
      const photo = media.mediaType === "IMAGE";
      endpoint = "/" + account.pageId + (photo ? "/photos" : "/feed");
      payload = photo ? { url: media.mediaUrl, caption } : { message: caption };
    } else {
      const id = account.instagramId;
      if (!digits.test(id)) throw new MetaError("The stored Instagram account ID is invalid. Reconnect.");
      const deadline = post.processingDeadline || new Date(Date.now() + 30 * 60_000);
      if (deadline.getTime() <= Date.now()) throw new MetaError("Instagram media processing timed out. Check the media before retrying.");
      const defer = () => finish("processing", "Instagram is processing the media.",
        { nextAttemptAt: new Date(Date.now() + 60_000), processingDeadline: deadline });

      if (!containerId && media.mediaType === "CAROUSEL") {
        const children = [...post.instagramChildContainerIds];
        for (const item of media.mediaItems.slice(children.length, children.length + 3)) {
          const params: Record<string, string> = item.type === "IMAGE" ? { image_url: item.url } : { media_type: "VIDEO", video_url: item.url };
          children.push(await createContainer(id, { ...params, is_carousel_item: true }, token));
          await checkpoint({ instagramChildContainerIds: children, processingDeadline: deadline });
        }
        if (children.length < media.mediaItems.length) return defer();
        for (const child of children) {
          if (!await containerStatus(child, token)) return defer();
          await checkpoint({});
        }
        containerId = await createContainer(id, { media_type: "CAROUSEL", children: children.join(","), caption }, token);
      } else if (!containerId) {
        const params: Record<string, string | boolean> = media.mediaType === "IMAGE" ? { image_url: media.mediaUrl }
          : { media_type: "REELS", video_url: media.mediaUrl, share_to_feed: true,
            ...(media.coverImageUrl && { cover_url: media.coverImageUrl }) };
        containerId = await createContainer(id, { ...params, caption }, token);
      }
      await checkpoint({ instagramMediaContainerId: containerId, processingDeadline: deadline });
      if (!await containerStatus(containerId, token)) return defer();
      endpoint = "/" + id + "/media_publish";
      payload = { creation_id: containerId };
    }

    const stillAuthorized = await InstagramAccount.exists({
      _id: account._id, isConnected: true, accessTokenEncrypted: account.accessTokenEncrypted,
      tokenExpiresAt: { $gt: new Date() },
    });
    const ownerStillAuthorized = await User.exists({
      _id: owner._id, isActive: true, role: "admin",
      ...(!manual && { "preferences.autoPublishEnabled": true }),
    });
    if (!stillAuthorized || !ownerStillAuthorized) throw new MetaError("Publishing authorization changed. Review the post and reconnect.", false, true);

    await checkpoint({ publishSubmittedAt: new Date() });
    submitted = true;
    const result = await graph<{ id?: string; post_id?: string }>("POST", endpoint, payload, token);
    const remoteId = result.post_id || result.id;
    if (!remoteId || !/^[\d_]+$/.test(remoteId)) {
      throw new MetaError("Meta did not return a confirmed post ID. Check the destination.", false, false, true);
    }
    const fields = media.destination === "facebook" ? { facebookPostId: remoteId } : { instagramPostId: remoteId };
    const status = await finish("published", "Publication confirmed by Meta.", { ...fields, publishedAt: new Date() });
    if (status === "published") {
      try {
        const { permalink, permalink_url } = await graph<{ permalink?: string; permalink_url?: string }>(
          "GET", "/" + remoteId, { fields: media.destination === "facebook" ? "permalink_url" : "permalink" }, token,
        );
        const link = permalink || permalink_url;
        if (link && /^https:\/\/(?:www\.)?(?:facebook|instagram)\.com\//i.test(link)) {
          await SocialPost.updateOne({ _id: post._id, status: "published" }, { $set: { permalink: link } });
        }
      } catch { /* The post ID was saved before requesting the optional permalink. */ }
    }
    return status;
  } catch (error) {
    if (!(error instanceof MetaError)) {
      // Leave the durable lease and submission marker for recovery after database or worker failures.
      throw error;
    }
    if (error.authorization && account) {
      await InstagramService.invalidateGrant(account);
    }
    if ((submitted && error.uncertain) || (!submitted && !error.retryable && error.uncertain)) {
      return finish("review_required", error.message + " Verify the destination before publishing again.");
    }
    const retryCount = (post.retryCount || 0) + 1;
    if (error.retryable && retryCount < 4) {
      return finish("processing", error.message, {
        retryCount, nextAttemptAt: new Date(Date.now() + 60_000 * 2 ** (retryCount - 1)),
      }, submitted);
    }
    return finish("failed", error.message, { retryCount }, submitted);
  }
}

