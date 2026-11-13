import { Router, Request, Response } from "express";
import { env } from "../config/env";
import { SchedulerService } from "../services/schedulerService";

const router = Router();

// POST /api/internal/scheduler/run
router.post("/scheduler/run", async (req: Request, res: Response): Promise<void> => {
  const secretHeader = req.headers["x-scheduler-secret"];
  const expectedSecret = process.env.SCHEDULER_SECRET || env.SCHEDULER_SECRET;

  if (!secretHeader || secretHeader !== expectedSecret) {
    res.status(401).json({
      success: false,
      error: { message: "Unauthorized: Invalid or missing x-scheduler-secret header." },
    });
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const stats = await SchedulerService.processDuePosts();
    res.json({
      success: true,
      message: "Publishing scheduler cycle completed.",
      timestamp,
      stats,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { message: err.message || "Failed to execute scheduler cycle." },
    });
  }
});

export default router;
