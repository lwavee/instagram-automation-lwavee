import { Router, Response, NextFunction } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

// GET /api/settings/notifications
router.get(
  "/notifications",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
      const unreadCount = await Notification.countDocuments({ isRead: false });

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/settings/notifications/mark-read
router.put(
  "/notifications/mark-read",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
      res.json({ success: true, data: { message: "Notifications marked as read." } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/settings/activity-logs
router.get(
  "/activity-logs",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(30);
      res.json({ success: true, data: { logs } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

