import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { AutomationExecution } from "../models/AutomationExecution";
import { SchedulerService } from "../services/schedulerService";
import { ResearchService } from "../services/researchService";
import { AIService } from "../services/aiService";
import { ContentIdea } from "../models/ContentIdea";
import { GeneratedScript } from "../models/GeneratedScript";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

// GET /api/automation/executions
router.get(
  "/executions",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (status) query.status = status;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [executions, total] = await Promise.all([
        AutomationExecution.find(query).sort({ startedAt: -1 }).skip(skip).limit(limitNum),
        AutomationExecution.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          executions,
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

// POST /api/automation/trigger/:workflowCode
router.post(
  "/trigger/:workflowCode",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { workflowCode } = req.params;
    const startTime = Date.now();

    try {
      if (workflowCode === "workflow-a-research") {
        const execution = await AutomationExecution.create({
          workflowName: "Workflow A — Daily Content Research",
          triggerType: "manual",
          status: "running",
          startedAt: new Date(),
          logs: [{ timestamp: new Date(), message: "Daily Research workflow triggered manually.", level: "info" }],
        });

        const topics = req.user?.preferences?.targetTopics?.slice(0, 2) || ["Artificial Intelligence", "ChatGPT & LLMs"];
        let totalFound = 0;

        for (const topic of topics) {
          const articles = await ResearchService.discoverTrending(topic);
          totalFound += articles.length;
          execution.logs.push({
            timestamp: new Date(),
            message: `Discovered ${articles.length} articles for topic: ${topic}`,
            level: "info",
          });
        }

        execution.status = "completed";
        execution.finishedAt = new Date();
        execution.durationMs = Date.now() - startTime;
        execution.itemsProcessed = totalFound;
        execution.payloadSummary = `Discovered ${totalFound} new articles across topics.`;
        await execution.save();

        res.json({ success: true, data: { execution } });
        return;
      }

      if (workflowCode === "workflow-b-script-generation") {
        const execution = await AutomationExecution.create({
          workflowName: "Workflow B — AI Script Generation",
          triggerType: "manual",
          status: "running",
          startedAt: new Date(),
          logs: [{ timestamp: new Date(), message: "AI Script Generation batch triggered.", level: "info" }],
        });

        const pendingIdeas = await ContentIdea.find({ status: "approved" }).limit(3);
        let scriptsGenerated = 0;

        for (const idea of pendingIdeas) {
          const generated = await AIService.generateReelScript({
            topic: idea.topic,
            reelTitle: idea.title,
            targetFormat: idea.targetFormat,
            language: "Hinglish",
          });

          const script = await GeneratedScript.create({
            contentIdeaId: idea._id,
            topic: idea.topic,
            reelTitle: generated.reelTitle,
            format: idea.targetFormat,
            language: "Hinglish",
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
          scriptsGenerated++;
        }

        execution.status = "completed";
        execution.finishedAt = new Date();
        execution.durationMs = Date.now() - startTime;
        execution.itemsProcessed = scriptsGenerated;
        execution.payloadSummary = `Generated ${scriptsGenerated} AI Reel scripts.`;
        await execution.save();

        res.json({ success: true, data: { execution } });
        return;
      }

      if (workflowCode === "workflow-d-publishing") {
        const result = await SchedulerService.processDuePosts();
        res.json({ success: true, data: { result } });
        return;
      }

      res.status(400).json({
        success: false,
        error: { message: `Unknown workflow code: ${workflowCode}` },
      });
    } catch (err: any) {
      next(err);
    }
  }
);

export default router;
