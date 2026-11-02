import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<typeof mongoose | null> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.warn(`⚠️ Warning: MongoDB connection failed (${error.message}). App running in decoupled state.`);
    return null;
  }
}

mongoose.connection.on("disconnected", () => {
  console.log("ℹ️ MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

