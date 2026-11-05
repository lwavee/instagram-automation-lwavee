import mongoose from "mongoose";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { SchedulerService } from "./services/schedulerService";
import { StorageService } from "./services/storageService";
import { User } from "./models/User";
import { hashPassword } from "./middleware/auth";

async function bootstrap() {
  // 1. Ensure local uploads directory exists
  StorageService.ensureUploadDirectory();

  // 2. Resolve Host & Port
  // Render and container runtimes inject process.env.PORT and require binding to 0.0.0.0
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : env.PORT;
  const HOST = "0.0.0.0";
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  const displayEnv = isProduction ? "production" : (process.env.NODE_ENV || env.NODE_ENV);

  // 3. Connect to MongoDB (awaited before database-dependent background workers start)
  await connectDB();

  // Seed default admin user if database is fresh and empty
  if (mongoose.connection.readyState === 1) {
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const passwordHash = await hashPassword("password123");
        await User.create({
          name: "Avee Lohar",
          email: "avee@learnwithavee.com",
          passwordHash,
          role: "admin",
          isActive: true,
        });
        console.log("👤 Initialized default admin account: avee@learnwithavee.com (Password: password123)");
      }
    } catch (seedErr: any) {
      console.warn("User seeding warning:", seedErr.message);
    }
  }

  // 4. Create Express app
  const app = createApp();

  // 5. Start HTTP server listening on 0.0.0.0 and PORT
  const server = app.listen(PORT, HOST, () => {
    const isDbConnected = mongoose.connection.readyState === 1;
    console.log(`
===========================================================
🚀 LEARN WITH AVEE — BACKEND API SERVICE RUNNING
===========================================================
📡 Server URL: http://${HOST}:${PORT}
🌐 Public Bind: 0.0.0.0 (Port: ${PORT})
🔒 Environment: ${displayEnv}
⏱️ Timezone: Asia/Kolkata
⚙️ AI Provider: ${env.DEFAULT_AI_PROVIDER} (${env.DEFAULT_AI_MODEL})
💾 MongoDB: ${isDbConnected ? "Connected (Atlas) ✅" : "Disconnected (Decoupled Mode) ⚠️"}
===========================================================
    `);
  });

  // 6. Background scheduler controller:
  // Strictly DO NOT run background scheduler until MongoDB is connected
  let schedulerInterval: NodeJS.Timeout | null = null;

  const startScheduler = () => {
    if (schedulerInterval) return;
    if (mongoose.connection.readyState !== 1) return;

    console.log("⏰ MongoDB connected: Starting background content publishing scheduler.");
    schedulerInterval = setInterval(async () => {
      if (mongoose.connection.readyState !== 1) {
        console.warn("⏸️ MongoDB not connected. Skipping background scheduler cycle.");
        return;
      }
      try {
        await SchedulerService.processDuePosts();
      } catch (schedErr: any) {
        console.warn("Background scheduler cycle error:", schedErr.message);
      }
    }, 60 * 1000);
  };

  const stopScheduler = () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log("⏸️ Background scheduler paused: waiting for MongoDB connection.");
    }
  };

  // Only run scheduler if MongoDB connection is ready
  if (mongoose.connection.readyState === 1) {
    startScheduler();
  } else {
    console.warn("⏳ Background scheduler postponed: waiting for MongoDB connection.");
  }

  // Auto-resume or pause scheduler when MongoDB state changes
  mongoose.connection.on("connected", () => {
    startScheduler();
  });

  mongoose.connection.on("disconnected", () => {
    stopScheduler();
  });

  // 7. Graceful shutdown handling
  const shutdown = () => {
    console.log("Shutting down Learn With Avee backend service gracefully...");
    stopScheduler();
    server.close(() => {
      console.log("HTTP server closed.");
      mongoose.connection
        .close(false)
        .then(() => {
          console.log("MongoDB connection closed.");
          process.exit(0);
        })
        .catch(() => process.exit(0));
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrapping error:", err);
  process.exit(1);
});
