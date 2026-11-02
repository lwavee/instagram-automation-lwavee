import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ResearchArticle } from "../models/ResearchArticle";
import { ResearchService } from "../services/researchService";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

const discoverSchema = z.object({
  topic: z.string().min(2, "Topic is required"),
  keywords: z.array(z.string()).optional(),
});

// GET /api/research/topics
router.get("/topics", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const defaultTopics = [
    "Artificial Intelligence",
    "ChatGPT & LLMs",
    "Gemini & Claude",
    "AI Tools & Automation",
    "Technology Updates",
    "Cyber Security",
    "Digital Marketing",
    "Web Development",
    "Programming Hacks",
    "Productivity Tools",
  ];

  const userTopics = req.user?.preferences?.targetTopics || [];
  const mergedTopics = Array.from(new Set([...defaultTopics, ...userTopics]));

  res.json({
    success: true,
    data: { topics: mergedTopics },
  });
});

// POST /api/research/discover
router.post(
  "/discover",
  authenticateToken,
  validate(discoverSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { topic, keywords } = req.body;
      const discovered = await ResearchService.discoverTrending(topic, keywords);

      await ActivityLog.create({
        action: "RESEARCH_DISCOVERY_EXECUTED",
        performedBy: req.user!.email,
        entityType: "ResearchArticle",
        details: { topic, count: discovered.length },
        status: "success",
      });

      res.json({
        success: true,
        data: {
          topic,
          articlesFound: discovered.length,
          articles: discovered,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/research/articles
router.get(
  "/articles",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { topic, isUsed, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (topic) query.topic = topic;
      if (isUsed !== undefined) query.isUsed = isUsed === "true";

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [articles, total] = await Promise.all([
        ResearchArticle.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        ResearchArticle.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          articles,
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

// POST /api/research/articles/:id/generate-ideas
router.post(
  "/articles/:id/generate-ideas",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const ideas = await ResearchService.generateIdeasFromArticle(id);

      res.json({
        success: true,
        data: {
          ideasGeneratedCount: ideas.length,
          ideas,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

