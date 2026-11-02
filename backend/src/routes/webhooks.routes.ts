import { Router, Request, Response, NextFunction } from "express";
import { verifyN8nWebhook } from "../middleware/n8nWebhookAuth";
import { AutomationExecution } from "../models/AutomationExecution";
import { Notification } from "../models/Notification";
import { SchedulerService } from "../services/schedulerService";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

// POST /api/webhooks/n8n
router.post(
  "/n8n",
  verifyN8nWebhook,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { action, workflowName, executionId, payload, error } = req.body;

      if (action === "publish_due_posts") {
        const stats = await SchedulerService.processDuePosts();
        res.json({ success: true, data: { action, stats } });
        return;
      }

      if (action === "workflow_error" || error) {
        const errorMessage = error?.message || "n8n automation workflow reported an execution failure";
        await AutomationExecution.create({
          workflowName: workflowName || "n8n Workflow Execution",
          workflowId: executionId,
          triggerType: "webhook",
          status: "failed",
          errorDetails: {
            message: errorMessage,
            details: JSON.stringify(error || {}),
          },
          startedAt: new Date(),
          finishedAt: new Date(),
          logs: [{ timestamp: new Date(), message: errorMessage, level: "error" }],
        });

        await Notification.create({
          title: "n8n Automation Error",
          message: errorMessage,
          type: "error",
        });

        res.json({ success: true, data: { status: "error_logged" } });
        return;
      }

      // Record successful webhook execution
      await AutomationExecution.create({
        workflowName: workflowName || `n8n Webhook: ${action}`,
        workflowId: executionId,
        triggerType: "webhook",
        status: "completed",
        payloadSummary: typeof payload === "string" ? payload : JSON.stringify(payload || {}),
        startedAt: new Date(),
        finishedAt: new Date(),
        logs: [{ timestamp: new Date(), message: `Webhook executed action: ${action}`, level: "info" }],
      });

      await ActivityLog.create({
        action: `N8N_WEBHOOK_${(action || "UNKNOWN").toUpperCase()}`,
        performedBy: "n8n-webhook",
        details: { action, workflowName, executionId },
        status: "success",
      });

      res.json({ success: true, data: { received: true, action } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
