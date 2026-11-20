import { Router, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { SocialPost, postStatuses } from "../models/SocialPost";
import { ContentSchedule } from "../models/ContentSchedule";
import { objectId, publishInput, publishTime, validateMedia, mediaTypes } from "../services/publishInput";
import { enqueueManual, postAccess, requirePublishingAccount } from "../services/publishingService";

const router = Router();
router.use(authenticateToken, requireRole(["admin"]));
router.param("id", (req, res, next, value) => {
  if (objectId.safeParse(value).success) next();
  else res.status(400).json({ success: false, error: { message: "Invalid post ID." } });
});

const schema = publishInput.extend({
  title: z.string().trim().min(2).max(200),
  scriptId: objectId.optional(),
  instagramAccountId: objectId.optional(),
  scheduledPublishTime: publishTime.optional(),
  isAutoPublish: z.boolean().default(false),
}).strict().superRefine((input, context) => {
  const issue = validateMedia(input);
  if (issue) context.addIssue({ code: "custom", message: issue });
  if (input.scheduledPublishTime && Date.parse(input.scheduledPublishTime) <= Date.now()) {
    context.addIssue({ code: "custom", message: "Choose a future publishing time.", path: ["scheduledPublishTime"] });
  }
});

const listQuery = z.object({
  status: z.enum(postStatuses).optional(),
  mediaType: z.enum(mediaTypes).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: "Invalid publishing history filters." } });
      return;
    }
    const { status, mediaType, page, limit } = parsed.data;
    const query = { ...postAccess(req.user!._id as Types.ObjectId), ...(status && { status }), ...(mediaType && { mediaType }) };
    const [posts, total] = await Promise.all([
      SocialPost.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate("instagramAccountId", "username name profilePictureUrl")
        .populate("scriptId", "reelTitle openingHook"),
      SocialPost.countDocuments(query),
    ]);
    res.json({ success: true, data: { posts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const post = await SocialPost.findOne({ _id: req.params.id, ...postAccess(req.user!._id as Types.ObjectId) })
      .populate("instagramAccountId", "username name profilePictureUrl").populate("scriptId");
    if (!post) {
      res.status(404).json({ success: false, error: { message: "Post not found." } });
      return;
    }
    res.json({ success: true, data: { post } });
  } catch (error) { next(error); }
});

router.post("/", validate(schema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { scheduledPublishTime, instagramAccountId, isAutoPublish, ...input } = req.body as z.infer<typeof schema>;
    const userId = req.user!._id as Types.ObjectId;
    const idempotencyKey = req.get("Idempotency-Key");
    if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) {
      res.status(400).json({ success: false, error: { message: "Invalid idempotency key." } });
      return;
    }
    const id = idempotencyKey
      ? new Types.ObjectId(createHash("sha256").update(userId.toString() + ":" + idempotencyKey).digest("hex").slice(0, 24))
      : new Types.ObjectId();
    const existing = idempotencyKey ? await SocialPost.findOne({ _id: id, userId }) : null;
    if (existing) {
      res.json({ success: true, data: { post: existing } });
      return;
    }
    const account = await requirePublishingAccount(userId, instagramAccountId ? new Types.ObjectId(instagramAccountId) : undefined);
    if (instagramAccountId && !account) {
      res.status(400).json({ success: false, error: { message: "Choose a connected account that you authorized." } });
      return;
    }
    const scheduledDate = scheduledPublishTime ? new Date(scheduledPublishTime) : undefined;
    let post;
    try {
      post = await SocialPost.create({
        ...input, _id: id, userId, instagramAccountId: account?._id, scheduledPublishTime: scheduledDate,
        status: scheduledDate ? "scheduled" : "draft",
        isAutoPublish: Boolean(scheduledDate && account && isAutoPublish && req.user!.preferences.autoPublishEnabled),
      });
    } catch (error) {
      if (!idempotencyKey || (error as { code?: number }).code !== 11000) throw error;
      const existing = await SocialPost.findOne({ _id: id, userId });
      if (!existing) throw error;
      res.json({ success: true, data: { post: existing } });
      return;
    }
    if (scheduledDate) {
      await ContentSchedule.create({
        socialPostId: post._id, scriptId: input.scriptId, targetPublishTime: scheduledDate, status: "scheduled",
      }).catch(() => console.warn("Could not create the calendar projection. The saved post remains scheduled."));
    }
    res.status(201).json({ success: true, data: { post } });
  } catch (error) { next(error); }
});

router.post("/:id/publish-now", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id as Types.ObjectId;
    const post = await enqueueManual(req.params.id, userId);
    if (!post) {
      res.status(409).json({ success: false, error: { message: "This post cannot be queued. Check its current publishing status." } });
      return;
    }
    res.status(202).json({ success: true, data: { post, message: "Publication queued." } });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const post = await SocialPost.findOneAndDelete({
      _id: req.params.id, ...postAccess(req.user!._id as Types.ObjectId),
      status: { $in: ["draft", "approved", "review_pending", "scheduled", "failed"] },
      publishSubmittedAt: null, instagramPostId: { $in: [null, ""] }, facebookPostId: { $in: [null, ""] },
    });
    if (!post) {
      res.status(409).json({ success: false, error: { message: "Only posts with no publish attempt in progress or confirmed publication can be deleted." } });
      return;
    }
    await ContentSchedule.deleteMany({ socialPostId: post._id });
    res.json({ success: true, data: { message: "Post deleted." } });
  } catch (error) { next(error); }
});

export default router;

