import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { hashPassword, verifyPassword, generateToken, authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: { message: "An account with this email already exists." },
        });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || "admin",
      });

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await ActivityLog.create({
        action: "USER_REGISTERED",
        performedBy: user.email,
        entityType: "User",
        entityId: user._id.toString(),
        status: "success",
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: { message: "Invalid email or password credentials." },
        });
        return;
      }

      const isMatch = await verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: { message: "Invalid email or password credentials." },
        });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await ActivityLog.create({
        action: "USER_LOGIN",
        performedBy: user.email,
        entityType: "User",
        entityId: user._id.toString(),
        status: "success",
      });

      res.json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.json({
    success: true,
    data: { message: "Successfully logged out." },
  });
});

// GET /api/auth/me
router.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

// PUT /api/auth/preferences
router.put(
  "/preferences",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { autoPublishEnabled, defaultLanguage, defaultTimezone, targetTopics } = req.body;

      if (typeof autoPublishEnabled === "boolean") {
        user.preferences.autoPublishEnabled = autoPublishEnabled;
      }
      if (defaultLanguage) {
        user.preferences.defaultLanguage = defaultLanguage;
      }
      if (defaultTimezone) {
        user.preferences.defaultTimezone = defaultTimezone;
      }
      if (Array.isArray(targetTopics)) {
        user.preferences.targetTopics = targetTopics;
      }

      await user.save();

      res.json({
        success: true,
        data: { preferences: user.preferences },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

