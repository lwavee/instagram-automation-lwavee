import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import mongoose from "mongoose";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";

// Route imports
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import researchRoutes from "./routes/research.routes";
import contentIdeasRoutes from "./routes/content-ideas.routes";
import scriptsRoutes from "./routes/scripts.routes";
import mediaRoutes from "./routes/media.routes";
import postsRoutes from "./routes/posts.routes";
import calendarRoutes from "./routes/calendar.routes";
import instagramRoutes from "./routes/instagram.routes";
import analyticsRoutes from "./routes/analytics.routes";
import automationRoutes from "./routes/automation.routes";
import integrationsRoutes from "./routes/integrations.routes";
import settingsRoutes from "./routes/settings.routes";
import webhooksRoutes from "./routes/webhooks.routes";

export function createApp(): Application {
  const app = express();

  // 1. Security HTTP Headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: ["'self'", env.FRONTEND_URL, "https://graph.facebook.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration
  const allowedOrigins = [
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev if needed, or check exact origin
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-n8n-secret", "x-n8n-signature"],
    })
  );

  // 3. Request Parsers
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  // 4. Static media uploads directory
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsDir));

  // 5. Root & Health Check Endpoints
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      brand: "Learn With Avee",
      service: "AI-Powered Instagram Automation Backend API",
      status: "online",
      frontendDashboardUrl: env.FRONTEND_URL,
      healthCheck: "/api/health",
      message: "Backend API is running. To open the interactive SaaS dashboard, go to http://localhost:3000",
    });
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.json({
      status: "ok",
      brand: "Learn With Avee",
      service: "Backend API",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbConnected ? "connected" : "disconnected",
    });
  });

  // 6. Rate Limiting on API routes
  app.use("/api", apiLimiter);

  // 7. Route Mounting
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/research", researchRoutes);
  app.use("/api/content-ideas", contentIdeasRoutes);
  app.use("/api/scripts", scriptsRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/posts", postsRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/instagram", instagramRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/automation", automationRoutes);
  app.use("/api/integrations", integrationsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/webhooks", webhooksRoutes);

  // 8. 404 handler for undefined API routes
  app.use("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { message: "The requested API endpoint was not found." },
    });
  });

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
}

