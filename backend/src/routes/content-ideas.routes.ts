import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ContentIdea } from "../models/ContentIdea";
import { GeneratedScript } from "../models/GeneratedScript";
import { AIService } from "../services/aiService";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

const createIdeaSchema = z.object({
  topic: z.string().min(2),
  title: z.string().min(3),
  hook: z.string().min(3),
  summary: z.string().optional(),
  targetFormat: z.enum(["REEL", "CAROUSEL", "STORY", "POST"]).default("REEL"),
  angle: z.string().optional(),
  estimatedDurationSeconds: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "scripted"]),
  rejectionReason: z.string().optional(),
});

// GET /api/content-ideas
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, topic, search, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (status) query.status = status;
      if (topic) query.topic = topic;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { hook: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [ideas, total] = await Promise.all([
        ContentIdea.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        ContentIdea.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          ideas,
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

// POST /api/content-ideas
router.post(
  "/",
  authenticateToken,
  validate(createIdeaSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idea = await ContentIdea.create(req.body);
      res.status(201).json({
        success: true,
        data: { idea },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/content-ideas/:id/status
router.put(
  "/:id/status",
  authenticateToken,
  validate(updateStatusSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      const idea = await ContentIdea.findById(id);
      if (!idea) {
        res.status(404).json({ success: false, error: { message: "Content idea not found" } });
        return;
      }

      idea.status = status;
      if (status === "approved") {
        idea.approvedAt = new Date();
      } else if (status === "rejected") {
        idea.rejectionReason = rejectionReason || "";
      }

      await idea.save();

      await ActivityLog.create({
        action: `CONTENT_IDEA_${status.toUpperCase()}`,
        performedBy: req.user!.email,
        entityType: "ContentIdea",
        entityId: idea._id.toString(),
        status: "success",
      });

      res.json({
        success: true,
        data: { idea },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/content-ideas/:id/create-script
router.post(
  "/:id/create-script",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { provider, model, language = "Hinglish" } = req.body;

      const idea = await ContentIdea.findById(id);
      if (!idea) {
        res.status(404).json({ success: false, error: { message: "Content idea not found" } });
        return;
      }

      // Generate script using AIService
      const generated = await AIService.generateReelScript({
        topic: idea.topic,
        reelTitle: idea.title,
        targetFormat: idea.targetFormat,
        language,
        targetDurationSeconds: idea.estimatedDurationSeconds,
        customInstructions: `Hook preference: ${idea.hook}. Angle: ${idea.angle}`,
        provider,
        model,
      });

      const script = await GeneratedScript.create({
        contentIdeaId: idea._id,
        topic: idea.topic,
        reelTitle: generated.reelTitle,
        format: idea.targetFormat,
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

      idea.status = "scripted";
      idea.generatedScriptId = script._id as any;
      await idea.save();

      res.status(201).json({
        success: true,
        data: { script },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/content-ideas/:id
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await ContentIdea.findByIdAndDelete(id);
      res.json({ success: true, data: { message: "Content idea deleted successfully" } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

