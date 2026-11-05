/**
 * LWAVEE — CLI Script to Publish Due Posts
 *
 * Can be run manually or as a background CLI task:
 * npx ts-node scripts/publish-due-posts.ts
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { connectDB } from "../backend/src/config/db";
import { SchedulerService } from "../backend/src/services/schedulerService";
import mongoose from "mongoose";

async function main() {
  console.log("===========================================================");
  console.log("🚀 LWAVEE — CLI PUBLISH DUE POSTS RUNNER");
  console.log(`⏰ Executed at: ${new Date().toISOString()}`);
  console.log("===========================================================");

  const conn = await connectDB();
  if (!conn || mongoose.connection.readyState !== 1) {
    console.error("❌ Cannot execute script: Database is not connected.");
    process.exit(1);
  }

  try {
    console.log("🔍 Scanning for approved and scheduled posts due for publishing...");
    const stats = await SchedulerService.processDuePosts();
    console.log("✅ Scheduler execution completed with stats:", JSON.stringify(stats, null, 2));
  } catch (err: any) {
    console.error("❌ Error while processing due posts:", err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close(false);
    console.log("👋 Database connection closed. Exiting.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal script error:", err);
  process.exit(1);
});
