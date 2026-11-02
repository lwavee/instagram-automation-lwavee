import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { SchedulerService } from "./services/schedulerService";
import { StorageService } from "./services/storageService";

async function bootstrap() {
  // Ensure local uploads directory exists
  StorageService.ensureUploadDirectory();

  // Connect to MongoDB
  await connectDB();

  const app = createApp();
  const PORT = env.PORT;
  const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

  const server = app.listen(PORT, HOST, () => {
    console.log(`
===========================================================
🚀 LEARN WITH AVEE — BACKEND API SERVICE RUNNING
===========================================================
📡 Server URL: http://${HOST}:${PORT}
🔒 Environment: ${env.NODE_ENV}
⏱️ Timezone: Asia/Kolkata
⚙️ AI Provider: ${env.DEFAULT_AI_PROVIDER} (${env.DEFAULT_AI_MODEL})
===========================================================
    `);
  });

  // Automated background polling for scheduled posts (every 60 seconds)
  const schedulerInterval = setInterval(async () => {
    try {
      await SchedulerService.processDuePosts();
    } catch (schedErr: any) {
      console.warn("Background scheduler cycle error:", schedErr.message);
    }
  }, 60 * 1000);

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("Shutting down Learn With Avee backend service gracefully...");
    clearInterval(schedulerInterval);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrapping error:", err);
  process.exit(1);
});

