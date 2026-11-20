import mongoose from "mongoose";
import { env } from "./env";
import { MetaOAuthState } from "../models/MetaOAuthState";
import { InstagramAccount } from "../models/InstagramAccount";
import { SocialPost } from "../models/SocialPost";

export function validateMongoUri(uri?: string): { valid: boolean; reason?: string } {
  if (!uri || typeof uri !== "string" || uri.trim() === "") {
    return { valid: false, reason: "MONGODB_URI is not set or empty." };
  }

  const trimmed = uri.trim();
  if (!trimmed.startsWith("mongodb://") && !trimmed.startsWith("mongodb+srv://")) {
    return {
      valid: false,
      reason: "MONGODB_URI must start with either 'mongodb://' or 'mongodb+srv://'.",
    };
  }

  if (trimmed.includes("<db_password>") || trimmed.includes("<password>")) {
    return {
      valid: false,
      reason: "MONGODB_URI contains '<db_password>' or '<password>' placeholder. Please replace it with your MongoDB database user password.",
    };
  }

  if (trimmed.includes("<db_username>") || trimmed.includes("<username>")) {
    return {
      valid: false,
      reason: "MONGODB_URI contains '<db_username>' or '<username>' placeholder. Please replace it with your MongoDB database username.",
    };
  }

  return { valid: true };
}

export async function connectDB(): Promise<typeof mongoose | null> {
  const validation = validateMongoUri(env.MONGODB_URI);
  if (!validation.valid) {
    console.error("===========================================================");
    console.error(`❌ MONGODB CONFIGURATION ERROR`);
    console.error(`   ${validation.reason}`);
    console.error(`   👉 In Render Dashboard -> Environment -> Set MONGODB_URI to your full MongoDB Atlas connection string.`);
    console.error("===========================================================");
    return null;
  }

  try {
    const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      autoIndex: !isProduction,
    });
    if (env.META_APP_ID) {
      await Promise.all([
        MetaOAuthState.createIndexes(),
        InstagramAccount.collection.createIndex({ instagramId: 1 }, { unique: true }),
        SocialPost.collection.createIndex({ status: 1, nextAttemptAt: 1 }),
      ]);
    }

    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    console.error("===========================================================");
    console.error(`❌ MONGODB CONNECTION FAILED`);
    console.error("   MongoDB connection or index initialization failed.");
    if (error.code === 8000 || (error.message && error.message.includes("authentication failed"))) {
      console.error(`   👉 Authentication Failed: Check your username and password in MONGODB_URI.`);
    } else if (error.name === "MongoServerSelectionError") {
      console.error("   Check Atlas reachability and the allowlist for your hosting service's approved egress addresses.");
    } else if (error.message && error.message.includes("querySrv ENOTFOUND")) {
      console.error(`   👉 Hostname Not Found: The cluster address in MONGODB_URI is invalid.`);
    }
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
    console.error("===========================================================");
    return null;
  }
}

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connection established/restored.");
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Database operations paused.");
});

mongoose.connection.on("error", () => {
  console.error("MongoDB connection error.");
});
