import { Router, Request, Response } from "express";
import { env } from "../config/env";
import { timingSafeEqual } from "crypto";
import mongoose from "mongoose";
import { SchedulerService } from "../services/schedulerService";

const router = Router();

// POST /api/internal/scheduler/run
router.post("/scheduler/run", async (req: Request, res: Response): Promise<void> => {
  const secretHeader = req.headers["x-scheduler-secret"];
  const expectedSecret = env.SCHEDULER_SECRET;

  if (!expectedSecret || typeof secretHeader !== "string" ||
      Buffer.byteLength(secretHeader) !== Buffer.byteLength(expectedSecret) ||
      !timingSafeEqual(Buffer.from(secretHeader), Buffer.from(expectedSecret))) {
    res.status(401).json({
      success: false,
      error: { message: "Unauthorized: Invalid or missing x-scheduler-secret header." },
    });
    return;
  }
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, error: { message: "Scheduler database is unavailable." } });
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
      error: { message: "Failed to execute scheduler cycle." },
    });
  }
});

export default router;

