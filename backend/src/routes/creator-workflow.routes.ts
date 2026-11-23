import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { authenticateToken, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreatorWorkflow } from "../models/CreatorWorkflow";
import { CreatorWorkflowService } from "../services/creatorWorkflowService";
import { VoiceoverService } from "../services/voiceoverService";
import { env } from "../config/env";

const router = Router();
router.use(authenticateToken, requireRole(["admin"]));

const startSchema = z.object({
  idempotencyKey: z.string().uuid(),
  topic: z.string().trim().max(160).optional().default(""),
  niche: z.string().trim().min(3).max(200).optional().default(env.CREATOR_NICHE),
  voiceId: z.string().optional().default("hi-IN-MadhurNeural"),
  videoStyle: z.string().optional().default("motion-graphics"),
}).strict();

router.post("/start", validate(startSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { idempotencyKey, topic, niche, voiceId, videoStyle } = req.body;
    const job = await CreatorWorkflowService.start(String(req.user!._id), idempotencyKey, topic, niche, voiceId, videoStyle);
    if (job.status === "queued") CreatorWorkflowService.runInBackground(String(job._id));
    res.status(202).json({ success: true, data: { workflow: job } });
  } catch (error) { next(error); }
});

router.get("/voices", async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: { voices: VoiceoverService.VOICES } });
});

router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workflows = await CreatorWorkflow.find({ userId: req.user!._id })
      .sort({ createdAt: -1 }).limit(10)
      .populate("scriptId", "reelTitle openingHook fullVoiceover caption hashtags scenes suggestedDurationSeconds")
      .select("niche requestedTopic topic topicRationale videoStyle voiceId status stageMessage scenes clips research mediaUrl coverImageUrl errorMessage scriptId mediaAssetId createdAt updatedAt");
    workflows.filter((workflow) => workflow.status === "queued").forEach((workflow) => CreatorWorkflowService.runInBackground(String(workflow._id)));
    res.json({ success: true, data: { workflows } });
  } catch (error) { next(error); }
});

router.get("/readiness", async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await CreatorWorkflowService.checkReadiness() });
  } catch (error) { next(error); }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { message: "Invalid creator workflow ID." } });
      return;
    }
    const workflow = await CreatorWorkflow.findOne({ _id: req.params.id, userId: req.user!._id })
      .populate("scriptId", "reelTitle openingHook fullVoiceover caption hashtags scenes suggestedDurationSeconds")
      .populate("mediaAssetId", "url title sizeBytes durationSeconds");
    if (!workflow) {
      res.status(404).json({ success: false, error: { message: "Creator workflow not found." } });
      return;
    }
    res.json({ success: true, data: { workflow } });
  } catch (error) { next(error); }
});

export default router;
