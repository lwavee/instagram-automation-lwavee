import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Auto-detect production environment on Render if NODE_ENV was not explicitly passed
if (process.env.RENDER === "true" && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default(process.env.RENDER === "true" ? "production" : "development"),
  PORT: z
    .union([z.string(), z.number()])
    .default("5000")
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10))),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/learn_with_avee"),
  JWT_SECRET: z.string().default("development_jwt_secret_must_be_32_characters_minimum_len"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  APP_ENCRYPTION_KEY: z.string().default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  BACKEND_URL: z.string().default("http://localhost:5000"),
  N8N_BASE_URL: z.string().default("http://localhost:5678"),
  N8N_WEBHOOK_SECRET: z.string().default("dev_webhook_secret_for_n8n_integration"),
  DEFAULT_AI_PROVIDER: z.enum(["gemini", "openai", "openrouter"]).default("gemini"),
  DEFAULT_AI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_CONFIG_ID: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z
    .string()
    .optional()
    .transform((val) => {
      if (val && val.trim() !== "") return val;
      const base = process.env.BACKEND_URL || "http://localhost:5000";
      return `${base.replace(/\/$/, "")}/api/instagram/callback`;
    }),
  MEDIA_STORAGE_PROVIDER: z.enum(["local", "cloudinary", "supabase"]).default("local"),
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:", parsed.error.format());
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
