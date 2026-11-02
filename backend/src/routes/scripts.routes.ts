import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { GeneratedScript } from "../models/GeneratedScript";
import { SocialPost } from "../models/SocialPost";
import { AIService } from "../services/aiService";
import { ActivityLog } from "../models/ActivityLog";
import { Notification } from "../models/Notification";

const router = Router();

const generateScriptSchema = z.object({
  topic: z.string().min(2, "Topic is required"),
  reelTitle: z.string().optional(),
  format: z.enum(["REEL", "CAROUSEL", "STORY", "POST"]).default("REEL"),
  language: z.enum(["Hinglish", "Hindi", "English"]).default("Hinglish"),
  targetDurationSeconds: z.number().min(15).max(90).default(45),
  customInstructions: z.string().optional(),
  provider: z.enum(["gemini", "openai", "openrouter"]).optional(),
  model: z.string().optional(),
});

const updateScriptSchema = z.object({
  reelTitle: z.string().optional(),
  openingHook: z.string().optional(),
  fullVoiceover: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional(),
  scenes: z.array(z.any()).optional(),
  onScreenSummary: z.array(z.string()).optional(),
  suggestedDurationSeconds: z.number().optional(),
});

// GET /api/scripts
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, format, topic, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (status) query.status = status;
      if (format) query.format = format;
      if (topic) query.topic = topic;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [scripts, total] = await Promise.all([
        GeneratedScript.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        GeneratedScript.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          scripts,
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

// GET /api/scripts/:id
router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const script = await GeneratedScript.findById(req.params.id);
      if (!script) {
        res.status(404).json({ success: false, error: { message: "Script not found" } });
        return;
      }
      res.json({ success: true, data: { script } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/scripts/generate
router.post(
  "/generate",
  authenticateToken,
  validate(generateScriptSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        topic,
        reelTitle,
        format,
        language,
        targetDurationSeconds,
        customInstructions,
        provider,
        model,
      } = req.body;

      const generated = await AIService.generateReelScript({
        topic,
        reelTitle,
        targetFormat: format,
        language,
        targetDurationSeconds,
        customInstructions,
        provider,
        model,
      });

      const script = await GeneratedScript.create({
        topic,
        reelTitle: generated.reelTitle,
        format,
        language,
        openingHook: generated.openingHook,
        scenes: generated.scenes,
        fullVoiceover: generated.fullVoiceover,
        onScreenSummary: generated.onScreenSummary,
        caption: generated.caption,
        hashtags: generated.hashtags,
        cta: generated.cta,
        suggestedDurationSeconds: generated.suggestedDurationSeconds,
        aiProvider: generated.providerUsed,
        aiModel: generated.modelUsed,
        status: "draft",
      });

      await ActivityLog.create({
        action: "AI_SCRIPT_GENERATED",
        performedBy: req.user!.email,
        entityType: "GeneratedScript",
        entityId: script._id.toString(),
        details: { topic, provider: generated.providerUsed, model: generated.modelUsed },
        status: "success",
      });

      res.status(201).json({
        success: true,
        data: { script },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/scripts/:id
router.put(
  "/:id",
  authenticateToken,
  validate(updateScriptSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const script = await GeneratedScript.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!script) {
        res.status(404).json({ success: false, error: { message: "Script not found" } });
        return;
      }
      res.json({ success: true, data: { script } });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/scripts/:id/status
router.put(
  "/:id/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, feedback } = req.body;
      const script = await GeneratedScript.findById(req.params.id);
      if (!script) {
        res.status(404).json({ success: false, error: { message: "Script not found" } });
        return;
      }

      script.status = status;
      if (status === "approved") {
        script.approvedAt = new Date();
      }
      if (feedback) {
        script.userFeedback = feedback;
      }
      await script.save();

      await Notification.create({
        title: `Script ${status.toUpperCase()}`,
        message: `Script "${script.reelTitle}" was marked as ${status}.`,
        type: status === "approved" ? "success" : "info",
        relatedEntityId: script._id,
        relatedEntityType: "GeneratedScript",
      });

      res.json({ success: true, data: { script } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/scripts/:id/create-post
router.post(
  "/:id/create-post",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const script = await GeneratedScript.findById(req.params.id);
      if (!script) {
        res.status(404).json({ success: false, error: { message: "Script not found" } });
        return;
      }

      const { mediaUrl, coverImageUrl, scheduledPublishTime, isAutoPublish = false } = req.body;

      const post = await SocialPost.create({
        scriptId: script._id,
        mediaType: script.format === "REEL" ? "REELS" : "VIDEO",
        title: script.reelTitle,
        caption: `${script.caption}\n\n${script.cta}`,
        hashtags: script.hashtags,
        mediaUrl: mediaUrl || "https://res.cloudinary.com/demo/video/upload/sample.mp4",
        coverImageUrl: coverImageUrl || "",
        status: scheduledPublishTime ? "scheduled" : "draft",
        isAutoPublish: isAutoPublish && (req.user?.preferences?.autoPublishEnabled || false),
        scheduledPublishTime: scheduledPublishTime ? new Date(scheduledPublishTime) : undefined,
      });

      script.socialPostId = post._id as any;
      if (post.status === "scheduled") {
        script.status = "scheduled";
      }
      await script.save();

      res.status(201).json({
        success: true,
        data: { post },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
